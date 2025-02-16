const express = require('express');
const { google } = require('googleapis');
const session = require('express-session');
const admin = require('firebase-admin');
const path = require('path');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Firebase Admin Setup
const serviceAccount = require('./cypmain-171b3-firebase-adminsdk-l2ifk-b7c407db58.json'); // Update with your actual Firebase credentials file
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Google OAuth Setup
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5001/auth/google/callback';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.use(express.static('public')); // Serve static files (HTML)

app.use(session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,  // Set `true` if using HTTPS
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));




// app.use(session({
//     secret: process.env.SESSION_SECRET || 'your_secret_key',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/sessions' }), 
//     cookie: { httpOnly: true, secure: false, maxAge: 1000 * 60 * 60 * 24 }
// }));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Google Authentication Route
app.get('/auth/google', (req, res) => {
    console.log("Redirecting to Google OAuth...");
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    });
    res.redirect(authUrl);
});



function checkRole(requiredRole) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/auth/google'); // Redirect if not logged in
        }

        if (req.session.user.role !== requiredRole) {
            return res.status(403).send('Access Denied: Insufficient Permissions');
        }

        next();
    };
}


// Google Callback Route
app.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userEmail = payload.email;
        const displayName = payload.name;

        // Fetch role from Firestore
        const userRef = db.collection('users').doc(userEmail);
        const doc = await userRef.get();
        let role = 'user';

        if (doc.exists) {
            role = doc.data().role || 'user';
        } else {
            await userRef.set({ name: displayName, email: userEmail, role });
        }

        console.log(`Assigned Role: ${role}`);

        // ✅ Store session
        req.session.user = { name: displayName, email: userEmail, role };

        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).send("Session error");
            }
            console.log("✅ Session saved successfully:", req.session.user);
            res.redirect("/dashboard");
        });

    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).send("Error during authentication");
    }
});



function authenticateUser(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

app.get('/dashboard', (req, res) => {
    console.log("🔍 Request Headers:", req.headers);
    console.log("🔍 Session Data:", req.session);

    if (!req.session || !req.session.user) {
        console.warn("❌ No active session found, sending 401.");
        return res.status(401).json({ error: "Unauthorized: No active session" });
    }

    console.log("✅ Session exists, returning user data:", req.session.user);

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json(req.session.user);
});





app.get('/admin', checkRole('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Example: Protect Coordinator Route
app.get('/coordinator', checkRole('coordinator'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'coordinator.html'));
});

// Example: Protect Leader Route
app.get('/leader', checkRole('leader'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leader.html'));
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
