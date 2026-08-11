require('dotenv').config();
const request = require('supertest');
const app = require('../api/index');
const Budget = require('../server/models/Budget');

describe('Budget API Unit tests (Endpoint structure & Auth validation)', () => {

    test('GET /api/budget without authorization header should return 401', async () => {
        const res = await request(app).get('/api/budget');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('PUT /api/budget without authorization header should return 401', async () => {
        const res = await request(app)
            .put('/api/budget')
            .send({ overallBudget: 20000, categoryBudgets: [] });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test('Budget Mongoose Model instantiation', () => {
        const testBudget = new Budget({
            userId: '507f1f77bcf86cd799439011',
            overallBudget: 25000,
            categoryBudgets: [
                { categoryId: 'cat123', categoryName: 'Food', limit: 5000 },
                { categoryId: 'cat456', categoryName: 'Transport', limit: 2000 }
            ]
        });

        expect(testBudget.overallBudget).toBe(25000);
        expect(testBudget.categoryBudgets.length).toBe(2);
        expect(testBudget.categoryBudgets[0].categoryName).toBe('Food');
        expect(testBudget.categoryBudgets[0].limit).toBe(5000);
        expect(testBudget.categoryBudgets[1].categoryName).toBe('Transport');
        expect(testBudget.categoryBudgets[1].limit).toBe(2000);
    });
});
