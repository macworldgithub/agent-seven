import { google } from 'googleapis';

export async function calendarListEvents(accessToken: string, input: { timeMin?: string, timeMax?: string, maxResults?: number }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const timeMin = input.timeMin || new Date().toISOString();
  const timeMax = input.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    maxResults: input.maxResults || 20,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return (res.data.items || []).map(event => ({
    eventId: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    attendees: event.attendees?.map(a => a.email),
    location: event.location,
    hangoutLink: event.hangoutLink
  }));
}

export async function calendarGetEvent(accessToken: string, input: { eventId: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.get({
    calendarId: 'primary',
    eventId: input.eventId
  });

  return res.data;
}

export async function calendarCreateEvent(accessToken: string, input: { summary: string, description?: string, start: string, end: string, timeZone?: string, attendees?: string[] }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const requestBody: any = {
    summary: input.summary,
    description: input.description,
    start: input.timeZone ? { dateTime: new Date(input.start).toISOString(), timeZone: input.timeZone } : { dateTime: new Date(input.start).toISOString() },
    end: input.timeZone ? { dateTime: new Date(input.end).toISOString(), timeZone: input.timeZone } : { dateTime: new Date(input.end).toISOString() }
  };

  if (input.attendees && input.attendees.length > 0) {
    requestBody.attendees = input.attendees.map(email => ({ email }));
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody
  });

  return {
    eventId: res.data.id,
    summary: res.data.summary,
    start: res.data.start?.dateTime || res.data.start?.date,
    end: res.data.end?.dateTime || res.data.end?.date,
    htmlLink: res.data.htmlLink
  };
}

export async function calendarUpdateEvent(accessToken: string, input: { eventId: string, summary?: string, description?: string, start?: string, end?: string, timeZone?: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  const requestBody: any = {};
  if (input.summary) requestBody.summary = input.summary;
  if (input.description) requestBody.description = input.description;
  if (input.start) requestBody.start = input.timeZone ? { dateTime: new Date(input.start).toISOString(), timeZone: input.timeZone } : { dateTime: new Date(input.start).toISOString() };
  if (input.end) requestBody.end = input.timeZone ? { dateTime: new Date(input.end).toISOString(), timeZone: input.timeZone } : { dateTime: new Date(input.end).toISOString() };

  const res = await calendar.events.patch({
    calendarId: 'primary',
    eventId: input.eventId,
    requestBody
  });

  return res.data;
}

export async function calendarDeleteEvent(accessToken: string, input: { eventId: string }): Promise<any> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: input.eventId
  });

  return { success: true, eventId: input.eventId };
}
