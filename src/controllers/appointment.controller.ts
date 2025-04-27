import { Hono } from '@hono/hono';
import { AppointmentService } from '../services/appointment.service.ts';

const appointmentService = new AppointmentService();
const appointmentController = new Hono();

appointmentController.get('/', async (c) => {
  // TODO: this should get passed in the header instead of query params
  const clientId = c.req.query('clientId');
  const agentId = c.req.query('agentId');

  if (!clientId || !agentId) {
    return c.json({ error: 'clientId and agentId are required' }, 400);
  }

  const appointments = await appointmentService.getAppointments(
    clientId,
    agentId,
  );
  return c.json(appointments);
});

// API to book an appointment if there's a free time slot available in an agent's calendar
appointmentController.post('/', async (c) => {
  const data = await c.req.json();
  const scheduled = await appointmentService.bookAppointment(data);
  if (!scheduled) {
    return c.json({
      success: false,
      message: 'Meeting conflict!',
    }, 400);
  }
  return c.json({
    success: true,
    message: 'Appointment scheduled',
  }, 201);
});

export { appointmentController };
