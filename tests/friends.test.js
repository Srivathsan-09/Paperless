require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Friend = require('../server/models/Friend');
const FriendTransaction = require('../server/models/FriendTransaction');
const jwt = require('jsonwebtoken');

describe('Friends Feature Integration Tests', () => {
    let userA, userB;
    let tokenA, tokenB;
    let friendRaviId;

    beforeAll(async () => {
        await connectDB();
        await FriendTransaction.deleteMany({});
        await Friend.deleteMany({});
        await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com'] } });

        userA = await User.create({
            name: 'Srivathsan',
            email: 'usera@example.com',
            password: 'Password123'
        });

        userB = await User.create({
            name: 'Friend B',
            email: 'userb@example.com',
            password: 'Password123'
        });

        tokenA = jwt.sign(
            { id: userA._id, email: userA.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        tokenB = jwt.sign(
            { id: userB._id, email: userB.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await FriendTransaction.deleteMany({});
        await Friend.deleteMany({});
        await User.deleteMany({ email: { $in: ['usera@example.com', 'userb@example.com'] } });
        await mongoose.connection.close();
    });

    test('1. Reject unauthenticated access to /api/friends', async () => {
        const res = await request(app).get('/api/friends');
        expect(res.status).toBe(401);
    });

    test('2. User A adds Friend Ravi', async () => {
        const res = await request(app)
            .post('/api/friends')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Ravi Kumar',
                email: 'ravi@example.com',
                phone: '9876543210'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.friend.name).toBe('Ravi Kumar');
        expect(res.body.friend.email).toBe('ravi@example.com');
        expect(res.body.friend.outstandingBalance).toBe(0);

        friendRaviId = res.body.friend._id;
    });

    test('3. Prevent duplicate friend with same email for User A', async () => {
        const res = await request(app)
            .post('/api/friends')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                name: 'Ravi Duplicate',
                email: 'ravi@example.com'
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('4. User A records payment ₹500 for Ravi (Dinner)', async () => {
        const res = await request(app)
            .post(`/api/friends/${friendRaviId}/payment`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                amount: 500,
                description: 'Dinner',
                sendEmail: false
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.transaction.amount).toBe(500);
        expect(res.body.friendBalance.outstandingBalance).toBe(500);
    });

    test('5. User A records another payment ₹300 for Ravi (Movie)', async () => {
        const res = await request(app)
            .post(`/api/friends/${friendRaviId}/payment`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                amount: 300,
                description: 'Movie',
                sendEmail: false
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.friendBalance.outstandingBalance).toBe(800);
    });

    test('6. User A settles ₹500 for Ravi -> remaining outstanding ₹300', async () => {
        const res = await request(app)
            .post(`/api/friends/${friendRaviId}/settle`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                amount: 500
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.friendBalance.outstandingBalance).toBe(300);
    });

    test('7. User A settles remaining ₹300 for Ravi -> outstanding ₹0 (Settled)', async () => {
        const res = await request(app)
            .post(`/api/friends/${friendRaviId}/settle`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                amount: 300
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.friendBalance.outstandingBalance).toBe(0);
    });

    test('8. User B cannot see User A\'s friends (Data Isolation)', async () => {
        const res = await request(app)
            .get('/api/friends')
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.friends.length).toBe(0);
        expect(res.body.totalOutstanding).toBe(0);
    });
});
