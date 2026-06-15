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

// Normalize Frontend URL (remove trailing slash)
// Priority: Custom FRONTEND_URL -> Vercel Production URL -> Vercel Preview URL -> Localhost
const getBaseUrl = () => {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return 'https://paperlesspersonal.vercel.app';
};
const frontendUrl = getBaseUrl().replace(/\/$/, '');

// Middleware
app.use(cors({
    origin: frontendUrl,
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


// Example protected route (for future use)
const verifyToken = require('../server/middleware/verifyToken');
app.get('/api/user/profile', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            profilePic: req.user.profilePic,
            createdAt: req.user.createdAt,
            lastLogin: req.user.lastLogin,
        },
    });
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
