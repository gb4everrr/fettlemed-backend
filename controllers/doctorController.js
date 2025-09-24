const { Appointment, AppointmentSlot, ClinicPatient, User, Invoice, InvoiceService, DoctorProfile,  ConsultationNote, Prescription, VitalsEntry, VitalsRecordedValue, ClinicVitalConfig  } = require('../models');
const { Op } = require('sequelize');
const { ClinicDoctor, Clinic } = require('../models');
const { DoctorAvailability, AvailabilityException } = require('../models');
const { isDoctorOfClinic } = require('../utils/authorization');




exports.getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Find all clinics the doctor is associated with
    const clinicAssociations = await ClinicDoctor.findAll({
      where: { global_doctor_id: doctorId, active: true }
    });

    const clinicIds = clinicAssociations.map(row => row.clinic_id);

    // Fetch all appointments for the doctor at associated clinics
    const appointments = await Appointment.findAll({
      where: {
        doctor_id: doctorId,
        clinic_id: { [Op.in]: clinicIds }
      },
      include: [AppointmentSlot]
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAssociatedClinics = async (req, res) => {
  try {
    const associations = await ClinicDoctor.findAll({
      where: { global_doctor_id: req.user.id, active: true },
      include: [{ model: Clinic, attributes: ['id', 'name', 'address', 'email', 'phone'] }]
    });

    const clinics = associations.map(a => a.Clinic);
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAvailability = async (req, res) => {
  const { clinic_id, day_of_week, start_time, end_time } = req.body;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const entry = await DoctorAvailability.create({
      global_doctor_id: req.user.id,
      clinic_id,
      day_of_week,
      start_time,
      end_time
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const availabilities = await DoctorAvailability.findAll({
      where: { global_doctor_id: req.user.id, clinic_id }
    });

    res.json(availabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Similar for exceptions
exports.createAvailabilityException = async (req, res) => {
  const { clinic_id, date } = req.body;
  try {
    if (!await isDoctorOfClinic(req.user.id, clinic_id))
      return res.status(403).json({ error: 'Unauthorized clinic' });

    const entry = await AvailabilityException.create({
      global_doctor_id: req.user.id,
      clinic_id,
      date
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const doctor = await User.findByPk(doctorId, {
            attributes: ['first_name', 'last_name']
        });

        if (!doctor) {
            return res.status(404).json({ error: 'Doctor user not found.' });
        }

        // 1. Find all active clinic associations for the doctor
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            include: [{
                model: Clinic,
                as: 'Clinic', // THIS IS THE FIX: Added the alias to match the association
                attributes: ['id', 'name', 'address']
            }]
        });

        if (!clinicAssociations || clinicAssociations.length === 0) {
            return res.json({
                clinics: [],
                upcomingAppointmentsCount: 0,
                uniquePatientsCount: 0
            });
        }

        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);
        const clinics = clinicAssociations.map(a => a.Clinic);

        // 2. Fetch upcoming appointments for this doctor across all their clinics
        const upcomingAppointments = await Appointment.findAll({
            where: {
                clinic_doctor_id: {
                    [Op.in]: clinicDoctorIds
                },
                // NOTE: This logic assumes you have 'appointment_date' and 'status' fields.
                // Please adjust if your schema is different.
                // appointment_date: { [Op.gte]: new Date() },
                // status: 'scheduled'
            },
            attributes: ['clinic_patient_id'] // Only need patient ID for counting
        });

        const upcomingAppointmentsCount = upcomingAppointments.length;

        // 3. Count unique patients from those appointments
        const uniquePatientIds = [...new Set(upcomingAppointments.map(a => a.clinic_patient_id))];
        const uniquePatientsCount = uniquePatientIds.length;

        res.json({
            clinics,
            upcomingAppointmentsCount,
            uniquePatientsCount
        });

    } catch (err) {
        console.error('Error fetching doctor dashboard stats:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data.' });
    }
};

exports.getUnifiedAvailability = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // 1. Get all clinic associations (ClinicDoctor records)
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            include: [{
                model: Clinic,
                as: 'Clinic',
                attributes: ['id', 'name']
            }]
        });

        if (!clinicAssociations || clinicAssociations.length === 0) {
            return res.json({
                clinics: [],
                availability: [],
                exceptions: []
            });
        }
        
        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);

        // 2. Get all availability records for this doctor
        const availability = await DoctorAvailability.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds }, active: true }
        });

        // 3. Get all exception records for this doctor
        const exceptions = await AvailabilityException.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds } }
        });

        // Map clinic associations to a simpler format for the frontend
        const clinics = clinicAssociations.map(ca => ({
            clinic_doctor_id: ca.id,
            clinic_id: ca.Clinic.id,
            clinic_name: ca.Clinic.name
        }));

        res.json({ clinics, availability, exceptions });

    } catch (err) {
        console.error('Error fetching unified availability:', err);
        res.status(500).json({ error: 'Failed to fetch availability data.' });
    }
};

exports.getAssociatedClinicsDetails = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const associations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId },
            include: [{
                model: Clinic,
                as: 'Clinic',
                attributes: ['id', 'name', 'address', 'email', 'phone']
            }],
            order: [['active', 'DESC'], ['started_date', 'DESC']]
        });

        const detailedClinics = associations.map(a => ({
            clinic_doctor_id: a.id,
            clinic: a.Clinic,
            specialization: a.specialization,
            started_date: a.started_date,
            active: a.active
        }));
        
        res.json(detailedClinics);

    } catch (err) {
        console.error('Error fetching associated clinic details:', err);
        res.status(500).json({ error: 'Failed to fetch clinic details.' });
    }
};

exports.getDetailedAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // Find all clinic associations for the logged-in doctor
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            attributes: ['id']
        });
        
        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);

        if (clinicDoctorIds.length === 0) {
            return res.json([]);
        }

        // Fetch all appointments linked to these clinic-doctor associations
        const appointments = await Appointment.findAll({
            where: {
                clinic_doctor_id: {
                    [Op.in]: clinicDoctorIds
                }
            },
            include: [
                {
                    model: ClinicPatient,
                    as: 'patient',
                    attributes: ['first_name', 'last_name']
                },
                {
                    model: AppointmentSlot,
                    as: 'appointment_slot',
                    attributes: ['start_time', 'end_time']
                },
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['name']
                }
            ],
            order: [['datetime_start', 'DESC']]
        });
        
        // Format appointments with proper UTC ISO strings
        const formattedAppointments = appointments.map(appt => {
            const plainAppt = appt.toJSON();
            
            // Ensure all datetime fields are properly formatted as UTC ISO strings
            const formatToISO = (dateValue) => {
                if (!dateValue) return null;
                const date = new Date(dateValue);
                return isNaN(date.getTime()) ? null : date.toISOString();
            };
            
            return {
                ...plainAppt,
                // Main appointment datetime fields
                datetime_start: formatToISO(plainAppt.datetime_start),
                datetime_end: formatToISO(plainAppt.datetime_end),
                
                // Appointment slot datetime fields (if they exist)
                appointment_slot: plainAppt.appointment_slot ? {
                    ...plainAppt.appointment_slot,
                    start_time: formatToISO(plainAppt.appointment_slot.start_time),
                    end_time: formatToISO(plainAppt.appointment_slot.end_time)
                } : null
            };
        });
        
        res.json(formattedAppointments);

    } catch (err) {
        console.error('Error fetching detailed appointments:', err);
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
};

exports.getDoctorPatientsDetails = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // 1. Find all active clinic associations for the doctor
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            attributes: ['id', 'clinic_id'],
            include: [{ model: Clinic, as: 'Clinic', attributes: ['name'] }]
        });

        if (!clinicAssociations || clinicAssociations.length === 0) {
            return res.json([]);
        }

        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);
        const clinicIds = clinicAssociations.map(ca => ca.clinic_id);
        const clinicMap = clinicAssociations.reduce((map, ca) => {
            map[ca.clinic_id] = ca.Clinic.name;
            return map;
        }, {});

        // 2. Get all unique patients the doctor has had appointments with
        const appointments = await Appointment.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds } },
            attributes: ['clinic_patient_id', 'status', 'datetime_start'],
            raw: true
        });

        if (!appointments || appointments.length === 0) {
            return res.json([]);
        }

        const patientIds = [...new Set(appointments.map(a => a.clinic_patient_id))];

        // 3. Fetch patient details
        const patients = await ClinicPatient.findAll({
            where: { id: { [Op.in]: patientIds } }
        });

        // 4. Process the data to aggregate appointment stats for each patient
        const patientDetails = patients.map(patient => {
            const patientAppointments = appointments.filter(a => a.clinic_patient_id === patient.id);
            
            const completedAppointments = patientAppointments.filter(a => a.status === 1).length;
            const upcomingAppointments = patientAppointments.some(a => a.status === 0 && new Date(a.datetime_start) > new Date());
            
            return {
                id: patient.id,
                firstName: patient.first_name,
                lastName: patient.last_name,
                email: patient.email,
                phone: patient.phone_number,
                clinicName: clinicMap[patient.clinic_id] || 'N/A',
                completedAppointments,
                hasUpcomingAppointment: upcomingAppointments,
            };
        });

        res.json(patientDetails);

    } catch (err) {
        console.error('Error fetching doctor patients details:', err);
        res.status(500).json({ error: 'Failed to fetch patient data.' });
    }
};

exports.getDoctorInvoices = async (req, res) => {
    try {
        const doctorId = req.user.id; // This is the global_doctor_id

        // 1. Find all clinic-specific doctor profiles for the logged-in user
        const clinicDoctorProfiles = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            attributes: ['id'] // We only need the primary key of the clinic_doctor table
        });

        if (!clinicDoctorProfiles || clinicDoctorProfiles.length === 0) {
            return res.json([]);
        }

        // This is an array of the doctor's IDs at each clinic, e.g., [1, 5, 12]
        const clinicDoctorIds = clinicDoctorProfiles.map(cdp => cdp.id);

        // 2. Find all appointments associated with these specific clinic-doctor profiles
        const doctorAppointments = await Appointment.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds } },
            attributes: ['id'] // We only need the appointment IDs
        });

        if (!doctorAppointments || doctorAppointments.length === 0) {
            return res.json([]);
        }

        const appointmentIds = doctorAppointments.map(app => app.id);

        // 3. Find all InvoiceService entries linked to those appointments
        const invoiceServices = await InvoiceService.findAll({
            where: { appointment_id: { [Op.in]: appointmentIds } },
            attributes: ['invoice_id']
        });

        if (!invoiceServices || invoiceServices.length === 0) {
            return res.json([]);
        }

        // Get a unique list of invoice IDs
        const invoiceIds = [...new Set(invoiceServices.map(is => is.invoice_id))];

        // 4. Finally, fetch the full details for those specific invoices
        const invoices = await Invoice.findAll({
            where: {
                id: { [Op.in]: invoiceIds }
            },
            include: [
                { model: Clinic, as: 'clinic', attributes: ['name'] },
                { model: ClinicPatient, as: 'patient', attributes: ['first_name', 'last_name'] },
                { model: InvoiceService, as: 'services', attributes: ['id'] }
            ],
            order: [['invoice_date', 'DESC']]
        });
        
        // 5. Format the data for the frontend
        const formattedInvoices = invoices.map(invoice => ({
            id: invoice.id,
            invoice_date: invoice.invoice_date,
            total_amount: invoice.total_amount,
            clinicName: invoice.clinic?.name || 'N/A',
            patientName: `${invoice.patient?.first_name || 'N/A'} ${invoice.patient?.last_name || ''}`,
            serviceCount: invoice.services?.length || 0
        }));

        res.json(formattedInvoices);

    } catch (err) {
        console.error('Error fetching doctor invoices:', err);
        res.status(500).json({ error: 'Failed to fetch invoice data.' });
    }
};

exports.getDoctorProfile = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const user = await User.findByPk(doctorId, {
            include: [{
                model: DoctorProfile,
                as: 'doctorProfile',
                attributes: ['medical_reg_no', 'specialization']
            }],
            attributes: ['first_name', 'last_name', 'email', 'phone_number']
        });

        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        
        // Combine the user and profile data into a single flat object for the frontend
        const profileData = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            medical_reg_no: user.doctorProfile?.medical_reg_no || '',
            specialization: user.doctorProfile?.specialization || ''
        };
        
        res.json(profileData);
    } catch (err) {
        console.error('Error fetching doctor profile:', err);
        res.status(500).json({ error: 'Failed to fetch profile data.' });
    }
};

exports.updateDoctorProfile = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { first_name, last_name, phone_number, medical_reg_no, specialization } = req.body;

        // Step 1: Update the core user details in the User table
        await User.update({ first_name, last_name, phone_number }, {
            where: { id: doctorId }
        });

        // Step 2: Update or Create the professional details in the DoctorProfile table
        const [doctorProfile, created] = await DoctorProfile.findOrCreate({
            where: { user_id: doctorId },
            defaults: { medical_reg_no, specialization }
        });

        if (!created) {
            // If the profile already existed, update its fields
            doctorProfile.medical_reg_no = medical_reg_no;
            doctorProfile.specialization = specialization;
            await doctorProfile.save();
        }

        // Fetch the newly updated full profile to send back a consistent response
        const user = await User.findByPk(doctorId, {
             include: [{
                model: DoctorProfile,
                as: 'doctorProfile',
                attributes: ['medical_reg_no', 'specialization']
            }],
            attributes: ['first_name', 'last_name', 'email', 'phone_number']
        });

        const updatedProfileData = {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            medical_reg_no: user.doctorProfile?.medical_reg_no || '',
            specialization: user.doctorProfile?.specialization || ''
        };

        res.json(updatedProfileData);

    } catch (err) {
        console.error('Error updating doctor profile:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
};

exports.getDoctorCalendarData = async (req, res) => {
    try {
        const doctorId = req.user.id;

        // 1. Find all active clinic-doctor associations
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            attributes: ['id']
        });

        if (!clinicAssociations || clinicAssociations.length === 0) {
            return res.json({ appointments: [], availability: [], exceptions: [] });
        }

        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);

        // 2. Fetch all scheduled appointments
        const appointments = await Appointment.findAll({
            where: {
                clinic_doctor_id: { [Op.in]: clinicDoctorIds },
                status: 0 // Assuming 0 is 'scheduled'
            },
            include: [
                {
                    model: Clinic,
                    as: 'clinic',
                    attributes: ['name'] // Specifically get the clinic's name
                },
                {
                    model: ClinicPatient,
                    as: 'patient',
                    attributes: ['first_name', 'last_name']
                }
            ]
        });

        // 3. Fetch all recurring availability
        const availability = await DoctorAvailability.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds }, active: true }
        });

        // 4. Fetch all availability exceptions
        const exceptions = await AvailabilityException.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds } }
        });

        res.json({ appointments, availability, exceptions });

    } catch (err) {
        console.error('Error fetching doctor calendar data:', err);
        res.status(500).json({ error: 'Failed to fetch calendar data.' });
    }
};

exports.getPatientDetailsForDoctor = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const clinicPatientId = parseInt(req.params.patientId);

        // Security Check
        const clinicDoctorProfiles = await ClinicDoctor.findAll({ where: { global_doctor_id: doctorId, active: true }, attributes: ['id'] });
        const clinicDoctorIds = clinicDoctorProfiles.map(p => p.id);

        // 1. Fetch the patient's basic details first
        const patient = await ClinicPatient.findByPk(clinicPatientId);
        if (!patient) {
            return res.status(404).json({ error: "Patient not found." });
        }

        // 2. Fetch all appointments this doctor has had with the patient, including all related clinical data
        const appointments = await Appointment.findAll({
            where: {
                clinic_patient_id: clinicPatientId,
                clinic_doctor_id: { [Op.in]: clinicDoctorIds }
            },
            include: [
                { model: Clinic, as: 'clinic', attributes: ['name'] },
                { model: ConsultationNote, as: 'consultation_note' },
                { model: Prescription, as: 'prescription' },
                {
                    model: VitalsEntry,
                    as: 'vitals',
                    include: [{ model: VitalsRecordedValue, as: 'values' }]
                }
            ],
            order: [['datetime_start', 'DESC']],
        });

        res.json({ patient, appointments });

    } catch (err) {
        console.error('Error fetching patient details for doctor:', err);
        res.status(500).json({ error: 'Failed to fetch patient details.' });
    }
};

exports.addOrUpdateConsultationNote = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const appointmentId = parseInt(req.params.appointmentId);
        const { note } = req.body;

        // Security Check: Ensure the appointment belongs to the logged-in doctor
        const appointment = await Appointment.findByPk(appointmentId);
        const clinicDoctorProfiles = await ClinicDoctor.findAll({ where: { global_doctor_id: doctorId, active: true }, attributes: ['id'] });
        const clinicDoctorIds = clinicDoctorProfiles.map(p => p.id);

        if (!appointment || !clinicDoctorIds.includes(appointment.clinic_doctor_id)) {
            return res.status(403).json({ error: 'Unauthorized to edit note for this appointment.' });
        }

        // Find existing note or create a new one
        const [consultationNote, created] = await ConsultationNote.findOrCreate({
            where: { appointment_id: appointmentId },
            defaults: { note }
        });

        if (!created) {
            consultationNote.note = note;
            await consultationNote.save();
        }

        res.status(created ? 201 : 200).json(consultationNote);
    } catch (err) {
        console.error('Error saving consultation note:', err);
        res.status(500).json({ error: 'Failed to save note.' });
    }
};