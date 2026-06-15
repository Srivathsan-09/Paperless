const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true, // Index for user-specific queries
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true, // Index for category-specific queries
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        index: true, // Index for date-range queries
    },
    itemName: {
        type: String,
        required: true,
    },
    notes: {
        type: String,
    },
    // Milk/Generic specific
    quantity: {
        type: Number
    },
    pricePerLitre: {
        type: Number
    },
    morningLitres: {
        type: Number
    },
    nightLitres: {
        type: Number
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    paymentMode: {
        type: String,
        default: 'Cash'
    }
}, { timestamps: true });

// Compound indexes for efficient queries
entrySchema.index({ userId: 1, date: -1 });
entrySchema.index({ userId: 1, categoryId: 1, date: -1 });
entrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Entry', entrySchema);
