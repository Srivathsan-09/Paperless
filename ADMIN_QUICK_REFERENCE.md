# Paperless Admin Panel - Quick Reference Guide

## 🚀 Getting Started (First Time Only)

### 1. Access Admin Panel
- URL: `https://your-domain.com/admin.html`
- Must be logged in with an admin account
- Must have `isAdmin: true` flag set in database

### 2. Promote First Admin
```bash
# From project directory
node api/utils/adminUtils.js promote your-email@example.com
```

---

## 📊 Dashboard Overview

### Main Sections

| Section | Purpose |
|---------|---------|
| **Dashboard** | System-wide statistics |
| **Users** | Browse and search users |
| **Data Explorer** | Dive deep into user data |
| **Export** | Download user data |

---

## 🔍 Dashboard Section

Shows real-time statistics:
- **Total Users**: Count of all registered users
- **Total Entries**: All expense entries across system
- **Total Spending**: Sum of all expenses
- **Avg Spending**: Average per user

📌 **Tip**: Refreshes automatically when you open the admin panel

---

## 👥 Users Section

### Features
- ✅ List all users with pagination
- ✅ Search by name or email (real-time)
- ✅ View quick stats for each user
- ✅ Click any user to see full profile

### Quick Stats Shown
- Total categories
- Total entries
- Total spending amount

### User Profile Shows
- Full registration details
- Complete spending statistics
- Category breakdown
- Monthly trend history
- Export buttons

---

## 🔎 Data Explorer Section

### Step 1: Select User
- Search for user by name or email
- Click on user card to explore

### Step 2: View Data
- Category-wise spending
- Monthly spending trend
- Top spending categories
- All with entry counts

### Step 3: Export Data
- JSON export (complete data + analytics)
- CSV entries (all transactions)
- CSV categories (all categories with stats)

---

## 💾 Export Section

### Available Exports

#### All Users CSV
- All user profiles in one file
- Name, email, registration date, stats
- Use for: User audits, bulk reports

#### Individual User JSON
- Complete export package
- Includes: profile, categories, entries, analytics
- Use for: Data portability, backups, audits

#### User Entries CSV
- All transactions for a user
- Date, category, amount, payment mode, notes
- Use for: Accounting, spreadsheets, analysis

#### User Categories CSV
- All categories with statistics
- Entry counts, total spending per category
- Use for: Category analysis, reconciliation

---

## 🎯 Common Tasks

### Search for a Specific User

**In Users Section:**
1. Click "Users" in sidebar
2. Type in search box (name or email)
3. Results filter instantly
4. Click card to view profile

**In Data Explorer:**
1. Click "Data Explorer" 
2. Type in search box
3. Click user to explore

### Export All User Data

1. Go to "Data Explorer"
2. Select the user
3. Click "📥 JSON" button
4. File downloads automatically

### Find Top Spending Categories

1. Go to "Data Explorer"
2. Select the user
3. Scroll to "Top Spending Categories"
4. See ranking and percentages

### Export for Accounting

1. Go to "Export" section
2. Find the user
3. Click "Entries CSV" button
4. Open in Excel/Google Sheets

### Analyze Monthly Trends

1. Go to "Data Explorer"
2. Select the user
3. Scroll to "Monthly Spending Trend"
4. See month-by-month breakdown

---

## 🛠️ Admin Utilities (Command Line)

### Promote User to Admin
```bash
node api/utils/adminUtils.js promote email@example.com
```

### Remove Admin Status
```bash
node api/utils/adminUtils.js demote admin@example.com
```

### List All Admins
```bash
node api/utils/adminUtils.js list
```

### Check if User is Admin
```bash
node api/utils/adminUtils.js check email@example.com
```

---

## ⚡ Performance Tips

### For Large User Base
- Use pagination in Users section
- Load users one page at a time
- Export date ranges instead of all data

### For Large Export
- Export specific date ranges if possible
- Use CSV for large datasets (smaller file size)
- Close other browser tabs first

### For Analytics
- Monthly trends load quickly
- Category distribution takes <1 second
- Refresh data using page reload

---

## 🔒 Security Notes

### What You Can See
✅ User names and emails
✅ All user entries and categories
✅ Spending statistics
✅ Payment methods used

### What You Cannot Do
❌ See user passwords
❌ Modify user entries
❌ Delete user accounts (no button for this)
❌ Impersonate users

### What's Protected
🔐 All admin routes require JWT token
🔐 All routes verify admin status
🔐 All actions are read-only
🔐 No direct data modification

---

## 📱 Mobile Tips

### Admin Panel on Mobile
- ✅ Fully responsive design
- ✅ Works on tablets and phones
- ✅ All features available
- ✅ Touch-friendly interface

### Tips
- Use landscape mode for tables
- Search works the same way
- Exports download normally
- Navigation drawer on mobile

---

## 🆘 Troubleshooting

### Admin Panel Won't Load
**Problem**: "Access Denied" message
**Solution**: 
1. Log out and log in again
2. Check that your account is promoted to admin
3. Run: `node api/utils/adminUtils.js check your-email@example.com`

### Can't Find a User
**Problem**: User doesn't appear in list
**Solution**:
1. Check spelling in search
2. Search by email instead of name
3. Try different keywords
4. Refresh page

### Export Doesn't Download
**Problem**: Export button doesn't work
**Solution**:
1. Check browser download settings
2. Verify popup is not blocked
3. Try different export format
4. Check browser console for errors

### Slow Performance
**Problem**: Dashboard or search is slow
**Solution**:
1. Close other browser tabs
2. Wait a moment for initial load
3. Refresh page if stuck
4. Check internet connection

---

## 📊 Understanding the Analytics

### Monthly Spending Trend
- Shows total spending per month
- Includes entry count
- Useful for spotting patterns

### Category Distribution
- Shows percentage by category
- Helps identify spending priorities
- Useful for budgeting advice

### Top Categories
- Ranked by total spending
- Shows percentage of total
- Useful for analysis

### Payment Modes
- Shows which payment method used most
- Breakdown by count and amount
- Useful for financial tracking

---

## 💡 Pro Tips

1. **Export for Backup**
   - Regularly export user data
   - Store in secure location
   - Use for disaster recovery

2. **Identify Patterns**
   - Look at monthly trends
   - Compare category spending
   - Spot unusual activity

3. **User Support**
   - Verify user's category setup
   - Check spending consistency
   - Help debug issues

4. **System Health**
   - Monitor dashboard stats
   - Check for inactive users
   - Track system growth

---

## 🔗 Quick Links

- Admin Panel: `/admin.html`
- User App: `/index.html`
- API Docs: See ADMIN_SETUP_GUIDE.md
- Help: See documentation files

---

## 📞 Need Help?

### Check Documentation
- `ADMIN_SETUP_GUIDE.md` - Detailed setup
- `ADMIN_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `ADMIN_PANEL_COMPLETE.md` - Full overview

### Verify Setup
```bash
# Check if user is admin
node api/utils/adminUtils.js list

# List all admins to verify
node api/utils/adminUtils.js check your-email@example.com
```

### Test Features
- Try each navigation link
- Attempt a search
- Try one export
- Verify dashboard loads

---

**Version**: 1.0  
**Last Updated**: June 16, 2026  
**Status**: Ready to Use

Enjoy managing Paperless! 🎉
