require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const jwt = require('jsonwebtoken');

describe('Profile API Integration tests', () => {
    let user;
    let validToken;

    beforeAll(async () => {
        await connectDB();
        await User.deleteMany({});
        user = await User.create({
            name: 'Srivathsan',
            email: 'sri@example.com',
            password: 'Password123',
            phone: '9876543210'
        });

        validToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    test('GET /api/user/profile returns authenticated user profile', async () => {
        const res = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.name).toBe('Srivathsan');
        expect(res.body.user.email).toBe('sri@example.com');
        expect(res.body.user.phone).toBe('9876543210');
        expect(res.body.user.authProvider).toBe('Email & Password');
    });

    test('GET /api/profile returns authenticated user profile', async () => {
        const res = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe('sri@example.com');
    });

    test('PUT /api/user/profile updates name and phone number', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                name: 'Srivathsan Updated',
                phone: '+1 555-0199'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.name).toBe('Srivathsan Updated');
        expect(res.body.user.phone).toBe('+1 555-0199');
    });

    test('PUT /api/user/profile accepts valid base64 profile picture', async () => {
        const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                profilePic: fakeBase64
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.profilePic).toBe(fakeBase64);
    });

    test('PUT /api/user/profile rejects empty name', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                name: '   '
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Full name cannot be empty');
    });

    test('PUT /api/user/profile rejects unauthenticated request', async () => {
        const res = await request(app)
            .put('/api/user/profile')
            .send({
                name: 'Hacker Name'
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
});
