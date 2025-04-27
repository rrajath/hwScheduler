import * as ICAL from 'ical.js';
import { getICalData } from '../util/ical.util.ts';
import { TimeSlot } from '../models/availability.model.ts';
import { inMemoryDatabase } from '../config/db.config.ts';

export interface AddEventArgs {
  title: string;
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
  /**
   * This method adds an event to the calendar.
   * It takes the event details as arguments and updates the calendar file.
   * It also updates the in-memory database with the new calendar data.
   *
   *
   * @param args - The event details to be added.
   * @param args.title - The title of the event.
   * @param args.startTime - The start time of the event.
   * @param args.endTime - The end time of the event.
   * @param args.description - The description of the event.
   * @param args.location - The location of the event.
   * @throws Error if the calendar file cannot be read or written.
   * @returns The updated calendar component.
   */
  async addEvent(args: AddEventArgs) {
    const { title, startTime, endTime, description, location } = args;
    // we read from calendar just before adding an event in order to get the most up to date state
    const calendar = await getICalData();
    const event = new ICAL.default.Component(['vevent', [], []]);

    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    event.updatePropertyWithValue('uid', uid);

    event.updatePropertyWithValue('summary', title);
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

    Deno.writeTextFileSync('./calendar.ics', calendar.toString());
    console.info("Updated agent's calendar");

    return calendar;
  }

  /**
   * This method checks if a given time range is available in the calendar.
   * It takes the calendar, start date, and end date as arguments.
   * It returns true if the time range is available, false otherwise.
   * @param calendar - The calendar component to check.
   * @param startDate - The start date of the time range.
   * @param endDate - The end date of the time range.

   * @returns true if the time range is available, false otherwise.
   */
  checkAvailability({
    calendar,
    startDate,
    endDate,
  }: {
    calendar: ICAL.default.Component;
    startDate: Date;
    endDate: Date;
  }) {
    const events = this.getAllEvents(calendar);
    const startTime = ICAL.default.Time.fromJSDate(startDate, true);
    const endTime = ICAL.default.Time.fromJSDate(endDate, true);

    const existingEvents = events.filter((event) => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate;

      return (
        (eventStart.compare(startTime) >= 0 &&
          eventStart.compare(endTime) <= 0) || // Event starts within range
        (eventEnd.compare(startTime) >= 0 && eventEnd.compare(endTime) <= 0) || // Event ends within range
        (eventStart.compare(startTime) <= 0 && eventEnd.compare(endTime) >= 0) // Event spans the entire range
      );
    });

    return existingEvents.length == 0;
  }

  /**
   * This method retrieves all events from the calendar.
   * It takes the calendar component as an argument and returns an array of events.
   * @param calendar - The calendar component to retrieve events from.
   * @returns An array of events.
   */
  getAllEvents(calendar: ICAL.default.Component) {
    const events = calendar.getAllSubcomponents('vevent');

    return events.map((event) => new ICAL.default.Event(event));
  }

  /**
   * This method retrieves events from the calendar within a specified date range.
   * It takes the calendar, start date, and end date as arguments.
   * It returns an array of events that fall within the specified date range.
   * @param calendar - The calendar component to retrieve events from.
   * @param startDate - The start date of the date range.
   * @param endDate - The end date of the date range (optional).
   * @returns An array of events within the specified date range.
   */
  getEventsByDateRange(
    calendar: ICAL.default.Component,
    startDate: Date,
    endDate?: Date
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

  /**
   * This method refreshes the calendar in the in-memory database.
   * It takes the client ID, agent ID, and updated calendar as arguments.
   * @param clientId - The client ID.
   * @param agentId - The agent ID.
   * @param calendar - The updated calendar component.
   */
  async refreshCalendar(
    clientId: string,
    agentId: string,
    calendar: ICAL.default.Component
  ) {
    await inMemoryDatabase.set(
      ['calendar', `${clientId}#${agentId}`],
      calendar
    );
  }

  /**
   * This method retrieves time slots for a list of events.
   * It takes an array of events as an argument and returns an array of time slots.
   * @param events - The array of events to retrieve time slots from.
   * @returns An array of time slots for the events.
   */
  getTimeSlotsForEvents(events: ICAL.default.Event[]): TimeSlot[] {
    const timeSlots: TimeSlot[] = [];
    events.forEach((event) => {
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();
      timeSlots.push({
        startTime: startDate,
        endTime: endDate,
      });
    });
    return timeSlots;
  }
}
