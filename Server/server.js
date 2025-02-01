const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const path = require('path');
const { Readable } = require('stream');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Allow CORS for frontend requests
const allowedOrigins = ['http://127.0.0.1:5500']; // Update this for production
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(bodyParser.json()); // Enable parsing of JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Support URL-encoded bodies

// Initialize Firebase Admin SDK
try {
    admin.app();
} catch (error) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();

// Google Drive API setup using Service Account
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// Folder ID where you want to store images (create a folder in Google Drive and get its ID)
const FOLDER_ID = '1K9TbWFhdmz9PXBBVqnhW7FlpuYCyeXUB'; // Replace with your folder ID in Google Drive

// Multer storage configuration for handling image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            return cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    }
});

// Upload image to Google Drive within a specific folder using Service Account
async function uploadToGoogleDrive(fileBuffer, fileName, mimeType) {
    const fileMetadata = {
        name: `${fileName}_${Date.now()}`, // Use form's name for the file name
        parents: [FOLDER_ID], // Store the image in the specified folder
    };

    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null); // Signal end of stream

    const media = {
        mimeType: mimeType,
        body: bufferStream, // Pass the ReadableStream to body
    };

    try {
        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink', // Get file ID and public link
        });

        console.log('File uploaded to Google Drive:', res.data);
        return res.data.webViewLink; // Return the file's public link
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
}

// Configure Google Sheets API
const credentials = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

async function appendDataToSheet(data) {
    try {
        const auth = await credentials.getClient();
        const sheets = google.sheets({ version: 'v4', auth });

        const spreadsheetId = '1y5vNC6pyGNhJmkJjq7YNd2v0yRPaE2FnJxSsuxKiNrg'; // Replace with your Google Sheet ID
        const range = 'Sheet2!B2:I2'; // Add column for image URL

        const values = [data]; // Data to append

        const request = {
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        };

        const response = await sheets.spreadsheets.values.append(request);
        console.log('Data appended to Google Sheet:', response.data);
        return response.data;

    } catch (error) {
        console.error('Google Sheets API error:', error);
        throw error;
    }
}

// Form submission route with file upload
app.post('/submit_form', upload.single('image'), async (req, res) => {
    try {
        const { name, email, phone, age, parish } = req.body;
        let imageUrl = null;

        // Upload image to Google Drive if provided
        if (req.file) {
            const mimeType = req.file.mimetype;
            imageUrl = await uploadToGoogleDrive(req.file.buffer, name, mimeType); // Pass 'name' here
        }

        // Create Firestore document
        const docRef = db.collection('OneDay').doc();
        const docId = docRef.id;

        await docRef.set({
            name, email, phone, age, parish, imageUrl, docId
        });

        // Prepare data for Google Sheets
        const sheetData = [name, email, phone, age, parish, docId, imageUrl];

        // Append data to Google Sheets
        await appendDataToSheet(sheetData);

        console.log("Document successfully written!");
        res.json({ success: true, message: "Data stored successfully!", imageUrl });

    } catch (error) {
        console.error("Error submitting form:", error);
        res.status(500).json({ success: false, message: "An error occurred.", error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
