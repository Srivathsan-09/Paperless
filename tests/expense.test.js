require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Category = require('../server/models/Category');
const Entry = require('../server/models/Entry');
const jwt = require('jsonwebtoken');

describe('Expense (Entry) API CRUD tests', () => {
    let user;
    let otherUser;
    let token;
    let otherToken;
    let category;
    let otherCategory;

    beforeAll(async () => {
        await connectDB();
        await User.deleteMany({});
        await Category.deleteMany({});
        await Entry.deleteMany({});

        // Create test users
        user = await User.create({
            name: 'Expense User',
            email: 'expense@example.com',
            password: 'Password123'
        });

        otherUser = await User.create({
            name: 'Other User',
            email: 'other@example.com',
            password: 'Password123'
        });

        token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
        otherToken = jwt.sign({ id: otherUser._id, email: otherUser.email }, process.env.JWT_SECRET);

        // Create categories
        category = await Category.create({
            userId: user._id,
            name: 'Food',
            type: 'general'
        });

        otherCategory = await Category.create({
            userId: otherUser._id,
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

    describe('POST /api/entries (Create Expense)', () => {
        test('Should create a valid expense', async () => {
            const res = await request(app)
                .post('/api/entries')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    categoryId: category._id.toString(),
                    amount: 150,
                    date: '2026-07-13',
                    itemName: 'Lunch'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.amount).toBe(150);
            expect(res.body.itemName).toBe('Lunch');
            expect(res.body.categoryId).toBe(category._id.toString());
            expect(res.body.userId).toBe(user._id.toString());
        });

        test('Should fail if amount is missing', async () => {
            const res = await request(app)
                .post('/api/entries')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    categoryId: category._id.toString(),
                    date: '2026-07-13',
                    itemName: 'Lunch'
                });

            expect(res.status).toBe(500); // Caught in route catch block
        });

        test('Should fail if category is missing', async () => {
            const res = await request(app)
                .post('/api/entries')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 150,
                    date: '2026-07-13',
                    itemName: 'Lunch'
                });

            expect(res.status).toBe(500);
        });

        test('Should fail with invalid data type', async () => {
            const res = await request(app)
                .post('/api/entries')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    categoryId: category._id.toString(),
                    amount: 'not-a-number',
                    date: '2026-07-13',
                    itemName: 'Lunch'
                });

            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/entries (Read Expenses)', () => {
        test('User receives only their own expenses', async () => {
            // Create expense for user
            const entry1 = await Entry.create({
                userId: user._id,
                categoryId: category._id,
                amount: 100,
                date: new Date('2026-07-01'),
                itemName: 'Item 1'
            });

            // Create expense for other user
            await Entry.create({
                userId: otherUser._id,
                categoryId: otherCategory._id,
                amount: 200,
                date: new Date('2026-07-02'),
                itemName: 'Item 2'
            });

            // Fetch expenses for user (passing month filter)
            const res = await request(app)
                .get('/api/entries?month=2026-07')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]._id).toBe(entry1._id.toString());
            expect(res.body[0].amount).toBe(100);
            expect(res.body[0].userId).toBe(user._id.toString());
        });
    });

    describe('PUT /api/entries/:id (Update Expense)', () => {
        test('Should update an existing expense', async () => {
            const entry = await Entry.create({
                userId: user._id,
                categoryId: category._id,
                amount: 100,
                date: new Date('2026-07-01'),
                itemName: 'Old Lunch'
            });

            const res = await request(app)
                .put(`/api/entries/${entry._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 120,
                    itemName: 'New Lunch'
                });

            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(120);
            expect(res.body.itemName).toBe('New Lunch');
        });

        test('Should return 404 if updating an expense that does not exist or belongs to someone else', async () => {
            const otherEntry = await Entry.create({
                userId: otherUser._id,
                categoryId: otherCategory._id,
                amount: 200,
                date: new Date('2026-07-01'),
                itemName: 'Other Lunch'
            });

            const res = await request(app)
                .put(`/api/entries/${otherEntry._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 120,
                    itemName: 'Attempted hack'
                });

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Entry not found');
        });

        test('Should handle invalid expense ID format', async () => {
            const res = await request(app)
                .put('/api/entries/invalid-mongo-id-123')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    amount: 120
                });

            expect(res.status).toBe(500); // Mongoose CastError returns 500
        });
    });

    describe('DELETE /api/entries/:id (Delete Expense)', () => {
        test('Should delete an existing expense', async () => {
            const entry = await Entry.create({
                userId: user._id,
                categoryId: category._id,
                amount: 100,
                date: new Date('2026-07-01'),
                itemName: 'Lunch to delete'
            });

            const res = await request(app)
                .delete(`/api/entries/${entry._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Entry deleted');

            const dbEntry = await Entry.findById(entry._id);
            expect(dbEntry).toBeNull();
        });

        test('Should return 404 for non-existent expense or other user\'s expense', async () => {
            const otherEntry = await Entry.create({
                userId: otherUser._id,
                categoryId: otherCategory._id,
                amount: 200,
                date: new Date('2026-07-01'),
                itemName: 'Other Lunch'
            });

            const res = await request(app)
                .delete(`/api/entries/${otherEntry._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('Entry not found');
        });

        test('Should handle invalid ID correctly on delete', async () => {
            const res = await request(app)
                .delete('/api/entries/invalid-mongo-id-123')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(500);
        });
    });
});
