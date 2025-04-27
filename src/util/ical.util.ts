import * as ICAL from 'npm:ical.js';
// import { TimeSlot } from '../models/availability.model.ts';

// TODO: change this function to something meaningful
export async function getICalData(): Promise<ICAL.default.Component> {
  // Assumption: each agent will have a calendar. This is simplified to just one hardcoded calendar
  const filePath = 'calendar.ics';
  const icsData = await Deno.readTextFile(filePath);
  const jcalData = ICAL.default.parse(icsData);

  return new ICAL.default.Component(jcalData);
}

export function convertJCalDataToComponent(
  jcalData: any,
): ICAL.default.Component {
  return new ICAL.default.Component(jcalData);
}

/*
export async function parseICalData(filePath: string): Promise<TimeSlot[]> {
  const events = await getICalData(filePath);
  const timeSlots: TimeSlot[] = [];

  for (const eventId in events) {
    const event = events[eventId];

    // Skip non-events
    if (event.type !== 'VEVENT') continue;

    // Skip events without start or end
    if (!event.start || !event.end) continue;

    timeSlots.push({
      startTime: event.start,
      endTime: event.end,
    });
  }

  return timeSlots;
}

export async function getTimeSlots(filePath: string) {
  const icalData = await Deno.readTextFile(filePath);
  const events = ical.default.parse(icalData);
  const timeSlots: TimeSlot[] = [];

  for (const eventId in events) {
    const event = events[eventId];

    // Skip non-events
    if (event.type !== 'VEVENT') continue;

    // Skip events without start or end
    if (!event.start || !event.end) continue;

    timeSlots.push({
      startTime: event.start,
      endTime: event.end,
    });
  }

  return timeSlots;
}
*/
