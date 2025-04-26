import * as ICAL from 'npm:ical.js';

async function readICSFile(filepath: string) {
  try {
    const data = await Deno.readTextFile(filepath);
    const jcalData = ICAL.default.parse(data);
    return new ICAL.default.Component(jcalData);
  } catch (error) {
    console.error('Error reading data', error);
    return null;
  }
}
