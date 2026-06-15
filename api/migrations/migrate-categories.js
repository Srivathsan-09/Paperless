/**
 * Migration Script: Simplify Category Structure
 * 
 * This script converts categories from the old hierarchical structure to the new flat structure where:
 * - Most categories are top-level (parentCategory: null)
 * - Only Miscellaneous and Savings remain as parent categories
 * - All existing entries and data remain intact
 * 
 * Usage: node api/migrations/migrate-categories.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Category = require('../models/Category');
const User = require('../models/User');

const PARENT_CATEGORIES_TO_MIGRATE = ['Daily Expenses', 'Utilities & Bills', 'Groceries', 'Health', 'Transportation', 'Education', 'Maintenance', 'Subscriptions'];
const PROTECTED_PARENTS = ['Miscellaneous', 'Savings'];

async function migrateCategories() {
    try {
        console.log('Starting category migration...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users to migrate`);

        let totalMigrated = 0;
        let totalErrors = 0;

        for (const user of users) {
            console.log(`\nMigrating categories for user: ${user.email}`);

            // Get all categories for this user
            const categories = await Category.find({ userId: user._id });
            console.log(`  Found ${categories.length} categories`);

            for (const category of categories) {
                try {
                    // If it's a subcategory of a non-protected parent, move it to top-level
                    if (category.parentCategory && !PROTECTED_PARENTS.includes(category.parentCategory)) {
                        // Check if this category itself is in the list of OLD parent categories
                        if (PARENT_CATEGORIES_TO_MIGRATE.includes(category.name)) {
                            // This is an old parent category - delete it as all its items will be top-level
                            console.log(`    Deleting old parent category: ${category.name}`);
                            await Category.deleteOne({ _id: category._id });
                            totalMigrated++;
                        } else {
                            // This is a subcategory of an old parent - move to top-level
                            console.log(`    Migrating: ${category.name} (was under ${category.parentCategory})`);
                            category.parentCategory = null;
                            category.isParent = false;
                            await category.save();
                            totalMigrated++;
                        }
                    }
                    // If it's a subcategory of Miscellaneous or Savings, keep it
                    else if (category.parentCategory && PROTECTED_PARENTS.includes(category.parentCategory)) {
                        // Check if this is the parent category itself
                        if (category.name === category.parentCategory) {
                            // Ensure isParent flag is set
                            category.isParent = true;
                            await category.save();
                            console.log(`    Updated parent flag for: ${category.name}`);
                        }
                        // Otherwise keep subcategory as-is
                    }
                    // If it has no parent, ensure parentCategory is null
                    else if (category.parentCategory === undefined || category.parentCategory === '') {
                        category.parentCategory = null;
                        await category.save();
                    }
                } catch (err) {
                    console.error(`    Error migrating category ${category.name}:`, err.message);
                    totalErrors++;
                }
            }
        }

        console.log(`\n\nMigration Complete!`);
        console.log(`Total categories migrated: ${totalMigrated}`);
        console.log(`Total errors: ${totalErrors}`);

        // Verify migration
        console.log(`\n\nVerifying migration...`);
        const allCategories = await Category.find({});
        const topLevel = await Category.find({ parentCategory: null });
        const miscCategories = await Category.find({ parentCategory: 'Miscellaneous' });
        const savingsCategories = await Category.find({ parentCategory: 'Savings' });

        console.log(`Total categories in database: ${allCategories.length}`);
        console.log(`  - Top-level categories: ${topLevel.length}`);
        console.log(`  - Miscellaneous subcategories: ${miscCategories.length}`);
        console.log(`  - Savings subcategories: ${savingsCategories.length}`);

        // List some examples
        console.log(`\nSample top-level categories:`);
        topLevel.slice(0, 5).forEach(cat => {
            console.log(`  - ${cat.name} (type: ${cat.type})`);
        });

        console.log(`\nSample Miscellaneous subcategories:`);
        miscCategories.filter(c => c.name !== 'Miscellaneous').slice(0, 3).forEach(cat => {
            console.log(`  - ${cat.name}`);
        });

        console.log(`\nSample Savings subcategories:`);
        savingsCategories.filter(c => c.name !== 'Savings').slice(0, 3).forEach(cat => {
            console.log(`  - ${cat.name}`);
        });

        console.log(`\nMigration verification complete!`);
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit(0);
    }
}

// Run migration
migrateCategories();
