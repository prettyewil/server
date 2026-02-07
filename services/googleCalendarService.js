const { google } = require('googleapis');
const path = require('path');

// Assuming a service account key file is present or env vars are set
// Ideally, use GOOGLE_APPLICATION_CREDENTIALS env var pointing to the json key file
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const getAuthClient = async () => {
    // If using a service account key file
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../service-account-key.json');

    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: SCOPES,
    });

    return auth.getClient();
};

const calendar = google.calendar('v3');

/**
 * Lists the next 10 events on the user's primary calendar.
 */
const listEvents = async () => {
    try {
        const auth = await getAuthClient();
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
        console.error('Error listing calendar events:', error);
        return [];
    }
};

/**
 * Creates a new event on the primary calendar + invites attendees.
 * @param {object} task - Task object with title, dueDate, assignedTo (with email)
 */
const createEvent = async (task) => {
    try {
        const auth = await getAuthClient();

        const event = {
            summary: task.title,
            description: `Task Type: ${task.type}\nNotes: ${task.notes || 'None'}\nAssigned To: ${task.assignedTo.name} (${task.assignedTo.email})`,
            start: {
                dateTime: new Date(task.dueDate).toISOString(),
                // Default to 1 hour duration or just a specific time? 
                // Let's assume it's an all-day event or just a point in time. 
                // Tasks might be cleaner as all-day events?
                // For now, let's make it an all-day event if time is 00:00, or specific time.
                // Simpler: 1 hour duration.
            },
            end: {
                dateTime: new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
            },
            attendees: [
                { email: task.assignedTo.email },
                // { email: 'admin@dorm.com' } // Optional: invite admin
            ],
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
            sendUpdates: 'all', // Send emails
        });

        console.log('Event created: %s', res.data.htmlLink);
        return res.data.id; // Return Google Event ID
    } catch (error) {
        console.error('Error creating calendar event:', error);
        return null;
    }
};

/**
 * Deletes an event from the calendar.
 * @param {string} eventId 
 */
const deleteEvent = async (eventId) => {
    if (!eventId) return;
    try {
        const auth = await getAuthClient();
        await calendar.events.delete({
            auth,
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: eventId,
        });
        console.log('Event deleted:', eventId);
    } catch (error) {
        console.error('Error deleting calendar event:', error);
    }
};

/**
 * Lists holidays from the public holiday calendar.
 */
const listHolidays = async () => {
    try {
        const auth = await getAuthClient();
        const res = await calendar.events.list({
            auth,
            // Use 'en.philippines#holiday@group.v.calendar.google.com' for PH holidays, or just 'en.usa#holiday@group.v.calendar.google.com' etc.
            // Let's default to Philippines as inferred from currency.
            calendarId: 'en.philippines#holiday@group.v.calendar.google.com',
            timeMin: new Date(new Date().getFullYear(), 0, 1).toISOString(), // Start of current year
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items.map(item => ({
            title: item.summary,
            dueDate: item.start.date || item.start.dateTime, // Map to same field as Task for frontend simplicity? Or keep separate.
            start: item.start.date || item.start.dateTime,
            type: 'holiday'
        }));
    } catch (error) {
        console.error('Error listing holidays:', error);
        return [];
    }
};

module.exports = {
    listEvents,
    createEvent,
    deleteEvent,
    listHolidays
};
