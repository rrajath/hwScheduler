import { TimeRange } from '../controllers/availability.controller.ts';
import { validateTimeRange } from '../util/date.util.ts';
import { getICalData } from '../util/ical.util.ts';
import { CalendarService } from './calendar.service.ts';

export class AvailabilityService {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

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

    // TODO: clientId and agentId will be used later to get the agent's work schedule and will be used to filter the calendar events

    // TODO: there's a bug here where the start time is from the start of the time range. It should be that, plus the end of any busy slots
    for (const timeRange of timeRanges) {
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
        const isOverlapping = busySlots.some((busySlot) => {
          const busyStartTime = new Date(busySlot.startTime.toString());
          const busyEndTime = new Date(busySlot.endTime.toString());
          return (
            (currentStartTime >= busyStartTime &&
              currentStartTime < busyEndTime) ||
            (currentEndTime > busyStartTime && currentEndTime <= busyEndTime) ||
            (currentStartTime <= busyStartTime && currentEndTime >= busyEndTime)
          );
        });

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

  private buildTimeRanges(timeRanges: string) {
    const timeRangesArray = timeRanges.split(',');
    const timeRangesList = timeRangesArray.map((timeRange) => {
      const [startTime, endTime] = timeRange.split('#');
      // convert to Date objects, assuming start and end are in 'YYYY-MM-DDTHH:mm:ss' format
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      validateTimeRange(startDate, endDate);
      // convert to ISO string format
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      // return the time range as an object
      const start = new Date(startIso);
      const end = new Date(endIso);

      return { start, end };
    });

    return timeRangesList;
  }

  async findAvailableSlot(
    busySlots: any[],
    duration: number,
    startTime: Date,
    endTime: Date
  ): Promise<{ start: Date; end: Date } | null> {
    // Sort busy slots by start time
    busySlots.sort((a, b) => a.startDate - b.startDate);

    let lastEndTime = startTime;

    for (const busySlot of busySlots) {
      const busyStartTime = new Date(busySlot.startDate.toString());
      const busyEndTime = new Date(busySlot.endDate.toString());

      // Check if there is a gap between the last end time and the busy start time
      if (lastEndTime < busyStartTime) {
        const availableDuration =
          (busyStartTime.getTime() - lastEndTime.getTime()) / 60000; // in minutes

        if (availableDuration >= duration) {
          return {
            start: lastEndTime,
            end: new Date(lastEndTime.getTime() + duration * 60000),
          };
        }
      }

      // Update the last end time to the maximum of the current last end time and the busy end time
      lastEndTime = new Date(
        Math.max(lastEndTime.getTime(), busyEndTime.getTime())
      );
    }

    // Check if there is available time after the last busy slot
    if (lastEndTime < endTime) {
      const availableDuration =
        (endTime.getTime() - lastEndTime.getTime()) / 60000; // in minutes

      if (availableDuration >= duration) {
        return {
          start: lastEndTime,
          end: new Date(lastEndTime.getTime() + duration * 60000),
        };
      }
    }

    return null;
  }
}
