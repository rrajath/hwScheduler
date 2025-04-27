import * as ICAL from 'ical.js';
import { getICalData } from '../util/ical.util.ts';
import { TimeSlot } from '../models/availability.model.ts';

export interface AddEventArgs {
  summary: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
}

export interface GetEventsByDateRangeArgs {
  calendar: ICAL.default.Component;
  startDate: Date;
  endDate?: Date;
}

export class CalendarService {
  async addEvent(args: AddEventArgs) {
    const { summary, startTime, endTime, description, location } = args;
    // we read from calendar just before adding an event in order to get the most up to date state
    const calendar = await getICalData();
    const event = new ICAL.default.Component(['vevent', [], []]);

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    event.updatePropertyWithValue('uid', uid);

    event.updatePropertyWithValue('summary', summary);
    if (description) {
      event.updatePropertyWithValue('description', description);
    }

    if (location) {
      event.updatePropertyWithValue('location', location);
    }

    const startDate = ICAL.default.Time.fromJSDate(startTime, true);
    const endDate = ICAL.default.Time.fromJSDate(endTime, true);

    event.updatePropertyWithValue('dtstart', startDate);
    event.updatePropertyWithValue('dtend', endDate);

    const now = ICAL.default.Time.fromJSDate(new Date(), true);
    event.updatePropertyWithValue('dtstamp', now);
    event.updatePropertyWithValue('created', now);
    calendar.addSubcomponent(event);

    console.info('>> Writing to /tmp/calendar.ics');
    Deno.writeTextFileSync('/tmp/calendar.ics', calendar.toString());
    console.info('>> Wrote to /tmp/calendar.ics');
    return calendar;
  }

  async checkAvailability(
    { clientId, agentId, startDate, endDate }: {
      clientId: string;
      agentId: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const calendar = await getICalData();
    const events = this.getAllEvents(calendar);
    const startTime = ICAL.default.Time.fromJSDate(startDate, true);
    const endTime = ICAL.default.Time.fromJSDate(endDate, true);

    const existingEvents = events.filter((event) => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate;

      return (
        (eventStart.compare(startTime) > 0 &&
          eventStart.compare(endTime) < 0) || // Event starts within range
        (eventEnd.compare(startTime) > 0 && eventEnd.compare(endTime) < 0) || // Event ends within range
        (eventStart.compare(startTime) < 0 && eventEnd.compare(endTime) > 0) // Event spans the entire range
      );
    });
    return existingEvents.length == 0;
  }

  getAllEvents(calendar: ICAL.default.Component) {
    const events = calendar.getAllSubcomponents('vevent');

    return events.map((event) => new ICAL.default.Event(event));
  }

  getEventsByDateRange(
    calendar: ICAL.default.Component,
    startDate: Date,
    endDate?: Date,
  ): ICAL.default.Event[] {
    // Get all events from the calendar
    const events = this.getAllEvents(calendar);

    // Convert start date to ICAL.Time
    const startTime = ICAL.default.Time.fromJSDate(startDate, true);

    // Convert end date to ICAL.Time if provided
    const endTime = endDate
      ? ICAL.default.Time.fromJSDate(endDate, true)
      : null;

    // Filter events based on date range
    return events.filter((event) => {
      try {
        // Get event start and end times
        const eventStart = event.startDate;
        const eventEnd = event.endDate;

        // If no end date was provided in our query
        if (!endTime) {
          // Include events that end on or after our start date
          return eventEnd.compare(startTime) >= 0;
        }

        // With both start and end dates, check if event is in range
        return (
          (eventStart.compare(startTime) >= 0 &&
            eventStart.compare(endTime) <= 0) || // Event starts within range
          (eventEnd.compare(startTime) >= 0 &&
            eventEnd.compare(endTime) <= 0) || // Event ends within range
          (eventStart.compare(startTime) < 0 && eventEnd.compare(endTime) > 0) // Event spans the entire range
        );
      } catch (error) {
        console.error('Error comparing event dates:', error);
        return false; // Skip events that cause errors
      }
    });
  }
}
