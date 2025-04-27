import { Appointment } from '../models/appointment.model.ts';
import { inMemoryDb } from '../config/db.config.ts';

export class AppointmentRepository {
  public constructor() {
  }

  async findAppointments(clientId: string, agentId: string) {
    const record = await inMemoryDb.get(['calendar', `${clientId}#${agentId}`]);
    // const query = `
    //   SELECT * FROM appointments
    //   WHERE client_id = ? AND agent_id = ?
    //   `;

    // const result = this.db.query(query, [clientId, agentId]);
    const calendar = record.value;
    console.log('>>> calendar:', calendar);

    const appointments: string[] = [];

    // for (const row of result) {
    //   appointments.push(this.rowToAppointment(row));
    // }

    return appointments;
  }

  async createAppointment({ clientId, agentId, startTime, endTime }: {
    clientId: string;
    agentId: string;
    startTime: Date;
    endTime: Date;
  }) {
    const calendar = await inMemoryDb.get([
      'calendar',
      `${clientId}#${agentId}`,
    ]);
  }

  private rowToAppointment(row: any): Appointment {
    return {
      id: row[0],
      client_id: row[1],
      agent_id: row[2],
      created_at: new Date(row[3]),
      updated_at: new Date(row[4]),
    };
  }
}
