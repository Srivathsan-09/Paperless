const mongoose = require('mongoose');

/**
 * Budget Schema for MongoDB
 * Stores monthly budget limits per user
 */
const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    overallBudget: {
        type: Number,
        default: 0,
        min: 0,
    },
    categoryBudgets: [{
        categoryId: {
            type: String,
            default: '',
        },
        categoryName: {
            type: String,
            required: true,
            trim: true,
        },
        limit: {
            type: Number,
            required: true,
            min: 0,
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);
