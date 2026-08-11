const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const Budget = require('../models/Budget');

/**
 * @route   GET /api/budget
 * @desc    Get budget settings for the authenticated user
 * @access  Private
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        let budget = await Budget.findOne({ userId: req.user._id });
        if (!budget) {
            // Return empty default structure if no budget recorded yet
            return res.json({
                success: true,
                budget: {
                    overallBudget: 0,
                    categoryBudgets: []
                }
            });
        }
        res.json({
            success: true,
            budget: {
                overallBudget: budget.overallBudget || 0,
                categoryBudgets: budget.categoryBudgets || []
            }
        });
    } catch (err) {
        console.error('Get budget error:', err.message);
        res.status(500).json({ success: false, message: 'Server error while fetching budget settings' });
    }
});

/**
 * @route   PUT /api/budget
 * @desc    Update or create budget settings for the authenticated user
 * @access  Private
 */
router.put('/', verifyToken, async (req, res) => {
    try {
        const { overallBudget, categoryBudgets } = req.body;

        // Validation
        const parsedOverall = Number(overallBudget) >= 0 ? Number(overallBudget) : 0;

        let cleanCategoryBudgets = [];
        if (Array.isArray(categoryBudgets)) {
            cleanCategoryBudgets = categoryBudgets
                .filter(item => item && item.categoryName && typeof item.categoryName === 'string')
                .map(item => ({
                    categoryId: String(item.categoryId || ''),
                    categoryName: String(item.categoryName).trim(),
                    limit: Math.max(0, Number(item.limit) || 0)
                }));
        }

        const updatedBudget = await Budget.findOneAndUpdate(
            { userId: req.user._id },
            {
                $set: {
                    overallBudget: parsedOverall,
                    categoryBudgets: cleanCategoryBudgets
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Budget limits saved successfully',
            budget: {
                overallBudget: updatedBudget.overallBudget,
                categoryBudgets: updatedBudget.categoryBudgets
            }
        });
    } catch (err) {
        console.error('Update budget error:', err.message);
        res.status(500).json({ success: false, message: 'Server error while saving budget settings' });
    }
});

module.exports = router;
