import { Hono } from 'https://jsr.io/@hono/hono/4.7.7/src/hono.ts';
import { AvailabilityService } from '../services/availability.service.ts';

const availabilityController = new Hono();
const availabilityService = new AvailabilityService();

export interface TimeRange {
  start: Date;
  end: Date;
}

availabilityController.get('/', async (c) => {
  const clientId = c.req.query('clientId');
  const agentId = c.req.query('agentId');
  const timeRanges = c.req.query('timeRanges');
  const eventType = c.req.query('eventType');

  const duration = getDurationForEventType(eventType!);
  const query = {
    clientId: clientId!,
    agentId: agentId!,
    duration: Number(duration!),
    timeRangeList: timeRanges!,
  };
  const availableSlots = await availabilityService.findAvailableSlots(query);
  return c.json(availableSlots);
});

availabilityController.get('/optimal-days', async (c) => {
  const clientId = c.req.query('clientId');
  const agentId = c.req.query('agentId');
  const lookAheadDays = c.req.query('lookAheadDays');

  const lookAheadDaysValue = lookAheadDays ? Number(lookAheadDays) : 7;

  const query = {
    clientId: clientId!,
    agentId: agentId!,
    lookAheadDays: lookAheadDaysValue,
  };

  const optimalDays = await availabilityService.findOptimalDays(query);
  return c.json(optimalDays);
});

function getDurationForEventType(eventType: string) {
  switch (eventType) {
    case 'call':
      return 15; // 15 minutes
    case 'meeting':
      return 30; // 30 minutes
    case 'showing':
      return 60; // 1 hour
    default:
      return 30; // default to 30 minutes
  }
}

export { availabilityController };
