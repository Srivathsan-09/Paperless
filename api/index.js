require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const connectDB = require('../server/config/db');

// Validate environment variables
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnv.join(', ')}`);
}

// Initialize Express app
const app = express();

// Set request timeout for Vercel serverless (max 30s)
app.use((req, res, next) => {
    // Set response timeout
    res.setTimeout(25000, () => {
        res.status(408).json({ success: false, message: 'Request timeout' });
    });
    next();
});

// Connect to MongoDB via middleware (with connection caching)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('DB Connection error:', err);
        res.status(503).json({ success: false, message: 'Database unavailable' });
    }
});

// Initialize Passport configuration
require('../server/config/passport')(passport);

// Build list of allowed CORS origins.
// Includes: configured FRONTEND_URL, Vercel production/preview URLs, and localhost for dev.
const getAllowedOrigins = () => {
    const origins = new Set();

    if (process.env.FRONTEND_URL) {
        origins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    if (process.env.VERCEL_URL) {
        origins.add(`https://${process.env.VERCEL_URL}`);
    }
    // Always allow localhost ports for local development
    origins.add('http://localhost:3000');
    origins.add('http://localhost:5000');
    origins.add('http://localhost:8080');
    origins.add('http://127.0.0.1:3000');
    origins.add('http://127.0.0.1:5000');

    return [...origins];
};

const allowedOrigins = getAllowedOrigins();

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, mobile apps, same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow all vercel.app preview/deployment subdomains
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        // Allow localhost with any port for dev convenience
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        callback(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    credentials: true,
}));

// Optimize body parser limits for serverless
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport (without sessions since we're using JWT)
app.use(passport.initialize());

// Static files are served by Vercel from the public directory
// app.use(express.static(path.join(__dirname, '../Front end')));

// Routes
app.use('/auth', require('../server/routes/auth'));
app.use('/api/categories', require('../server/routes/categories'));
app.use('/api/entries', require('../server/routes/entries'));
app.use('/api/admin', require('../server/routes/admin'));


// User profile route
const verifyToken = require('../server/middleware/verifyToken');
app.get('/api/user/profile', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profilePic: req.user.profilePic,
            isAdmin: req.user.isAdmin,
            createdAt: req.user.createdAt,
            lastLogin: req.user.lastLogin,
        },
    });
});

/**
 * POST /api/setup/promote-admin
 * One-time secure endpoint to promote a user to admin.
 * Requires ADMIN_SETUP_SECRET env var to match the request body secret.
 * Body: { email: "...", secret: "..." }
 * This endpoint always promotes users listed in DEFAULT_ADMIN_EMAILS
 * regardless of current isAdmin state. Safe to call multiple times.
 */
app.post('/api/setup/promote-admin', async (req, res) => {
    try {
        const { email, secret } = req.body;
        const setupSecret = process.env.ADMIN_SETUP_SECRET;

        // Must have a secret configured in env
        if (!setupSecret) {
            return res.status(403).json({ success: false, message: 'Setup not configured.' });
        }

        // Secret must match
        if (!secret || secret !== setupSecret) {
            return res.status(403).json({ success: false, message: 'Invalid secret.' });
        }

        // Email must be in DEFAULT_ADMIN_EMAILS
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const adminEmails = (process.env.DEFAULT_ADMIN_EMAILS || '')
            .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

        const normalizedEmail = email.trim().toLowerCase();
        if (!adminEmails.includes(normalizedEmail)) {
            return res.status(403).json({ success: false, message: 'Email not in admin list.' });
        }

        const UserModel = require('../server/models/User');

        const user = await UserModel.findOneAndUpdate(
            { email: normalizedEmail },
            { $set: { isAdmin: true } },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found. Make sure you have signed up first.' });
        }

        res.json({
            success: true,
            message: `✅ ${user.name} (${user.email}) promoted to admin.`,
            user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        });
    } catch (err) {
        console.error('Promote admin error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


// Root route is handled by Vercel serving public/index.html or similar
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../Front end', 'Loginpage.html'));
// });


// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Serverless deployment: Export the app
// Vercel handles the server execution

module.exports = app;
