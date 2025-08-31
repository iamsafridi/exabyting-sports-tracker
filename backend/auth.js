const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const domain = email.split('@')[1];
        
        // Check if email is from allowed domain
        if (domain !== process.env.ALLOWED_DOMAIN) {
            return done(null, false, { message: 'Access restricted to @exabyting.com emails only' });
        }
        
        const user = {
            id: profile.id,
            email: email,
            name: profile.displayName,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            picture: profile.photos[0].value
        };
        
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check domain restriction
const checkDomain = (req, res, next) => {
    if (req.user && req.user.email) {
        const domain = req.user.email.split('@')[1];
        if (domain === process.env.ALLOWED_DOMAIN) {
            return next();
        }
    }
    res.status(403).json({ error: 'Access restricted to @exabyting.com emails only' });
};

// Generate JWT token for API authentication
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            name: user.name,
            firstName: user.firstName 
        },
        process.env.SESSION_SECRET,
        { expiresIn: '24h' }
    );
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.SESSION_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = {
    passport,
    requireAuth,
    checkDomain,
    generateToken,
    verifyToken
};
