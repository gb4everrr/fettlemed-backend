const { AppointmentSlot, AvailabilityException } = require('../models');
const { Op } = require('sequelize');

const generateSlots = async ({ doctor_id, clinic_id, date, start_time, end_time }) => {
  const existing = await AppointmentSlot.findOne({ where: { doctor_id, clinic_id, date, start_time } });
  if (!existing) {
    const exception = await AvailabilityException.findOne({ where: { doctor_id, clinic_id, date, is_available: false } });
    if (!exception) {
      await AppointmentSlot.create({ doctor_id, clinic_id, date, start_time, end_time });
    }
  }
};

const removeSlotsByDate = async ({ doctor_id, clinic_id, date }) => {
  await AppointmentSlot.destroy({ where: { doctor_id, clinic_id, date, is_booked: false } });
};

const generateSlotsFor3Months = async ({ doctor_id, clinic_id, day_of_week, start_time, end_time }) => {
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const targetDay = dayMap[day_of_week];

  const today = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === targetDay) {
      const dateStr = d.toISOString().split('T')[0];
      await generateSlots({ doctor_id, clinic_id, date: dateStr, start_time, end_time });
    }
  }
};

module.exports = { generateSlots, removeSlotsByDate, generateSlotsFor3Months };