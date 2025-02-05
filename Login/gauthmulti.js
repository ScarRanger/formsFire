const express = require('express');
const { google } = require('googleapis');
const session = require('express-session');
const admin = require('firebase-admin');
const path = require('path');
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
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Google Authentication Route
app.get('/auth/google', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    });
    res.redirect(authUrl);
});

// Google Callback Route
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const userEmail = payload.email;
        const displayName = payload.name;

        // 🔥 Fetch user role from 'users' collection
        const userRef = db.collection('users').doc(userEmail);
        const doc = await userRef.get();

        let role = 'user'; // Default role

        if (doc.exists) {
            console.log('User found in Firestore:', doc.data()); // Debugging
            const userData = doc.data();
            if (userData && userData.role) {
                role = userData.role;
            }
        } else {
            console.log('User not found in Firestore, creating new entry.');
            await userRef.set({
                name: displayName,
                email: userEmail,
                role: role
            });
        }
        console.log(`Assigned Role: ${role}`);

        // ✅ Store login event in 'loggedUsers' collection
        await db.collection('loggedUsers').add({
            name: displayName,
            email: userEmail,
            role: role,
            loggedInAt: new Date()
        });

        // Store user session with the correct role
        req.session.user = { email: userEmail, role };

        // Redirect to dashboard with role alert
        res.redirect(`/dashboard.html?role=${role}`);
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).send('Error during Google authentication');
    }
});

// Dashboard API to check user role
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/google');
    }
    res.json({ role: req.session.user.role });
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
