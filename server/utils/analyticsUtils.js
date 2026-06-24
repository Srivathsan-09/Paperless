/**
 * Analytics Utilities
 * 
 * Provides complex MongoDB aggregation pipelines for analytics.
 * Optimized for performance with large datasets.
 */

const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const Category = require('../models/Category');

/**
 * Safely convert a value to mongoose ObjectId.
 * Returns the ObjectId if valid, or null if invalid.
 */
function toObjectId(id) {
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (e) {
        return null;
    }
}

const AnalyticsUtils = {
    /**
     * Calculate monthly spending trend for a user
     * Returns: Array of {month, total, entryCount}
     */
    getMonthlyTrend: async (userId) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return [];

            const result = await Entry.aggregate([
                {
                    $match: { userId: uid }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 }
                },
                {
                    $project: {
                        _id: 0,
                        month: { $dateToString: { format: '%Y-%m', date: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 } } } },
                        total: 1,
                        entryCount: '$count'
                    }
                }
            ]);
            return result;
        } catch (err) {
            console.error('Error calculating monthly trend:', err);
            return [];
        }
    },

    /**
     * Get category-wise spending distribution
     * Returns: Array of {categoryName, total, entryCount, percentage}
     */
    getCategoryDistribution: async (userId) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return [];

            const result = await Entry.aggregate([
                {
                    $match: { userId: uid }
                },
                {
                    $group: {
                        _id: '$categoryId',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                {
                    $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true }
                },
                {
                    $sort: { total: -1 }
                }
            ]);

            // Calculate total for percentages
            const grandTotal = result.reduce((sum, r) => sum + r.total, 0);

            return result.map(r => ({
                categoryId: r._id,
                categoryName: r.categoryInfo?.name || 'Unknown',
                total: r.total,
                entryCount: r.count,
                percentage: grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(2) : 0
            }));
        } catch (err) {
            console.error('Error calculating category distribution:', err);
            return [];
        }
    },

    /**
     * Get spending statistics for a user
     * Returns: {totalSpending, entryCount, averageAmount, minAmount, maxAmount}
     */
    getSpendingStats: async (userId) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return { totalSpending: 0, entryCount: 0, averageAmount: 0, minAmount: 0, maxAmount: 0 };

            const result = await Entry.aggregate([
                {
                    $match: { userId: uid }
                },
                {
                    $group: {
                        _id: null,
                        totalSpending: { $sum: '$amount' },
                        entryCount: { $sum: 1 },
                        averageAmount: { $avg: '$amount' },
                        minAmount: { $min: '$amount' },
                        maxAmount: { $max: '$amount' }
                    }
                }
            ]);

            return result[0] || {
                totalSpending: 0,
                entryCount: 0,
                averageAmount: 0,
                minAmount: 0,
                maxAmount: 0
            };
        } catch (err) {
            console.error('Error calculating spending stats:', err);
            return {
                totalSpending: 0,
                entryCount: 0,
                averageAmount: 0,
                minAmount: 0,
                maxAmount: 0
            };
        }
    },

    /**
     * Get top spending categories
     * Returns: Array of {categoryName, total, percentage, rank}
     */
    getTopCategories: async (userId, limit = 10) => {
        try {
            const distribution = await AnalyticsUtils.getCategoryDistribution(userId);
            return distribution.slice(0, limit).map((cat, idx) => ({
                ...cat,
                rank: idx + 1
            }));
        } catch (err) {
            console.error('Error calculating top categories:', err);
            return [];
        }
    },

    /**
     * Get payment mode distribution
     * Returns: Object with payment modes and their totals
     */
    getPaymentModeDistribution: async (userId) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return {};

            const result = await Entry.aggregate([
                {
                    $match: { userId: uid }
                },
                {
                    $group: {
                        _id: '$paymentMode',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { total: -1 }
                }
            ]);

            const distribution = {};
            result.forEach(r => {
                distribution[r._id || 'Cash'] = {
                    total: r.total,
                    count: r.count
                };
            });

            return distribution;
        } catch (err) {
            console.error('Error calculating payment mode distribution:', err);
            return {};
        }
    },

    /**
     * Get date range statistics
     * Returns: Stats for entries within a date range
     */
    getDateRangeStats: async (userId, startDate, endDate) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return { totalSpending: 0, entryCount: 0, averageAmount: 0 };

            const stats = await Entry.aggregate([
                {
                    $match: {
                        userId: uid,
                        date: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSpending: { $sum: '$amount' },
                        entryCount: { $sum: 1 },
                        averageAmount: { $avg: '$amount' }
                    }
                }
            ]);

            return stats[0] || {
                totalSpending: 0,
                entryCount: 0,
                averageAmount: 0
            };
        } catch (err) {
            console.error('Error calculating date range stats:', err);
            return {
                totalSpending: 0,
                entryCount: 0,
                averageAmount: 0
            };
        }
    },

    /**
     * Get most used categories
     * Returns: Array of {categoryName, count, percentage}
     */
    getMostUsedCategories: async (userId, limit = 10) => {
        try {
            const uid = toObjectId(userId);
            if (!uid) return [];

            const result = await Entry.aggregate([
                {
                    $match: { userId: uid }
                },
                {
                    $group: {
                        _id: '$categoryId',
                        count: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                {
                    $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true }
                },
                {
                    $sort: { count: -1 }
                },
                {
                    $limit: limit
                }
            ]);

            const totalCount = result.reduce((sum, r) => sum + r.count, 0);

            return result.map(r => ({
                categoryName: r.categoryInfo?.name || 'Unknown',
                count: r.count,
                percentage: totalCount > 0 ? ((r.count / totalCount) * 100).toFixed(2) : 0
            }));
        } catch (err) {
            console.error('Error calculating most used categories:', err);
            return [];
        }
    },

    /**
     * Get complete analytics dashboard for a user
     * Returns: Comprehensive analytics object
     */
    getCompleteDashboard: async (userId) => {
        try {
            const [
                spendingStats,
                monthlyTrend,
                categoryDistribution,
                topCategories,
                paymentModes,
                mostUsed
            ] = await Promise.all([
                AnalyticsUtils.getSpendingStats(userId),
                AnalyticsUtils.getMonthlyTrend(userId),
                AnalyticsUtils.getCategoryDistribution(userId),
                AnalyticsUtils.getTopCategories(userId, 5),
                AnalyticsUtils.getPaymentModeDistribution(userId),
                AnalyticsUtils.getMostUsedCategories(userId, 5)
            ]);

            return {
                spendingStats,
                monthlyTrend,
                categoryDistribution,
                topCategories,
                paymentModes,
                mostUsed
            };
        } catch (err) {
            console.error('Error getting complete dashboard:', err);
            return {
                spendingStats: {},
                monthlyTrend: [],
                categoryDistribution: [],
                topCategories: [],
                paymentModes: {},
                mostUsed: []
            };
        }
    }
};

module.exports = AnalyticsUtils;
