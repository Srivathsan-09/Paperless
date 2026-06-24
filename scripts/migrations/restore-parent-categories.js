const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Category = require('../../server/models/Category');
const User = require('../../server/models/User');

const PARENT_DEFAULTS = [
    { parentCategory: 'Miscellaneous', name: 'Miscellaneous', type: 'general', isParent: true },
    { parentCategory: 'Savings', name: 'Savings', type: 'general', isParent: true }
];

const SUBCATEGORY_DEFAULTS = [
    // Miscellaneous Subcategories
    { parentCategory: 'Miscellaneous', name: 'Travel', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Function/Gift', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Donations', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Happy Plates', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Dress', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Items', type: 'general' },

    // Savings Subcategories
    { parentCategory: 'Savings', name: 'PPF', type: 'general' },
    { parentCategory: 'Savings', name: 'RD', type: 'general' },
    { parentCategory: 'Savings', name: 'LIC', type: 'general' },
    { parentCategory: 'Savings', name: 'Gold Chit', type: 'general' },
    { parentCategory: 'Savings', name: 'FD', type: 'general' }
];

async function restore() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const users = await User.find({});
        console.log(`Found ${users.length} users in database.`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (ID: ${user._id})`);

            // 1. Ensure Parent Categories exist
            for (const parentDef of PARENT_DEFAULTS) {
                const existingParent = await Category.findOne({
                    userId: user._id,
                    name: parentDef.name,
                    isParent: true
                });

                if (!existingParent) {
                    console.log(`  Adding missing parent category: ${parentDef.name}`);
                    const newParent = new Category({
                        ...parentDef,
                        userId: user._id
                    });
                    await newParent.save();
                } else {
                    console.log(`  Parent category exists: ${parentDef.name}`);
                    // Ensure the properties are correct (like parentCategory and isParent)
                    let modified = false;
                    if (existingParent.parentCategory !== parentDef.parentCategory) {
                        existingParent.parentCategory = parentDef.parentCategory;
                        modified = true;
                    }
                    if (!existingParent.isParent) {
                        existingParent.isParent = true;
                        modified = true;
                    }
                    if (modified) {
                        await existingParent.save();
                        console.log(`    Updated existing parent properties for ${parentDef.name}`);
                    }
                }
            }

            // 2. Ensure Subcategories exist (to be safe)
            for (const subDef of SUBCATEGORY_DEFAULTS) {
                // Check by name and parentCategory
                const existingSub = await Category.findOne({
                    userId: user._id,
                    name: subDef.name,
                    parentCategory: subDef.parentCategory
                });

                if (!existingSub) {
                    console.log(`  Adding missing subcategory: ${subDef.parentCategory} -> ${subDef.name}`);
                    const newSub = new Category({
                        ...subDef,
                        userId: user._id
                    });
                    await newSub.save();
                }
            }
        }

        console.log('\nRestoration complete.');
    } catch (err) {
        console.error('Error during restoration:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

restore();
