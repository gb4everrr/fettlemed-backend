// Helper function to calculate if a doctor is available today and their shift times
// This should be added to your backend utils

const { DoctorAvailability, AvailabilityException } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate today's availability for a doctor
 * @param {number} clinicDoctorId - The clinic doctor ID
 * @param {number} clinicId - The clinic ID
 * @param {string} timezone - The clinic timezone (e.g., 'Asia/Kolkata')
 * @returns {Object} { is_available_today: boolean, start_time: string|null, end_time: string|null }
 */
async function calculateTodayAvailability(clinicDoctorId, clinicId, timezone) {
    try {
        // Get current date/time in clinic timezone
        const now = new Date();
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        
        const todayFormatted = dateFormatter.format(now);
        const parts = todayFormatted.split(', ');
        const weekday = parts[0]; // "Sunday", "Monday", etc.
        const dateParts = parts[1].split('/'); // MM/DD/YYYY
        const todayDateString = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`; // YYYY-MM-DD

        // 1. Get regular weekly availability for this weekday
        const regularAvailability = await DoctorAvailability.findAll({
            where: {
                clinic_doctor_id: clinicDoctorId,
                clinic_id: clinicId,
                weekday: weekday,
                active: true
            },
            order: [['start_time', 'ASC']]
        });

        // 2. Get today's exceptions
        const exceptions = await AvailabilityException.findAll({
            where: {
                clinic_doctor_id: clinicDoctorId,
                clinic_id: clinicId,
                date: todayDateString
            }
        });

        // 3. Build available time slots for today
        let availableSlots = [];

        // Add regular availability slots
        regularAvailability.forEach(slot => {
            availableSlots.push({
                start_time: slot.start_time,
                end_time: slot.end_time,
                is_available: true
            });
        });

        // Process exceptions (they override regular availability)
        exceptions.forEach(exception => {
            if (exception.is_available) {
                // Exception ADDS availability
                availableSlots.push({
                    start_time: exception.start_time,
                    end_time: exception.end_time,
                    is_available: true
                });
            } else {
                // Exception REMOVES availability - filter out overlapping slots
                availableSlots = availableSlots.filter(slot => {
                    // Keep slot if it doesn't overlap with the exception
                    return slot.end_time <= exception.start_time || 
                           slot.start_time >= exception.end_time;
                });
            }
        });

        // 4. Merge overlapping/adjacent slots and find earliest start, latest end
        if (availableSlots.length === 0) {
            return {
                is_available_today: false,
                start_time: null,
                end_time: null
            };
        }

        // Sort by start time
        availableSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

        // Find the earliest start time and latest end time
        const earliestStart = availableSlots[0].start_time;
        const latestEnd = availableSlots[availableSlots.length - 1].end_time;

        return {
            is_available_today: true,
            start_time: earliestStart,
            end_time: latestEnd
        };

    } catch (error) {
        console.error('[calculateTodayAvailability] Error:', error);
        return {
            is_available_today: false,
            start_time: null,
            end_time: null
        };
    }
}

module.exports = { calculateTodayAvailability };