import Log from '../logging/logger.ts';
import { AppointmentRepository } from '../repositories/appointment.repository.ts';
import { CalendarService } from './calendar.service.ts';

export class AppointmentService {
  private appointmentRepository: AppointmentRepository;
  private calendarService: CalendarService;

  constructor() {
    this.appointmentRepository = new AppointmentRepository();
    this.calendarService = new CalendarService();
  }

  async getAppointments(clientId: string, agentId: string) {
    return await this.appointmentRepository.findAppointments(clientId, agentId);
  }

  async bookAppointment(data: any) {
    Log.info('Booking an appointment');
    const { clientId, agentId, startTime, endTime } = data;
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const isAvailable = await this.calendarService.checkAvailability({
      clientId,
      agentId,
      startDate,
      endDate,
    });

    console.log('>> is appointment available?', isAvailable);
    if (isAvailable) {
      await this.calendarService.addEvent({
        summary: 'New House Scheduling',
        startTime: startDate,
        endTime: endDate,
      });
      return true;
    }
    return false;
  }

  public queryAppointments() {
    Log.info('Querying appointments');
  }
}
