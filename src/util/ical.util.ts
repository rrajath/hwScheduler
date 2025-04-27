import * as ICAL from 'npm:ical.js';

export async function getICalData(): Promise<ICAL.default.Component> {
  // Assumption: each agent will have their own calendar. This is simplified to just one hardcoded calendar
  const filePath = 'calendar.ics';
  const icsData = await Deno.readTextFile(filePath);
  const jcalData = ICAL.default.parse(icsData);

  return new ICAL.default.Component(jcalData);
}
