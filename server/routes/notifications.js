const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const NotificationPreference = require('../models/NotificationPreference');
const Notification = require('../models/Notification');
const Budget = require('../models/Budget');
const Entry = require('../models/Entry');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Helper function to evaluate real user spending and generate notifications
 */
async function evaluateUserNotifications(userId, month, year) {
    // 1. Get or create preferences
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) {
        prefs = await NotificationPreference.create({ userId });
    }

    const thresholdPct = prefs.alertThreshold || 75;

    // 2. Fetch User Budget
    const budgetDoc = await Budget.findOne({ userId });
    const overallBudget = budgetDoc ? (budgetDoc.overallBudget || 0) : 0;
    const categoryBudgets = budgetDoc ? (budgetDoc.categoryBudgets || []) : [];

    // 3. Query Entries for the target month & year
    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const entries = await Entry.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
    });

    const totalMonthSpent = entries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // 4. Evaluate Overall Budget Alert
    if (prefs.budgetAlerts && overallBudget > 0) {
        const thresholdAmount = overallBudget * (thresholdPct / 100);
        if (totalMonthSpent >= thresholdAmount) {
            const existing = await Notification.findOne({
                userId,
                type: 'budget',
                month,
                year,
                threshold: thresholdPct
            });

            if (!existing) {
                const usedPct = Math.round((totalMonthSpent / overallBudget) * 100);
                await Notification.create({
                    userId,
                    type: 'budget',
                    title: 'Budget Alert',
                    message: `You've used ${usedPct}% of your monthly spending budget.`,
                    month,
                    year,
                    threshold: thresholdPct
                });
            }
        }
    }

    // 5. Evaluate Category Budget Alerts
    if (prefs.categoryAlerts && categoryBudgets.length > 0) {
        for (const cat of categoryBudgets) {
            const catLimit = Number(cat.limit) || 0;
            if (catLimit <= 0) continue;

            const catIdStr = String(cat.categoryId || '');
            const catNameStr = String(cat.categoryName || '').trim();

            const catSpent = entries.reduce((sum, item) => {
                const itemCatId = String(item.categoryId || '');
                if (itemCatId && catIdStr && itemCatId === catIdStr) {
                    return sum + (Number(item.amount) || 0);
                }
                return sum;
            }, 0);

            const catThresholdAmount = catLimit * (thresholdPct / 100);

            if (catSpent >= catThresholdAmount) {
                const dedupeKey = catIdStr || catNameStr;
                const existingCatNote = await Notification.findOne({
                    userId,
                    type: 'category',
                    month,
                    year,
                    categoryId: dedupeKey,
                    threshold: thresholdPct
                });

                if (!existingCatNote) {
                    const catUsedPct = Math.round((catSpent / catLimit) * 100);
                    await Notification.create({
                        userId,
                        type: 'category',
                        title: 'Category Budget Alert',
                        message: `Your ${catNameStr || 'Category'} spending has reached ${catUsedPct}% of its monthly limit.`,
                        month,
                        year,
                        categoryId: dedupeKey,
                        threshold: thresholdPct
                    });
                }
            }
        }
    }

    // 6. Evaluate Monthly Spending Summary Notification
    if (prefs.monthlySummary && totalMonthSpent > 0) {
        const existingSummary = await Notification.findOne({
            userId,
            type: 'summary',
            month,
            year
        });

        if (!existingSummary) {
            const mName = MONTH_NAMES[month] || 'Monthly';
            await Notification.create({
                userId,
                type: 'summary',
                title: 'Monthly Summary',
                message: `Your ${mName} spending summary is ready.`,
                month,
                year
            });
        }
    }

    // 7. Evaluate Unusual Spending Alert
    if (prefs.unusualSpending) {
        const existingUnusual = await Notification.findOne({
            userId,
            type: 'unusual',
            month,
            year
        });

        if (!existingUnusual) {
            // Calculate past 3 months average spending
            const prevStart = new Date(year, month - 3, 1);
            const prevEnd = new Date(year, month, 0, 23, 59, 59);

            const prevEntries = await Entry.find({
                userId,
                date: { $gte: prevStart, $lte: prevEnd }
            });

            if (prevEntries.length > 0) {
                const prevTotal = prevEntries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                const prevMonthlyAvg = prevTotal / 3;

                if (prevMonthlyAvg > 0 && totalMonthSpent >= (prevMonthlyAvg * 1.4) && totalMonthSpent > 3000) {
                    const mName = MONTH_NAMES[month] || 'current month';
                    await Notification.create({
                        userId,
                        type: 'unusual',
                        title: 'Unusual Spending Alert',
                        message: `Your spending for ${mName} is significantly higher than your typical monthly average.`,
                        month,
                        year
                    });
                }
            }
        }
    }

    return prefs;
}

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences for authenticated user
 * @access  Private
 */
router.get('/preferences', verifyToken, async (req, res) => {
    try {
        let prefs = await NotificationPreference.findOne({ userId: req.userId });
        if (!prefs) {
            prefs = await NotificationPreference.create({ userId: req.userId });
        }
        res.json({
            success: true,
            preferences: {
                budgetAlerts: prefs.budgetAlerts,
                categoryAlerts: prefs.categoryAlerts,
                monthlySummary: prefs.monthlySummary,
                unusualSpending: prefs.unusualSpending,
                alertThreshold: prefs.alertThreshold
            }
        });
    } catch (err) {
        console.error('Get notification preferences error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching notification preferences' });
    }
});

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences for authenticated user
 * @access  Private
 */
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const { budgetAlerts, categoryAlerts, monthlySummary, unusualSpending, alertThreshold } = req.body;

        const updateData = {};
        if (typeof budgetAlerts === 'boolean') updateData.budgetAlerts = budgetAlerts;
        if (typeof categoryAlerts === 'boolean') updateData.categoryAlerts = categoryAlerts;
        if (typeof monthlySummary === 'boolean') updateData.monthlySummary = monthlySummary;
        if (typeof unusualSpending === 'boolean') updateData.unusualSpending = unusualSpending;
        if ([50, 75, 90, 100].includes(Number(alertThreshold))) {
            updateData.alertThreshold = Number(alertThreshold);
        }

        const prefs = await NotificationPreference.findOneAndUpdate(
            { userId: req.userId },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Notification preferences updated.',
            preferences: {
                budgetAlerts: prefs.budgetAlerts,
                categoryAlerts: prefs.categoryAlerts,
                monthlySummary: prefs.monthlySummary,
                unusualSpending: prefs.unusualSpending,
                alertThreshold: prefs.alertThreshold
            }
        });
    } catch (err) {
        console.error('Update notification preferences error:', err);
        res.status(500).json({ success: false, message: 'Server error updating notification preferences' });
    }
});

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications (and dynamically check real spending alerts)
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const month = req.query.month !== undefined ? Number(req.query.month) : now.getMonth();
        const year = req.query.year !== undefined ? Number(req.query.year) : now.getFullYear();

        // 1. Evaluate real spending rules and auto-generate notifications if triggered
        const prefs = await evaluateUserNotifications(req.userId, month, year);

        // 2. Fetch notifications for user
        const notifications = await Notification.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ userId: req.userId, isRead: false });

        res.json({
            success: true,
            notifications,
            unreadCount,
            preferences: {
                budgetAlerts: prefs.budgetAlerts,
                categoryAlerts: prefs.categoryAlerts,
                monthlySummary: prefs.monthlySummary,
                unusualSpending: prefs.unusualSpending,
                alertThreshold: prefs.alertThreshold
            }
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching notifications' });
    }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }

        res.json({ success: true, notification });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ success: false, message: 'Server error updating notification status' });
    }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all user notifications as read
 * @access  Private
 */
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ success: false, message: 'Server error marking notifications as read' });
    }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification for authenticated user
 * @access  Private
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }
        res.json({ success: true, message: 'Notification removed.' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ success: false, message: 'Server error deleting notification' });
    }
});

module.exports = router;
