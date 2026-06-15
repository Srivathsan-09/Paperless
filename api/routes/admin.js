/**
 * Admin Routes
 * 
 * Provides comprehensive admin panel APIs for:
 * - User management
 * - User data exploration
 * - Data export
 * - Analytics
 * 
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const User = require('../models/User');
const Category = require('../models/Category');
const Entry = require('../models/Entry');
const AnalyticsUtils = require('../utils/analyticsUtils');
const ExportUtils = require('../utils/exportUtils');

// ============= USER MANAGEMENT =============

/**
 * GET /api/admin/users
 * Fetch all users with pagination
 */
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (page - 1) * limit;

        // Build search query
        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Fetch users
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await User.countDocuments(query);

        // Enrich users with stats
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            const categoryCount = await Category.countDocuments({ userId: user._id });
            const entryCount = await Entry.countDocuments({ userId: user._id });
            const spendingResult = await Entry.aggregate([
                { $match: { userId: user._id } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                ...user.toObject(),
                categoryCount,
                entryCount,
                totalSpending: spendingResult[0]?.total || 0
            };
        }));

        res.json({
            success: true,
            users: enrichedUsers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

/**
 * GET /api/admin/users/:userId
 * Fetch single user profile with detailed stats
 */
router.get('/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get categories
        const categories = await Category.find({ userId: req.params.userId });
        const categoryCount = categories.length;

        // Get entries
        const entries = await Entry.find({ userId: req.params.userId });
        const entryCount = entries.length;

        // Calculate stats
        const stats = await AnalyticsUtils.getSpendingStats(user._id);
        const monthlyTrend = await AnalyticsUtils.getMonthlyTrend(user._id);
        const categoryDistribution = await AnalyticsUtils.getCategoryDistribution(user._id);
        const topCategories = await AnalyticsUtils.getTopCategories(user._id, 5);

        res.json({
            success: true,
            user: user.toObject(),
            stats: {
                categoryCount,
                entryCount,
                totalSpending: stats.totalSpending,
                averageAmount: stats.averageAmount,
                minAmount: stats.minAmount,
                maxAmount: stats.maxAmount,
                monthlyTrend,
                categoryDistribution,
                topCategories
            }
        });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ success: false, message: 'Error fetching user profile' });
    }
});

// ============= CATEGORY MANAGEMENT =============

/**
 * GET /api/admin/users/:userId/categories
 * Fetch all categories for a user
 */
router.get('/users/:userId/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.params.userId }).sort({ createdAt: -1 });

        // Enrich with entry counts
        const enrichedCategories = await Promise.all(categories.map(async (cat) => {
            const entryCount = await Entry.countDocuments({ categoryId: cat._id });
            const spendingResult = await Entry.aggregate([
                { $match: { categoryId: cat._id } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                ...cat.toObject(),
                entryCount,
                totalSpending: spendingResult[0]?.total || 0
            };
        }));

        res.json({
            success: true,
            categories: enrichedCategories,
            total: enrichedCategories.length
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

// ============= ENTRY MANAGEMENT =============

/**
 * GET /api/admin/users/:userId/entries
 * Fetch entries for a user with filtering and pagination
 */
router.get('/users/:userId/entries', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, categoryId, startDate, endDate, month, year } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        let query = { userId: req.params.userId };

        if (categoryId) {
            query.categoryId = categoryId;
        }

        if (month && year) {
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);
            const startDay = new Date(Date.UTC(yearNum, monthNum - 1, 1));
            const endDay = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
            query.date = { $gte: startDay, $lte: endDay };
        } else if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Fetch entries
        const entries = await Entry.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Enrich with category names
        const enrichedEntries = await Promise.all(entries.map(async (entry) => {
            const category = await Category.findById(entry.categoryId);
            return {
                ...entry.toObject(),
                categoryName: category?.name || 'Unknown'
            };
        }));

        const total = await Entry.countDocuments(query);

        res.json({
            success: true,
            entries: enrichedEntries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching entries:', err);
        res.status(500).json({ success: false, message: 'Error fetching entries' });
    }
});

// ============= ANALYTICS =============

/**
 * GET /api/admin/analytics/:userId
 * Get comprehensive analytics for a user
 */
router.get('/analytics/:userId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const analytics = await AnalyticsUtils.getCompleteDashboard(req.params.userId);

        res.json({
            success: true,
            analytics
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ success: false, message: 'Error fetching analytics' });
    }
});

/**
 * GET /api/admin/analytics/:userId/trends
 * Get monthly spending trends
 */
router.get('/analytics/:userId/trends', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const trends = await AnalyticsUtils.getMonthlyTrend(req.params.userId);

        res.json({
            success: true,
            trends
        });
    } catch (err) {
        console.error('Error fetching trends:', err);
        res.status(500).json({ success: false, message: 'Error fetching trends' });
    }
});

// ============= EXPORT FEATURES =============

/**
 * GET /api/admin/export/:userId/json
 * Export user data as JSON
 */
router.get('/export/:userId/json', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const categories = await Category.find({ userId: req.params.userId });
        const entries = await Entry.find({ userId: req.params.userId });

        // Enrich entries with category names
        const enrichedEntries = await Promise.all(entries.map(async (entry) => {
            const category = await Category.findById(entry.categoryId);
            return {
                ...entry.toObject(),
                categoryName: category?.name || 'Unknown'
            };
        }));

        const stats = await AnalyticsUtils.getSpendingStats(user._id);
        const categoryDistribution = await AnalyticsUtils.getCategoryDistribution(user._id);
        const monthlySpending = await AnalyticsUtils.getMonthlyTrend(user._id);
        const paymentModes = await AnalyticsUtils.getPaymentModeDistribution(user._id);

        const completeData = ExportUtils.generateCompleteExport(
            user,
            categories,
            enrichedEntries,
            {
                totalCategories: categories.length,
                totalEntries: entries.length,
                totalSpending: stats.totalSpending,
                averageAmount: stats.averageAmount,
                categoryDistribution: categoryDistribution.reduce((acc, cat) => {
                    acc[cat.categoryName] = cat.total;
                    return acc;
                }, {}),
                monthlySpending: monthlySpending.reduce((acc, m) => {
                    acc[m.month] = m.total;
                    return acc;
                }, {}),
                paymentModes
            }
        );

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="user_${user._id}_export.json"`);
        res.json(completeData);
    } catch (err) {
        console.error('Error exporting JSON:', err);
        res.status(500).json({ success: false, message: 'Error exporting data' });
    }
});

/**
 * GET /api/admin/export/:userId/csv/entries
 * Export entries as CSV
 */
router.get('/export/:userId/csv/entries', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const entries = await Entry.find({ userId: req.params.userId });

        // Enrich with category names
        const enrichedEntries = await Promise.all(entries.map(async (entry) => {
            const category = await Category.findById(entry.categoryId);
            return {
                ...entry.toObject(),
                categoryName: category?.name || 'Unknown'
            };
        }));

        const csvContent = ExportUtils.generateEntriesCSV(enrichedEntries);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="entries_${req.params.userId}.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('Error exporting CSV:', err);
        res.status(500).json({ success: false, message: 'Error exporting CSV' });
    }
});

/**
 * GET /api/admin/export/:userId/csv/categories
 * Export categories as CSV
 */
router.get('/export/:userId/csv/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.params.userId });

        // Enrich with stats
        const enrichedCategories = await Promise.all(categories.map(async (cat) => {
            const entryCount = await Entry.countDocuments({ categoryId: cat._id });
            const spendingResult = await Entry.aggregate([
                { $match: { categoryId: cat._id } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                ...cat.toObject(),
                entryCount,
                totalSpending: spendingResult[0]?.total || 0
            };
        }));

        const csvContent = ExportUtils.generateCategoriesCSV(enrichedCategories);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="categories_${req.params.userId}.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('Error exporting categories CSV:', err);
        res.status(500).json({ success: false, message: 'Error exporting CSV' });
    }
});

/**
 * GET /api/admin/export/users/csv
 * Export all users as CSV
 */
router.get('/export/users/csv', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        // Enrich with stats
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            const categoryCount = await Category.countDocuments({ userId: user._id });
            const entryCount = await Entry.countDocuments({ userId: user._id });
            const spendingResult = await Entry.aggregate([
                { $match: { userId: user._id } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                ...user.toObject(),
                categoryCount,
                entryCount,
                totalSpending: spendingResult[0]?.total || 0
            };
        }));

        const csvContent = ExportUtils.generateUsersCSV(enrichedUsers);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="all_users.csv"`);
        res.send(csvContent);
    } catch (err) {
        console.error('Error exporting users CSV:', err);
        res.status(500).json({ success: false, message: 'Error exporting CSV' });
    }
});

module.exports = router;
