import { AgentWorkHours, inMemoryDatabase } from '../config/db.config.ts';
import { TimeRange } from '../controllers/availability.controller.ts';
import { TimeSlot } from '../models/availability.model.ts';
import { getDayOfWeek, validateTimeRange } from '../util/date.util.ts';
import { getICalData } from '../util/ical.util.ts';
import { CalendarService } from './calendar.service.ts';

export class AvailabilityService {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

  /**
   * This function finds available time slots for a given client and agent.
   * It checks the agent's work schedule and the calendar events to determine
   * the available time slots.
   *
   * @param clientId - The ID of the client.
   * @param agentId - The ID of the agent.
   * @param duration - The duration of the appointment in minutes.
   * @param timeRangeList - A string representing the time ranges in the format "start|end,start|end".
   *                       Each time range is separated by a comma.
   * @returns An array of available time slots, each represented as an object with start and end properties.
   *          The start and end properties are Date objects.
   *          Example: [{ start: Date, end: Date }, ...]
   * @throws Error if the time range is invalid or if the start time is not before the end time.
   */
  async findAvailableSlots({
    clientId,
    agentId,
    duration,
    timeRangeList,
  }: {
    clientId: string;
    agentId: string;
    duration: number;
    timeRangeList: string;
  }) {
    const availableSlots = [];
    const calendar = await getICalData();

    const timeRanges = this.buildTimeRanges(timeRangeList);

    const agentWorkSchedule = (
      await inMemoryDatabase.get([
        'agentWorkSchedule',
        `${clientId}#${agentId}`,
      ])
    ).value as AgentWorkHours;

    // Adjust the time ranges to fit within the agent's work schedule
    const adjustedTimeRanges = this.getAdjustedTimeRanges(
      timeRanges,
      agentWorkSchedule
    );

    for (const timeRange of adjustedTimeRanges) {
      const startTime = new Date(timeRange.start);
      const endTime = new Date(timeRange.end);

      validateTimeRange(startTime, endTime);

      const events = this.calendarService.getEventsByDateRange(
        calendar,
        startTime,
        endTime
      );
      const busySlots = this.calendarService.getTimeSlotsForEvents(events);

      // Iterate through the time range in increments of the given duration
      let currentStartTime = startTime;

      while (currentStartTime < endTime) {
        const currentEndTime = new Date(
          currentStartTime.getTime() + duration * 60000
        );

        // Ensure the current slot does not exceed the time range
        if (currentEndTime > endTime) {
          break;
        }

        // Check if the current slot overlaps with any busy slot
        const isOverlapping = this.isOverlapping(
          busySlots,
          currentStartTime,
          currentEndTime
        );

        // If the slot is not overlapping, add it to available slots
        if (!isOverlapping) {
          availableSlots.push({
            start: currentStartTime,
            end: currentEndTime,
          });
        }

        // Move to the next slot
        currentStartTime = new Date(
          currentStartTime.getTime() + duration * 60000
        );
      }
    }

    return availableSlots;
  }

  /**
   * This function adjusts the time ranges to fit within the agent's work schedule.
   * It iterates through the time ranges and checks if they fall within the agent's work hours.
   * If a time range overlaps with the work hours, it is adjusted to fit within the work hours.
   * If a time range does not overlap with the work hours, it is skipped.
   *
   * @param timeRanges - An array of time ranges, each represented as an object with start and end properties.
   * @param agentWorkSchedule - The work schedule of the agent, represented as an object with days of the week as keys and work hours as values.
   *                           Example: { Monday: { startTime: '09:00', endTime: '17:00' }, ... }
   * @throws Error if the time range is invalid or if the start time is not before the end time.
   * @returns An array of adjusted time ranges, each represented as an object with start and end properties.
   */
  private getAdjustedTimeRanges(
    timeRanges: TimeRange[],
    agentWorkSchedule: AgentWorkHours
  ): TimeRange[] {
    const adjustedTimeRanges: TimeRange[] = [];

    for (const timeRange of timeRanges) {
      const currentDate = new Date(timeRange.start);
      const endDate = new Date(timeRange.end);

      while (currentDate <= endDate) {
        const dayOfWeek = getDayOfWeek(currentDate.getDay()); // Get the day of the week (0-6, where 0 is Sunday)
        const workSchedule = agentWorkSchedule.schedule[`${dayOfWeek}`]; // Get the work schedule for the day of the week

        if (workSchedule) {
          const { workStartTime, workEndTime } = this.getWorkdayTimeRange(
            currentDate,
            workSchedule
          );

          // Adjust the time range to fit within the work schedule for the current day
          const adjustedStart =
            new Date(timeRange.start) < workStartTime
              ? workStartTime
              : new Date(timeRange.start);
          const adjustedEnd =
            new Date(timeRange.end) > workEndTime
              ? workEndTime
              : new Date(timeRange.end);

          if (adjustedStart < adjustedEnd) {
            adjustedTimeRanges.push({ start: adjustedStart, end: adjustedEnd });
          }
        }

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setUTCHours(0, 0, 0, 0); // Reset to the start of the next day
      }
    }

    return adjustedTimeRanges;
  }

  /**
   * This function finds the optimal days for scheduling appointments.
   * It checks the agent's work schedule and the calendar events to determine
   * the days with the least number of busy slots. It sorts the days by the number of busy slots and
   * returns the top 4 days with the least number of busy slots.
   *
   * @param clientId - The ID of the client.
   * @param agentId - The ID of the agent.
   * @param lookAheadDays - The number of days to look ahead for scheduling.
   * @returns An array of optimal days, each represented as a string in 'YYYY-MM-DD' format.
   */
  async findOptimalDays(query: {
    clientId: string;
    agentId: string;
    lookAheadDays: number;
  }) {
    const { clientId, agentId, lookAheadDays } = query;

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + lookAheadDays);

    const calendar = await getICalData();

    const agentWorkSchedule = (
      await inMemoryDatabase.get([
        'agentWorkSchedule',
        `${clientId}#${agentId}`,
      ])
    ).value as AgentWorkHours;

    const dayBusyCounts: Record<string, number> = {};

    for (let day = 0; day < lookAheadDays; day++) {
      const date = new Date();
      date.setDate(now.getDate() + day);
      const dayOfWeek = getDayOfWeek(date.getDay());
      const workSchedule = agentWorkSchedule.schedule[`${dayOfWeek}`];

      if (!workSchedule) {
        // If no work schedule exists for this day, skip it
        continue;
      }

      const { workStartTime, workEndTime } = this.getWorkdayTimeRange(
        date,
        workSchedule
      );

      const dayEvents = this.calendarService.getEventsByDateRange(
        calendar,
        workStartTime,
        workEndTime
      );

      dayBusyCounts[date.toISOString().split('T')[0]] = dayEvents.length;
    }

    const sortedDays = Object.entries(dayBusyCounts)
      .sort(([, countA], [, countB]) => countA - countB)
      .map(([day]) => day)
      .slice(0, 4);

    return sortedDays;
  }

  /**
   * This function gets the workday time range for a given date and work schedule.
   * It converts the start and end times from the work schedule to Date objects
   * and returns them as an object.
   *
   * @param date - The date for which to get the workday time range.
   * @param workSchedule - The work schedule of the agent, represented as an object with start and end times.
   * @returns An object containing the start and end times of the workday as Date objects.
   */
  private getWorkdayTimeRange(
    date: Date,
    workSchedule: { startTime: string; endTime: string }
  ) {
    const workStartTime = new Date(date);
    const workEndTime = new Date(date);

    const [workStartHour, workStartMinute] = workSchedule.startTime
      .split(':')
      .map(Number);
    const [workEndHour, workEndMinute] = workSchedule.endTime
      .split(':')
      .map(Number);

    workStartTime.setUTCHours(workStartHour, workStartMinute, 0, 0);
    workEndTime.setUTCHours(workEndHour, workEndMinute, 0, 0);

    return { workStartTime, workEndTime };
  }

  /**
   * This function checks if the current time slot overlaps with any busy slots.
   * It iterates through the busy slots and checks if the current start and end times
   * fall within any of the busy slots.
   *
   * @param busySlots - An array of busy slots, each represented as an object with start and end properties.
   * @param currentStartTime - The start time of the current slot.
   * @param currentEndTime - The end time of the current slot.
   * @returns true if the current slot overlaps with any busy slot, false otherwise.
   */
  private isOverlapping(
    busySlots: TimeSlot[],
    currentStartTime: Date,
    currentEndTime: Date
  ) {
    return busySlots.some((busySlot) => {
      const busyStartTime = new Date(busySlot.startTime.toString());
      const busyEndTime = new Date(busySlot.endTime.toString());
      return (
        (currentStartTime >= busyStartTime && currentStartTime < busyEndTime) ||
        (currentEndTime > busyStartTime && currentEndTime <= busyEndTime) ||
        (currentStartTime <= busyStartTime && currentEndTime >= busyEndTime)
      );
    });
  }

  /**
   * This function builds an array of time ranges from a string input.
   * It splits the string by commas to get individual time ranges,
   * then splits each time range by the pipe character to get the start and end times.
   * It converts the start and end times to Date objects and returns them as an array of TimeRange objects.
   *
   * @param timeRanges - A string representing the time ranges in the format "start|end,start|end".
   * @returns An array of time ranges, each represented as an object with start and end properties.
   */
  private buildTimeRanges(timeRanges: string): TimeRange[] {
    const timeRangesArray = timeRanges.split(',');
    const timeRangesList = timeRangesArray.map((timeRange) => {
      const [startTime, endTime] = timeRange.split('|');
      // convert to Date objects, assuming start and end are in 'YYYY-MM-DDTHH:mm:ss' format
      const startDate = this.parseDate(startTime);
      const endDate = this.parseDate(endTime);

      validateTimeRange(startDate, endDate);
      // convert to ISO string format
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      // return the time range as an object
      const start = new Date(startIso);
      const end = new Date(endIso);

      return { start, end } as TimeRange;
    });

    return timeRangesList;
  }

  /**
   * This function parses a date string and converts it to a Date object.
   * It also adjusts the time zone offset to UTC.
   *
   * @param dateString - The date string to parse.
   * @returns A Date object representing the parsed date.
   */
  private parseDate(dateString: string): Date {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date;
  }
}
