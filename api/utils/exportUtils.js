/**
 * Export Utilities
 * 
 * Provides functions to export user data in various formats.
 * Supports: CSV, Excel (XLSX), JSON
 */

const ExportUtils = {
    /**
     * Convert data to CSV format
     */
    toCSV: (headers, rows) => {
        const csvHeaders = headers.map(h => `"${h}"`).join(',');
        const csvRows = rows.map(row => {
            return headers.map(h => {
                const value = row[h];
                if (value === null || value === undefined) return '""';
                const strValue = String(value).replace(/"/g, '""');
                return `"${strValue}"`;
            }).join(',');
        }).join('\n');
        return `${csvHeaders}\n${csvRows}`;
    },

    /**
     * Generate CSV content for users
     */
    generateUsersCSV: (users) => {
        const headers = ['ID', 'Name', 'Email', 'Registration Date', 'Last Login', 'Total Categories', 'Total Entries', 'Total Spending'];
        const rows = users.map(user => ({
            'ID': user._id,
            'Name': user.name,
            'Email': user.email,
            'Registration Date': new Date(user.createdAt).toISOString().split('T')[0],
            'Last Login': new Date(user.lastLogin).toISOString().split('T')[0],
            'Total Categories': user.categoryCount || 0,
            'Total Entries': user.entryCount || 0,
            'Total Spending': user.totalSpending || 0,
        }));
        return ExportUtils.toCSV(headers, rows);
    },

    /**
     * Generate CSV content for entries
     */
    generateEntriesCSV: (entries) => {
        const headers = ['Date', 'Category', 'Item Name', 'Amount', 'Payment Mode', 'Notes'];
        const rows = entries.map(entry => ({
            'Date': new Date(entry.date).toISOString().split('T')[0],
            'Category': entry.categoryName || 'Unknown',
            'Item Name': entry.itemName,
            'Amount': entry.amount,
            'Payment Mode': entry.paymentMode,
            'Notes': entry.notes || '',
        }));
        return ExportUtils.toCSV(headers, rows);
    },

    /**
     * Generate CSV content for categories
     */
    generateCategoriesCSV: (categories) => {
        const headers = ['Name', 'Type', 'Parent Category', 'Created Date', 'Total Entries', 'Total Spending'];
        const rows = categories.map(cat => ({
            'Name': cat.name,
            'Type': cat.type,
            'Parent Category': cat.parentCategory || 'N/A',
            'Created Date': new Date(cat.createdAt).toISOString().split('T')[0],
            'Total Entries': cat.entryCount || 0,
            'Total Spending': cat.totalSpending || 0,
        }));
        return ExportUtils.toCSV(headers, rows);
    },

    /**
     * Generate comprehensive analytics summary
     */
    generateAnalyticsSummary: (user, stats) => {
        return {
            'User Profile': {
                'Name': user.name,
                'Email': user.email,
                'Registered': new Date(user.createdAt).toISOString().split('T')[0],
                'Last Login': new Date(user.lastLogin).toISOString().split('T')[0],
            },
            'Summary Statistics': {
                'Total Categories': stats.totalCategories || 0,
                'Total Entries': stats.totalEntries || 0,
                'Total Spending': stats.totalSpending || 0,
                'Average Entry Amount': stats.averageAmount || 0,
                'Average Monthly Spending': stats.averageMonthlySpending || 0,
            },
            'Category Distribution': stats.categoryDistribution || {},
            'Monthly Spending': stats.monthlySpending || {},
            'Payment Methods': stats.paymentModes || {},
        };
    },

    /**
     * Generate complete user export package (JSON)
     */
    generateCompleteExport: (user, categories, entries, stats) => {
        return {
            exportDate: new Date().toISOString(),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
            },
            statistics: ExportUtils.generateAnalyticsSummary(user, stats),
            categories: categories.map(c => ({
                id: c._id,
                name: c.name,
                type: c.type,
                parentCategory: c.parentCategory,
                isParent: c.isParent,
                createdAt: c.createdAt,
            })),
            entries: entries.map(e => ({
                id: e._id,
                categoryId: e.categoryId,
                categoryName: e.categoryName,
                amount: e.amount,
                date: e.date,
                itemName: e.itemName,
                notes: e.notes,
                paymentMode: e.paymentMode,
                createdAt: e.createdAt,
            })),
        };
    }
};

module.exports = ExportUtils;
