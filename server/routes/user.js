const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const User = require('../models/User');

/**
 * Format user profile response payload safely without sensitive fields
 */
const formatUserProfile = (user) => {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        profilePic: user.profilePic || '',
        isAdmin: !!user.isAdmin,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        authProvider: user.googleId ? 'Google' : 'Email & Password',
    };
};

/**
 * @route   GET /api/user/profile or /api/profile
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
const getProfileHandler = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found' });
        }
        return res.json({
            success: true,
            user: formatUserProfile(user),
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error while fetching profile' });
    }
};

/**
 * @route   PUT /api/user/profile or /api/profile
 * @desc    Update currently authenticated user profile
 * @access  Private
 */
const updateProfileHandler = async (req, res) => {
    try {
        const { name, phone, profilePic } = req.body;

        const updateFields = {};

        // Name validation
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
            }
            if (name.trim().length > 100) {
                return res.status(400).json({ success: false, message: 'Full name exceeds 100 characters.' });
            }
            updateFields.name = name.trim();
        }

        // Phone validation
        if (phone !== undefined) {
            if (typeof phone !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid phone format.' });
            }
            const trimmedPhone = phone.trim();
            if (trimmedPhone.length > 25) {
                return res.status(400).json({ success: false, message: 'Phone number exceeds 25 characters.' });
            }
            // Basic phone format validation (optional numbers, spaces, plus, dashes, parens)
            if (trimmedPhone && !/^[+\d\s()-]{5,25}$/.test(trimmedPhone)) {
                return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
            }
            updateFields.phone = trimmedPhone;
        }

        // Profile picture validation
        if (profilePic !== undefined) {
            if (typeof profilePic !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid profile picture format.' });
            }
            const trimmedPic = profilePic.trim();
            // Validate base64 image size limit (~5MB base64 string ~7MB length)
            if (trimmedPic.startsWith('data:image/')) {
                if (trimmedPic.length > 7 * 1024 * 1024) {
                    return res.status(400).json({ success: false, message: 'Profile picture size must be under 5MB.' });
                }
                // Check allowed image MIME types
                if (!/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmedPic)) {
                    return res.status(400).json({ success: false, message: 'Invalid image type. Allowed: JPG, PNG, WEBP, GIF, SVG.' });
                }
            } else if (trimmedPic && !/^https?:\/\//i.test(trimmedPic)) {
                return res.status(400).json({ success: false, message: 'Profile picture must be a valid image upload or HTTP URL.' });
            }
            updateFields.profilePic = trimmedPic;
        }

        // Ensure logged-in user only updates their own profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: formatUserProfile(updatedUser),
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error while updating profile' });
    }
};

// Route definitions for both / and /profile (sub-route flexibility)
router.get('/profile', verifyToken, getProfileHandler);
router.put('/profile', verifyToken, updateProfileHandler);
router.get('/', verifyToken, getProfileHandler);
router.put('/', verifyToken, updateProfileHandler);

module.exports = router;
