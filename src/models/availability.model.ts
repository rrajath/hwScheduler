export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface AvailabilityQuery {
  clientId: string;
  agentId: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in minutes
}

export interface OptimalDaysQuery {
  clientId: string;
  agentId: string;
  lookAheadDays: number;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  availableMinutes: number;
  busyPercentage: number;
  availableSlots: TimeSlot[];
}
