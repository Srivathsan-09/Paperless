const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const Friend = require('../models/Friend');
const FriendTransaction = require('../models/FriendTransaction');
const User = require('../models/User');
const { sendPaymentNotificationEmail } = require('../utils/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Calculate balance for a friend
 */
async function calculateFriendBalance(userId, friendId) {
    const transactions = await FriendTransaction.find({ userId, friendId });
    let totalPaid = 0;
    let totalSettled = 0;

    transactions.forEach(t => {
        if (t.type === 'payment') {
            totalPaid += t.amount;
        } else if (t.type === 'settlement') {
            totalSettled += t.amount;
        }
    });

    const outstandingBalance = Math.max(0, totalPaid - totalSettled);
    return {
        totalPaid,
        totalSettled,
        outstandingBalance,
    };
}

/**
 * @route   GET /api/friends
 * @desc    Get all friends for authenticated user with balances
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friends = await Friend.find({ userId }).sort({ createdAt: -1 });

        const friendsWithBalances = [];
        let totalOutstanding = 0;

        for (const friend of friends) {
            const balanceInfo = await calculateFriendBalance(userId, friend._id);
            totalOutstanding += balanceInfo.outstandingBalance;

            friendsWithBalances.push({
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                phone: friend.phone || '',
                createdAt: friend.createdAt,
                ...balanceInfo,
            });
        }

        return res.json({
            success: true,
            friends: friendsWithBalances,
            totalOutstanding,
        });
    } catch (err) {
        console.error('GET /api/friends error:', err);
        return res.status(500).json({ success: false, message: 'Server error while fetching friends.' });
    }
});

/**
 * @route   POST /api/friends
 * @desc    Add a new friend
 * @access  Private
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email, phone } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Friend name is required.' });
        }

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'A valid email address is required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check duplicate friend for this user
        const existingFriend = await Friend.findOne({ userId, email: normalizedEmail });
        if (existingFriend) {
            return res.status(400).json({
                success: false,
                message: `You have already added a friend with email ${normalizedEmail}.`,
            });
        }

        const friend = new Friend({
            userId,
            name: name.trim(),
            email: normalizedEmail,
            phone: phone && typeof phone === 'string' ? phone.trim() : '',
        });

        await friend.save();

        return res.json({
            success: true,
            message: 'Friend added successfully.',
            friend: {
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                phone: friend.phone,
                createdAt: friend.createdAt,
                totalPaid: 0,
                totalSettled: 0,
                outstandingBalance: 0,
            },
        });
    } catch (err) {
        console.error('POST /api/friends error:', err);
        return res.status(500).json({ success: false, message: 'Server error while adding friend.' });
    }
});

/**
 * @route   PUT /api/friends/:id
 * @desc    Edit a friend's details
 * @access  Private
 */
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;
        const { name, email, phone } = req.body;

        const friend = await Friend.findOne({ _id: friendId, userId });
        if (!friend) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Friend name cannot be empty.' });
            }
            friend.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
                return res.status(400).json({ success: false, message: 'A valid email address is required.' });
            }
            const normalizedEmail = email.trim().toLowerCase();
            const duplicate = await Friend.findOne({ userId, email: normalizedEmail, _id: { $ne: friendId } });
            if (duplicate) {
                return res.status(400).json({ success: false, message: 'Another friend already uses this email.' });
            }
            friend.email = normalizedEmail;
        }

        if (phone !== undefined) {
            friend.phone = typeof phone === 'string' ? phone.trim() : '';
        }

        await friend.save();

        const balanceInfo = await calculateFriendBalance(userId, friend._id);

        return res.json({
            success: true,
            message: 'Friend details updated successfully.',
            friend: {
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                phone: friend.phone,
                createdAt: friend.createdAt,
                ...balanceInfo,
            },
        });
    } catch (err) {
        console.error('PUT /api/friends/:id error:', err);
        return res.status(500).json({ success: false, message: 'Server error while updating friend.' });
    }
});

/**
 * @route   DELETE /api/friends/:id
 * @desc    Delete a friend and their transactions
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;

        const friend = await Friend.findOneAndDelete({ _id: friendId, userId });
        if (!friend) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        await FriendTransaction.deleteMany({ friendId, userId });

        return res.json({
            success: true,
            message: 'Friend and transaction records removed.',
        });
    } catch (err) {
        console.error('DELETE /api/friends/:id error:', err);
        return res.status(500).json({ success: false, message: 'Server error while deleting friend.' });
    }
});

/**
 * @route   GET /api/friends/:id/transactions
 * @desc    Get friend details, transaction history, and balance
 * @access  Private
 */
router.get('/:id/transactions', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;

        const friend = await Friend.findOne({ _id: friendId, userId });
        if (!friend) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        const transactions = await FriendTransaction.find({ userId, friendId }).sort({ date: -1, createdAt: -1 });

        const balanceInfo = await calculateFriendBalance(userId, friendId);

        return res.json({
            success: true,
            friend: {
                _id: friend._id,
                name: friend.name,
                email: friend.email,
                phone: friend.phone || '',
                createdAt: friend.createdAt,
                ...balanceInfo,
            },
            transactions,
        });
    } catch (err) {
        console.error('GET /api/friends/:id/transactions error:', err);
        return res.status(500).json({ success: false, message: 'Server error while fetching transactions.' });
    }
});

/**
 * @route   POST /api/friends/:id/payment
 * @desc    Record a payment made by authenticated user for friend and optionally send email
 * @access  Private
 */
router.post('/:id/payment', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;
        const { amount, description, date, sendEmail = true } = req.body;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Please enter a valid positive amount.' });
        }

        const friend = await Friend.findOne({ _id: friendId, userId });
        if (!friend) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        const currentUser = await User.findById(userId);

        // 1. Save transaction first
        const transaction = new FriendTransaction({
            userId,
            friendId,
            type: 'payment',
            amount: numAmount,
            description: description && typeof description === 'string' ? description.trim() : '',
            date: date ? new Date(date) : new Date(),
            status: 'pending',
            emailSent: false,
        });

        await transaction.save();

        let emailResult = { success: false, message: 'Email notification disabled by user.' };

        // 2. Send email notification if requested
        if (sendEmail) {
            emailResult = await sendPaymentNotificationEmail({
                toEmail: friend.email,
                friendName: friend.name,
                payerName: currentUser ? currentUser.name : 'Your Friend',
                amount: numAmount,
                description: transaction.description,
                date: transaction.date,
            });

            if (emailResult.success) {
                transaction.emailSent = true;
                await transaction.save();
            }
        }

        const updatedBalance = await calculateFriendBalance(userId, friendId);

        if (sendEmail && !emailResult.success) {
            return res.json({
                success: true,
                message: 'Payment recorded, but the email notification could not be sent.',
                emailSent: false,
                emailError: emailResult.message,
                transaction,
                friendBalance: updatedBalance,
            });
        }

        return res.json({
            success: true,
            message: sendEmail ? 'Payment recorded and email notification sent.' : 'Payment recorded successfully.',
            emailSent: transaction.emailSent,
            transaction,
            friendBalance: updatedBalance,
        });
    } catch (err) {
        console.error('POST /api/friends/:id/payment error:', err);
        return res.status(500).json({ success: false, message: 'Server error while recording payment.' });
    }
});

/**
 * @route   POST /api/friends/:id/settle
 * @desc    Record a settlement payment from friend
 * @access  Private
 */
router.post('/:id/settle', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendId = req.params.id;
        const { amount, date } = req.body;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Please enter a valid settlement amount.' });
        }

        const friend = await Friend.findOne({ _id: friendId, userId });
        if (!friend) {
            return res.status(404).json({ success: false, message: 'Friend not found.' });
        }

        const transaction = new FriendTransaction({
            userId,
            friendId,
            type: 'settlement',
            amount: numAmount,
            description: 'Settlement',
            date: date ? new Date(date) : new Date(),
            status: 'settled',
            emailSent: false,
        });

        await transaction.save();

        const updatedBalance = await calculateFriendBalance(userId, friendId);

        return res.json({
            success: true,
            message: 'Settlement recorded successfully.',
            transaction,
            friendBalance: updatedBalance,
        });
    } catch (err) {
        console.error('POST /api/friends/:id/settle error:', err);
        return res.status(500).json({ success: false, message: 'Server error while recording settlement.' });
    }
});

module.exports = router;
