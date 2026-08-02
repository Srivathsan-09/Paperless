require('dotenv').config();
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace('/paperless', '/paperless_test');
const request = require('supertest');
const app = require('../api/index');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const Category = require('../server/models/Category');
const jwt = require('jsonwebtoken');

describe('Category API tests', () => {
    let user;
    let token;

    beforeAll(async () => {
        await connectDB();
        await User.deleteMany({});
        await Category.deleteMany({});

        user = await User.create({
            name: 'Category User',
            email: 'category@example.com',
            password: 'Password123'
        });

        token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Category.deleteMany({});
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await Category.deleteMany({});
    });

    test('Should create a category', async () => {
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Rent',
                type: 'general'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.name).toBe('Rent');
        expect(res.body.userId).toBe(user._id.toString());
    });

    test('Creating a duplicate category name is allowed by backend', async () => {
        // First creation
        await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Rent',
                type: 'general'
            });

        // Second creation (duplicate name)
        const res = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Rent',
                type: 'general'
            });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Rent');
    });

    test('Getting categories should seed defaults when user has none', async () => {
        const res = await request(app)
            .get('/api/categories')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        
        const names = res.body.map(c => c.name);
        expect(names).toContain('Milk');
        expect(names).toContain('Newspaper');
    });

    test('Should delete category and associated entries', async () => {
        // Create category
        const cat = await Category.create({
            userId: user._id,
            name: 'Temp Category',
            type: 'general'
        });

        const res = await request(app)
            .delete(`/api/categories/${cat._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Category and entries deleted');

        const dbCat = await Category.findById(cat._id);
        expect(dbCat).toBeNull();
    });

    test('Category created with invalid parent (like Daily Expenses) defaults to parentCategory null and shows on dashboard', async () => {
        const createRes = await request(app)
            .post('/api/categories')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Food',
                parentCategory: 'Daily Expenses',
                type: 'general'
            });

        expect(createRes.status).toBe(200);
        expect(createRes.body.name).toBe('Food');
        expect(createRes.body.parentCategory).toBeNull();

        const dashRes = await request(app)
            .get('/api/categories?dashboard=true')
            .set('Authorization', `Bearer ${token}`);

        expect(dashRes.status).toBe(200);
        const names = dashRes.body.map(c => c.name);
        expect(names).toContain('Food');
    });

    test('Invalid category delete returns 404', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .delete(`/api/categories/${fakeId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Category not found');
    });
});
