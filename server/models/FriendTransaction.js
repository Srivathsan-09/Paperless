const mongoose = require('mongoose');

const friendTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friend',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['payment', 'settlement'],
        default: 'payment',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'settled'],
        default: 'pending',
    },
    emailSent: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
});

friendTransactionSchema.index({ userId: 1, friendId: 1, createdAt: -1 });

module.exports = mongoose.model('FriendTransaction', friendTransactionSchema);
