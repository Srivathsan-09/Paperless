require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');

describe('Authentication API tests', () => {
    beforeAll(async () => {
        await connectDB();
    });

    beforeEach(async () => {
        // Clean up users collection before each test to ensure isolation
        await User.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /auth/signup', () => {
        test('Successful registration', async () => {
            const res = await request(app)
                .post('/auth/signup')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'Password123'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toEqual({
                id: expect.any(String),
                name: 'John Doe',
                email: 'john@example.com'
            });
        });

        test('Duplicate email should fail registration', async () => {
            // Create user first
            await User.create({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123'
            });

            const res = await request(app)
                .post('/auth/signup')
                .send({
                    firstName: 'Jane',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    password: 'Password123'
                });
            
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('User already exists. Please login instead.');
        });

        test('Missing required fields should fail with server error (500)', async () => {
            const res = await request(app)
                .post('/auth/signup')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    // missing email
                    password: 'Password123'
                });

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Server error during signup');
        });
    });

    describe('POST /auth/login', () => {
        test('Successful login', async () => {
            // Register a user first
            const user = new User({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123'
            });
            await user.save();

            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'Password123'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toEqual({
                id: user._id.toString(),
                name: 'John Doe',
                email: 'john@example.com'
            });
        });

        test('Wrong password should return 401', async () => {
            const user = new User({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'Password123'
            });
            await user.save();

            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'WrongPassword'
                });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        test('User not found should return 404', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123'
                });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Account not found. Please sign up first.');
        });

        test('Missing credentials or invalid body should return error status (401 or 404)', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({
                    email: 'john@example.com'
                    // missing password
                });

            expect([401, 404]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });
    });
});
