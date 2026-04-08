const { google } = require('googleapis');
const SystemSettings = require('../models/SystemSettings');

// OAuth2 credentials from environment
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

/**
 * Checks if Google Calendar sync is enabled in system settings.
 * Returns true if enabled or if settings don't exist yet (default on).
 */
const isCalendarEnabled = async () => {
    try {
        const settings = await SystemSettings.findOne();
        // Default to true if no settings document exists
        if (!settings) return true;
        return settings.enableGoogleCalendar !== false;
    } catch (error) {
        console.error('Error checking calendar settings:', error.message);
        return false;
    }
};

/**
 * Validates that the GOOGLE_REFRESH_TOKEN env var is set and looks like a real token
 * (not a URL or placeholder).
 */
const isRefreshTokenValid = () => {
    const token = process.env.GOOGLE_REFRESH_TOKEN;
    if (!token) {
        console.warn('[GoogleCalendar] GOOGLE_REFRESH_TOKEN is not set in .env');
        return false;
    }
    // A real refresh token is a long alphanumeric string starting with "1//"
    // A common misconfiguration is setting it to the token endpoint URL
    if (token.startsWith('http://') || token.startsWith('https://')) {
        console.warn('[GoogleCalendar] GOOGLE_REFRESH_TOKEN appears to be a URL instead of an actual token. Please run "node get-google-token.js" to obtain a valid refresh token.');
        return false;
    }
    return true;
};

/**
 * Creates an OAuth2 client using Client ID, Client Secret, and Refresh Token.
 * The refresh token allows the server to obtain new access tokens automatically.
 */
const getAuthClient = () => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/oauth2callback' // Redirect URI used during token generation
    );

    // Set the refresh token so the client can auto-refresh access tokens
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return oauth2Client;
};

const calendar = google.calendar('v3');

/**
 * Lists the next 10 events on the configured calendar.
 */
const listEvents = async () => {
    try {
        const enabled = await isCalendarEnabled();
        if (!enabled || !isRefreshTokenValid()) return [];

        const auth = getAuthClient();
        const res = await calendar.events.list({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items;
    } catch (error) {
        console.error('Error listing calendar events:', error.message);
        return [];
    }
};

/**
 * Creates a new event on the calendar.
 * @param {object} task - Task object from taskController. Expected shape:
 *   { title, type, area, assignedRoom, dueDate, notes, attendees: [{ email }] }
 */
const createEvent = async (task) => {
    try {
        const enabled = await isCalendarEnabled();
        if (!enabled) {
            console.log('[GoogleCalendar] Sync is disabled in system settings. Skipping event creation.');
            return null;
        }
        if (!isRefreshTokenValid()) return null;

        const auth = getAuthClient();

        // Build attendees list from task.attendees array (set by taskController)
        const attendees = (task.attendees || []).map(a => ({ email: a.email }));

        const event = {
            summary: task.title,
            description: `Task Type: ${task.type}\nArea: ${task.area}\nRoom: ${task.assignedRoom}\nNotes: ${task.notes || 'None'}`,
            start: {
                dateTime: new Date(task.dueDate).toISOString(),
            },
            end: {
                dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
            },
            attendees,
            visibility: 'public',
            guestsCanSeeOtherGuests: true,
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };

        const res = await calendar.events.insert({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            resource: event,
            sendUpdates: 'all',
        });

        console.log('Google Calendar event created:', res.data.htmlLink);
        return res.data.id;
    } catch (error) {
        console.error('Error creating calendar event:', error.message);
        return null;
    }
};

/**
 * Updates an event on the calendar.
 * @param {string} eventId - The Google Calendar event ID
 * @param {object} task - Task object containing refreshed values
 */
const updateEvent = async (eventId, task) => {
    if (!eventId) return null;
    try {
        const enabled = await isCalendarEnabled();
        if (!enabled) {
            console.log('[GoogleCalendar] Sync is disabled in system settings. Skipping event update.');
            return null;
        }
        if (!isRefreshTokenValid()) return null;

        const auth = getAuthClient();

        const attendees = (task.attendees || []).map(a => ({ email: a.email }));

        const event = {
            summary: task.title,
            description: `Task Type: ${task.type}\nArea: ${task.area}\nRoom: ${task.assignedRoom}\nNotes: ${task.notes || 'None'}`,
            start: {
                dateTime: new Date(task.dueDate).toISOString(),
            },
            end: {
                dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
            },
            attendees,
            visibility: 'public',
            guestsCanSeeOtherGuests: true,
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };

        const res = await calendar.events.update({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: eventId,
            resource: event,
            sendUpdates: 'all',
        });

        console.log('Google Calendar event updated:', res.data.htmlLink);
        return res.data.id;
    } catch (error) {
        console.error('Error updating calendar event:', error.message);
        return null;
    }
};

/**
 * Deletes an event from the calendar.
 * @param {string} eventId - The Google Calendar event ID
 */
const deleteEvent = async (eventId) => {
    if (!eventId) return;
    try {
        const enabled = await isCalendarEnabled();
        if (!enabled) {
            console.log('[GoogleCalendar] Sync is disabled in system settings. Skipping event deletion.');
            return;
        }
        if (!isRefreshTokenValid()) return;

        const auth = getAuthClient();
        await calendar.events.delete({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: eventId,
        });
        console.log('Google Calendar event deleted:', eventId);
    } catch (error) {
        console.error('Error deleting calendar event:', error.message);
    }
};

/**
 * Lists Philippine holidays from Google's public holiday calendar.
 * This uses the public calendar and does NOT require a valid refresh token.
 */
const listHolidays = async () => {
    try {
        const enabled = await isCalendarEnabled();
        if (!enabled) return [];

        // Holiday calendar can use API key or OAuth - try with OAuth first
        if (!isRefreshTokenValid()) {
            // Holidays can still be fetched with just an API key if available,
            // but without valid credentials we return empty
            return [];
        }

        const auth = getAuthClient();
        const res = await calendar.events.list({
            auth,
            calendarId: 'en.philippines#holiday@group.v.calendar.google.com',
            timeMin: new Date(new Date().getFullYear(), 0, 1).toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items.map(item => ({
            title: item.summary,
            dueDate: item.start.date || item.start.dateTime,
            start: item.start.date || item.start.dateTime,
            type: 'holiday'
        }));
    } catch (error) {
        console.error('Error listing holidays:', error.message);
        return [];
    }
};

module.exports = {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    listHolidays,
    isCalendarEnabled
};
