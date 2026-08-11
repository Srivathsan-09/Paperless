const mongoose = require('mongoose');

/**
 * Notification Schema for MongoDB
 * Stores per-user alert notifications with deduplication support
 */
const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['budget', 'category', 'summary', 'unusual'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    month: {
        type: Number,
        required: true, // 0-11
    },
    year: {
        type: Number,
        required: true,
    },
    categoryId: {
        type: String,
        default: '',
    },
    threshold: {
        type: Number,
        default: 75,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
}, { timestamps: true });

// Compound index to ensure deduplication per user, type, month, year, category, and threshold
notificationSchema.index({ userId: 1, type: 1, month: 1, year: 1, categoryId: 1, threshold: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
