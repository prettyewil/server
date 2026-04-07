require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
);

const app = express();

app.get('/', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Forces Google to provide a refresh token
    });
    res.send(`<h1>Google Calendar Sync Setup</h1><p><a href="${authUrl}">Click here to authorize calendar access</a></p>`);
});

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('--- YOUR GOOGLE REFRESH TOKEN ---');
            console.log(tokens.refresh_token);
            console.log('-----------------------------------');
            console.log('Please copy the refresh token above and paste it into your server/.env file as GOOGLE_REFRESH_TOKEN');
            res.send('<h1>Success!</h1><p>Check your terminal for the refresh token. You can close this tab and terminate the script.</p>');
        } catch (error) {
            console.error('Error retrieving token:', error);
            res.send('<h1>Error handling auth callback</h1><p>' + error.message + '</p>');
        }
    } else {
        res.send('<h1>No code provided</h1>');
    }
});

app.listen(3000, () => {
    console.log('Token generation server started on http://localhost:3000');
    console.log('Open http://localhost:3000 in your browser to begin the calendar authorization.');
});
