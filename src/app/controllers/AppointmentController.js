import { isBefore, subHours } from 'date-fns';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

import CreateAppointmentService from '../services/CreateAppointmentService';

class AppointmentController {
  async index(req, res) {
    const page = req.query.page || 1;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'url', 'path'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const { provider_id, date } = req.body;

    const appointment = await CreateAppointmentService.run({
      provider_id,
      user_id: req.userId,
      date,
    });

    /**
     * Return json with the created appointment
     */
    return res.json(appointment);
  }

  async delete(req, res) {
    /**
     * Get appointment from database based on param ID
     */
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    /**
     * Check if user is the owner of the appointment
     */
    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment",
      });
    }

    /**
     * Check if the appointment is not in the next two hours
     */
    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res
        .status(401)
        .json({ error: 'You can only cancel appointments 2 hours in advance' });
    }

    /**
     * Check if the appointment was not previously cancelled
     */
    if (appointment.canceled_at) {
      return res
        .status(401)
        .json({ error: 'This appointment was already cancelled' });
    }

    /**
     * Save the actual time to the canceled_at field in the database
     */
    appointment.canceled_at = new Date();

    const { id, date, canceled_at, provider, user } = await appointment.save();

    /**
     * Send an email to the provider after cancelation of the appointment
     */
    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json({
      id,
      date,
      canceled_at,
      provider,
      user,
    });
  }
}

export default new AppointmentController();
