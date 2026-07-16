/**
 * Migration Script: Reset Deprecated Parent Category Associations to Null
 * 
 * In the new flat layout, most categories are top-level (parentCategory: null).
 * Only Miscellaneous and Savings remain as parent categories.
 * Due to a frontend default, new categories (like Blinkit) might have been created
 * under 'Daily Expenses', making them invisible on the dashboard. This script fixes them.
 * 
 * Usage: node scripts/migrations/fix-migrated-parent-categories.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables (prefer .env.local, fallback to .env)
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Category = require('../../server/models/Category');

const DEPRECATED_PARENTS = [
    'Daily Expenses',
    'Utilities & Bills',
    'Groceries',
    'Health',
    'Transportation',
    'Education',
    'Maintenance',
    'Subscriptions',
    'DailyExpenses',
    'daily'
];

async function fixMigratedCategories() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('Error: MONGODB_URI is not defined in environment variables.');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.');

        console.log('Finding categories with deprecated parent associations...');
        
        // Find matching categories first
        const categoriesToFix = await Category.find({
            parentCategory: { $in: DEPRECATED_PARENTS }
        });

        console.log(`Found ${categoriesToFix.length} categories to fix:`);
        categoriesToFix.forEach(cat => {
            console.log(`  - Category "${cat.name}" under parent "${cat.parentCategory}" (User ID: ${cat.userId})`);
        });

        if (categoriesToFix.length > 0) {
            const result = await Category.updateMany(
                { parentCategory: { $in: DEPRECATED_PARENTS } },
                { $set: { parentCategory: null } }
            );
            console.log(`Successfully updated ${result.modifiedCount} categories to parentCategory: null.`);
        } else {
            console.log('No categories with deprecated parent associations found.');
        }

    } catch (err) {
        console.error('Migration failed with error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

fixMigratedCategories();
