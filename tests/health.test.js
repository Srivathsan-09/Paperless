require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');

describe('Health & Smoke Tests', () => {
    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Application should load successfully and Express app should exist', () => {
        expect(app).toBeDefined();
    });

    test('Unknown routes should return 404 and handle gracefully without crashing', async () => {
        const res = await request(app).get('/api/some-nonexistent-route-999');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            success: false,
            message: 'Route not found'
        });
    });
});
