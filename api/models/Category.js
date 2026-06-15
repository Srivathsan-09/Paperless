const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true, // Index for fast user-specific queries
    },
    parentCategory: {
        type: String,
        default: null,
        index: true, // Index for filtering by parent
    },
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['milk', 'general'],
        default: 'general',
    },
    isParent: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true, // Index for sorting
    }
});

// Compound index for faster user-category queries
categorySchema.index({ userId: 1, parentCategory: 1 });
categorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Category', categorySchema);
