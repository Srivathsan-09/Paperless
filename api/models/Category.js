const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentCategory: {
        type: String,
        default: null,
        // Only 'Miscellaneous' and 'Savings' for most categories, null for top-level categories
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['milk', 'general'],
        default: 'general'
    },
    isParent: {
        type: Boolean,
        default: false,
        // true for Miscellaneous and Savings only
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Category', categorySchema);
