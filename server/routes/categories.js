const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Entry = require('../models/Entry');
const verifyToken = require('../middleware/verifyToken');

const DEFAULTS = [
    // Top-level Regular Categories (No parent)
    { parentCategory: null, name: 'Milk', type: 'milk' },
    { parentCategory: null, name: 'Newspaper', type: 'general' },
    { parentCategory: null, name: 'Fruits & Vegetables', type: 'general' },
    { parentCategory: null, name: 'Water Can', type: 'general' },
    { parentCategory: null, name: 'EB Bill', type: 'general' },
    { parentCategory: null, name: 'Mobile Recharge', type: 'general' },
    { parentCategory: null, name: 'Internet/Wi-Fi', type: 'general' },
    { parentCategory: null, name: 'Gas Cylinder', type: 'general' },
    { parentCategory: null, name: 'Supermarket / Monthly Shopping', type: 'general' },
    { parentCategory: null, name: 'Local Grocery Store', type: 'general' },
    { parentCategory: null, name: 'Dairy Products', type: 'general' },
    { parentCategory: null, name: 'Hair Cut', type: 'general' },
    { parentCategory: null, name: 'Snacks', type: 'general' },

    // Miscellaneous Parent Category
    { parentCategory: 'Miscellaneous', name: 'Miscellaneous', type: 'general', isParent: true },
    // Miscellaneous Subcategories
    { parentCategory: 'Miscellaneous', name: 'Travel', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Function/Gift', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Donations', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Happy Plates', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Dress', type: 'general' },
    { parentCategory: 'Miscellaneous', name: 'Items', type: 'general' },

    // Savings Parent Category
    { parentCategory: 'Savings', name: 'Savings', type: 'general', isParent: true },
    // Savings Subcategories
    { parentCategory: 'Savings', name: 'PPF', type: 'general' },
    { parentCategory: 'Savings', name: 'RD', type: 'general' },
    { parentCategory: 'Savings', name: 'LIC', type: 'general' },
    { parentCategory: 'Savings', name: 'Gold Chit', type: 'general' },
    { parentCategory: 'Savings', name: 'FD', type: 'general' }
];


// @route   POST /api/categories
// @desc    Add new category for logged-in user
router.post('/', verifyToken, async (req, res) => {
    try {
        const { parentCategory, name, type, isParent } = req.body;

        const newCategory = new Category({
            userId: req.user._id,
            parentCategory: parentCategory || null,  // Default to null for top-level categories
            name,
            type: type || 'general',
            isParent: isParent || false
        });

        const category = await newCategory.save();
        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/categories
// @desc    Fetch categories for a section (and seed if missing)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { parent, dashboard } = req.query;

        // Seeding and Integrity Check
        const count = await Category.countDocuments({ userId: req.user._id });
        if (count === 0) {
            const seedList = DEFAULTS;
            const seedData = seedList.map(d => ({ ...d, userId: req.user._id }));
            await Category.insertMany(seedData);
        } else {
            // Ensure parent categories exist for existing users
            const parentCategories = ['Miscellaneous', 'Savings'];
            for (const parentName of parentCategories) {
                const hasParent = await Category.findOne({ userId: req.user._id, name: parentName, isParent: true });
                if (!hasParent) {
                    const newParent = new Category({
                        userId: req.user._id,
                        name: parentName,
                        parentCategory: parentName,
                        isParent: true,
                        type: 'general'
                    });
                    await newParent.save();
                }
            }
        }

        // Base query for the user
        let query = { userId: req.user._id };

        // Optimization: Filter at database level
        if (parent) {
            // Get subcategories of a specific parent (excluding the parent folder category itself)
            query.parentCategory = parent;
            query.name = { $ne: parent };
        } else if (dashboard === 'true') {
            // Dashboard: Return top-level categories (parentCategory is null) 
            // PLUS parent categories (Miscellaneous and Savings)
            query.$or = [
                { parentCategory: null },  // Top-level regular categories
                { isParent: true }         // Parent categories (Miscellaneous, Savings)
            ];
        }

        const categories = await Category.find(query).sort({ createdAt: 1 });
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/categories/:id
// @desc    Update category (Rename)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        let category = await Category.findOne({ _id: req.params.id, userId: req.user._id });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        if (name) category.name = name;

        await category.save();
        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category and its entries
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Delete associated entries
        await Entry.deleteMany({ categoryId: req.params.id, userId: req.user._id });
        await Category.deleteOne({ _id: req.params.id });

        res.json({ message: 'Category and entries deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;
