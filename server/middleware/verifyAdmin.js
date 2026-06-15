/**
 * Admin Verification Middleware
 * 
 * Verifies that the authenticated user has admin privileges.
 * Must be used in conjunction with verifyToken middleware.
 */

const verifyAdmin = (req, res, next) => {
    // Requires verifyToken to be called first
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is an admin
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    next();
};

module.exports = verifyAdmin;
