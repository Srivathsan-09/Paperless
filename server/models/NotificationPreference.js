const mongoose = require('mongoose');

/**
 * NotificationPreference Schema for MongoDB
 * Stores per-user notification toggle states and alert thresholds
 */
const notificationPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    budgetAlerts: {
        type: Boolean,
        default: true,
    },
    categoryAlerts: {
        type: Boolean,
        default: true,
    },
    monthlySummary: {
        type: Boolean,
        default: true,
    },
    unusualSpending: {
        type: Boolean,
        default: true,
    },
    alertThreshold: {
        type: Number,
        default: 75,
        enum: [50, 75, 90, 100],
    }
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
