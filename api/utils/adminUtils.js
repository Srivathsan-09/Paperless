/**
 * Admin Management Utility Script
 * 
 * Usage: node api/utils/adminUtils.js <email> <action>
 * 
 * Actions:
 *   promote <email>  - Make user an admin
 *   demote <email>   - Remove admin status
 *   list             - List all admins
 *   check <email>    - Check if user is admin
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function main() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        const args = process.argv.slice(2);
        const action = args[0];
        const email = args[1];

        if (!action) {
            console.log('Usage: node adminUtils.js <action> [email]');
            console.log('\nActions:');
            console.log('  promote <email>   - Make user an admin');
            console.log('  demote <email>    - Remove admin status');
            console.log('  list              - List all admins');
            console.log('  check <email>     - Check if user is admin');
            process.exit(0);
        }

        switch (action) {
            case 'promote':
                if (!email) {
                    console.error('❌ Email required for promote action');
                    process.exit(1);
                }
                await promoteUser(email);
                break;

            case 'demote':
                if (!email) {
                    console.error('❌ Email required for demote action');
                    process.exit(1);
                }
                await demoteUser(email);
                break;

            case 'list':
                await listAdmins();
                break;

            case 'check':
                if (!email) {
                    console.error('❌ Email required for check action');
                    process.exit(1);
                }
                await checkAdmin(email);
                break;

            default:
                console.error(`❌ Unknown action: ${action}`);
                process.exit(1);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

async function promoteUser(email) {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        if (user.isAdmin) {
            console.log(`ℹ User is already an admin: ${email}`);
            return;
        }

        user.isAdmin = true;
        await user.save();

        console.log(`✓ User promoted to admin: ${email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  ID: ${user._id}`);
    } catch (err) {
        console.error('❌ Error promoting user:', err.message);
    }
}

async function demoteUser(email) {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        if (!user.isAdmin) {
            console.log(`ℹ User is not an admin: ${email}`);
            return;
        }

        user.isAdmin = false;
        await user.save();

        console.log(`✓ Admin status removed: ${email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  ID: ${user._id}`);
    } catch (err) {
        console.error('❌ Error demoting user:', err.message);
    }
}

async function listAdmins() {
    try {
        const admins = await User.find({ isAdmin: true }).select('name email createdAt');

        if (admins.length === 0) {
            console.log('ℹ No admin users found');
            return;
        }

        console.log(`\n✓ Found ${admins.length} admin(s):\n`);
        admins.forEach((admin, idx) => {
            console.log(`${idx + 1}. ${admin.name} (${admin.email})`);
            console.log(`   Created: ${new Date(admin.createdAt).toLocaleDateString()}`);
        });
    } catch (err) {
        console.error('❌ Error listing admins:', err.message);
    }
}

async function checkAdmin(email) {
    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        if (user.isAdmin) {
            console.log(`✓ User is an admin: ${email}`);
        } else {
            console.log(`ℹ User is NOT an admin: ${email}`);
        }

        console.log(`  Name: ${user.name}`);
        console.log(`  ID: ${user._id}`);
    } catch (err) {
        console.error('❌ Error checking user:', err.message);
    }
}

// Run the script
main();
