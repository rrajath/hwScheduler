export function validateTimeRange(startTime: Date, endTime: Date) {
  // Check if the time range is valid
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error('Invalid date format');
  }

  // Check if the start time is before the end time
  if (startTime >= endTime) {
    throw new Error('Start date must be before end date');
  }
}
