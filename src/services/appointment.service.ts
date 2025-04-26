import Log from '../logging/logger.ts';

export class AppointmentService {
  public bookAppointment() {
    Log.info('Booking an appointment');
  }

  public queryAppointments() {
    Log.info('Querying appointments');
  }
}
