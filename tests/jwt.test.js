require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const jwt = require('jsonwebtoken');

describe('JWT Middleware Integration tests', () => {
    let user;
    let validToken;
    let expiredToken;

    beforeAll(async () => {
        await connectDB();
        await User.deleteMany({});
        user = await User.create({
            name: 'JWT Test User',
            email: 'jwt@example.com',
            password: 'Password123'
        });

        validToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        expiredToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '-1s' } // Expired token
        );
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    test('Valid JWT token should be accepted', async () => {
        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe('jwt@example.com');
    });

    test('Missing Authorization header should return 401', async () => {
        const res = await request(app)
            .get('/api/user/profile');

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('No token provided. Please log in.');
    });

    test('Malformed token (no Bearer prefix) should return 401', async () => {
        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `notbearer ${validToken}`);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('No token provided. Please log in.');
    });

    test('Invalid JWT signature should return 401', async () => {
        const invalidToken = jwt.sign(
            { id: user._id, email: user.email },
            'wrong_secret_key'
        );

        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${invalidToken}`);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid token. Please log in again.');
    });

    test('Expired JWT token should return 401', async () => {
        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Token has expired. Please log in again.');
    });

    test('Token with non-existent user ID should return 401', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const fakeToken = jwt.sign(
            { id: nonExistentId, email: 'fake@example.com' },
            process.env.JWT_SECRET
        );

        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${fakeToken}`);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('User not found. Token may be invalid.');
    });
});
