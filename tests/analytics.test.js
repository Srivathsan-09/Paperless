require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Category = require('../server/models/Category');
const Entry = require('../server/models/Entry');
const AnalyticsUtils = require('../server/utils/analyticsUtils');
const jwt = require('jsonwebtoken');

describe('Analytics API and Utility tests', () => {
    let adminUser;
    let regularUser;
    let adminToken;
    let regularToken;
    let foodCategory;
    let billsCategory;

    beforeAll(async () => {
        await connectDB();
        await User.deleteMany({});
        await Category.deleteMany({});
        await Entry.deleteMany({});

        // Create admin user
        adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'Password123',
            isAdmin: true
        });

        // Create regular user
        regularUser = await User.create({
            name: 'Regular User',
            email: 'regular@example.com',
            password: 'Password123',
            isAdmin: false
        });

        adminToken = jwt.sign({ id: adminUser._id, email: adminUser.email }, process.env.JWT_SECRET);
        regularToken = jwt.sign({ id: regularUser._id, email: regularUser.email }, process.env.JWT_SECRET);

        foodCategory = await Category.create({
            userId: regularUser._id,
            name: 'Food',
            type: 'general'
        });

        billsCategory = await Category.create({
            userId: regularUser._id,
            name: 'Bills',
            type: 'general'
        });
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Category.deleteMany({});
        await Entry.deleteMany({});
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Entry.deleteMany({});
    });

    describe('Analytics Calculations (Direct Utilities)', () => {
        test('Empty database response should return zero/empty stats gracefully', async () => {
            const stats = await AnalyticsUtils.getSpendingStats(regularUser._id);
            expect(stats.totalSpending).toBe(0);
            expect(stats.entryCount).toBe(0);
            expect(stats.averageAmount).toBe(0);

            const trend = await AnalyticsUtils.getMonthlyTrend(regularUser._id);
            expect(trend).toEqual([]);

            const distribution = await AnalyticsUtils.getCategoryDistribution(regularUser._id);
            expect(distribution).toEqual([]);
        });

        test('Correct monthly calculations and category totals', async () => {
            // Seed entries
            await Entry.create([
                {
                    userId: regularUser._id,
                    categoryId: foodCategory._id,
                    amount: 50,
                    date: new Date('2026-01-10T12:00:00Z'),
                    itemName: 'Groceries'
                },
                {
                    userId: regularUser._id,
                    categoryId: foodCategory._id,
                    amount: 150,
                    date: new Date('2026-01-15T12:00:00Z'),
                    itemName: 'Dinner'
                },
                {
                    userId: regularUser._id,
                    categoryId: billsCategory._id,
                    amount: 300,
                    date: new Date('2026-02-20T12:00:00Z'),
                    itemName: 'Electricity'
                }
            ]);

            const stats = await AnalyticsUtils.getSpendingStats(regularUser._id);
            expect(stats.totalSpending).toBe(500);
            expect(stats.entryCount).toBe(3);
            expect(stats.averageAmount).toBe(166.66666666666666);
            expect(stats.minAmount).toBe(50);
            expect(stats.maxAmount).toBe(300);

            const trend = await AnalyticsUtils.getMonthlyTrend(regularUser._id);
            expect(trend.length).toBe(2);
            expect(trend[0]).toEqual({
                month: '2026-01',
                total: 200,
                entryCount: 2
            });
            expect(trend[1]).toEqual({
                month: '2026-02',
                total: 300,
                entryCount: 1
            });

            const distribution = await AnalyticsUtils.getCategoryDistribution(regularUser._id);
            expect(distribution.length).toBe(2);
            // Bills is first since it has total 300
            expect(distribution[0].categoryName).toBe('Bills');
            expect(distribution[0].total).toBe(300);
            expect(distribution[0].percentage).toBe('60.00');

            expect(distribution[1].categoryName).toBe('Food');
            expect(distribution[1].total).toBe(200);
            expect(distribution[1].percentage).toBe('40.00');
        });
    });

    describe('Analytics API endpoints', () => {
        test('GET /api/admin/analytics/:userId should return complete dashboard data if admin', async () => {
            const res = await request(app)
                .get(`/api/admin/analytics/${regularUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.analytics).toHaveProperty('spendingStats');
            expect(res.body.analytics).toHaveProperty('monthlyTrend');
            expect(res.body.analytics).toHaveProperty('categoryDistribution');
        });

        test('GET /api/admin/analytics/:userId should deny access (403) for non-admin users', async () => {
            const res = await request(app)
                .get(`/api/admin/analytics/${regularUser._id}`)
                .set('Authorization', `Bearer ${regularToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toBe('Admin access required');
        });

        test('GET /api/admin/analytics/invalid-id should handle invalid request', async () => {
            const res = await request(app)
                .get('/api/admin/analytics/invalid-user-id')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid user ID');
        });
    });
});
