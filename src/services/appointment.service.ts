import { inMemoryDb } from '../config/db.config.ts';
import { getICalData } from '../util/ical.util.ts';
import { CalendarService } from './calendar.service.ts';
import * as ICAL from 'ical.js';

export class AppointmentService {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

  /**
   * This method retrieves all appointments for a specific client and agent.
   * It fetches the calendar data from the in-memory database,
   * extracts the events, and returns them in a structured format.
   * @param clientId - The ID of the client.
   * @param agentId- The ID of the agent.
   * @returns An array of appointment objects containing start time, end time, and summary.
   */
  async getAppointments(clientId: string, agentId: string) {
    const calendar = await getICalData();
    const events = this.calendarService.getAllEvents(calendar);

    return events.map((event) => {
      const startTime = event.startDate;
      const endTime = event.endDate;
      const summary = event.summary;

      console.info(
        `Event Summary: ${summary}, Start Time: ${startTime}, End Time: ${endTime}`
      );
      return {
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        summary,
      };
    });
  }

  /**
   * This method books an appointment by checking the availability of the time slot
   * and adding the event to the calendar if available.
   * @param data - The appointment data containing start time, end time, and title.
   * @returns A boolean indicating whether the appointment was successfully booked.
   */
  async bookAppointment(data: any) {
    console.info('Booking an appointment');
    const { startTime, endTime } = data;
    const startDate = new Date(`${startTime}Z`);
    const endDate = new Date(`${endTime}Z`);

    const title = data.title || 'New Appointment';
    const calendar = await getICalData();
    const isAvailable = this.calendarService.checkAvailability({
      calendar,
      startDate,
      endDate,
    });

    if (isAvailable) {
      const updatedCalendar = await this.calendarService.addEvent({
        title,
        startTime: startDate,
        endTime: endDate,
      });
      this.calendarService.refreshCalendar(
        data.clientId,
        data.agentId,
        updatedCalendar
      );
      return true;
    }
    return false;
  }
}
