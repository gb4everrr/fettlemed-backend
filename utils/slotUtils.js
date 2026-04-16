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

// Returns "YYYY-MM-DD" for a UTC Date object interpreted in the given IANA timezone.
const toClinicDateString = (utcDate, clinicTimezone) => {
  return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD natively
    timeZone: clinicTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
};

// Returns the day-of-week index (0=Sunday … 6=Saturday) in the clinic's timezone.
const getClinicDayOfWeek = (utcDate, clinicTimezone) => {
  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTimezone,
    weekday: 'short',
  }).format(utcDate);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayStr);
};

const generateSlotsFor3Months = async ({ doctor_id, clinic_id, day_of_week, start_time, end_time, clinicTimezone }) => {
  const tz = clinicTimezone || 'Asia/Kolkata';
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const targetDay = dayMap[day_of_week];

  const today = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Use clinic timezone to determine both the weekday and the YYYY-MM-DD date string
    if (getClinicDayOfWeek(d, tz) === targetDay) {
      const dateStr = toClinicDateString(d, tz);
      await generateSlots({ doctor_id, clinic_id, date: dateStr, start_time, end_time });
    }
  }
};

module.exports = { generateSlots, removeSlotsByDate, generateSlotsFor3Months };