const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        default: '',
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
});

// Index to find friends of a user quickly and prevent duplicate email per user
friendSchema.index({ userId: 1, email: 1 });
friendSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Friend', friendSchema);
