const { google } = require('googleapis');

// OAuth2 credentials from environment
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

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
 */
const listHolidays = async () => {
    try {
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
    listHolidays
};
