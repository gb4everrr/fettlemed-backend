const { Appointment, AppointmentSlot, ClinicPatient, User, Invoice, InvoiceService, DoctorProfile, ConsultationNote, Prescription, VitalsEntry, VitalsRecordedValue, ClinicVitalConfig, ClinicDoctor, Clinic, DoctorAvailability, AvailabilityException,ClinicAdmin, Service, Task, PatientAllergy } = require('../models');
const { Op } = require('sequelize');

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
        const now = new Date();
        
        // Date Ranges
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 1. Get Clinic Associations
        const clinicAssociations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            include: [{ model: Clinic, as: 'Clinic', attributes: ['id', 'name', 'timezone'] }]
        });
        
        const clinicDoctorIds = clinicAssociations.map(ca => ca.id);

        // 2. Fetch Today's Schedule
        const todayAppointments = await Appointment.findAll({
            where: {
                clinic_doctor_id: { [Op.in]: clinicDoctorIds },
                datetime_start: { [Op.between]: [todayStart, todayEnd] }
            },
            include: [
                { model: ClinicPatient, as: 'patient', attributes: ['first_name', 'last_name'] },
                { model: Clinic, as: 'clinic', attributes: ['name'] }
            ],
            order: [['datetime_start', 'ASC']]
        });

        // 3. Calculate Insights (Counts for the whole month)
        const allAppointmentsMonth = await Appointment.findAll({
             where: {
                clinic_doctor_id: { [Op.in]: clinicDoctorIds },
                datetime_start: { [Op.between]: [monthStart, monthEnd] }
            },
            attributes: ['status']
        });

        const insights = {
            completed: allAppointmentsMonth.filter(a => a.status === 1).length,
            scheduled: allAppointmentsMonth.filter(a => a.status === 0).length,
            canceled: allAppointmentsMonth.filter(a => a.status === 2).length,
        };

        // 4. Calculate REAL Revenue
        // Logic: Find appointments -> Find InvoiceServices linked to them -> Sum Price
        
        // Helper to sum revenue for a date range
        const calculateRevenue = async (start, end) => {
            const appointments = await Appointment.findAll({
                where: { 
                    clinic_doctor_id: { [Op.in]: clinicDoctorIds }, 
                    datetime_start: { [Op.between]: [start, end] } 
                },
                attributes: ['id']
            });
            const apptIds = appointments.map(a => a.id);
            
            if (apptIds.length === 0) return 0;

            const total = await InvoiceService.sum('price', {
                where: { appointment_id: { [Op.in]: apptIds } }
            });
            return total || 0;
        };

        const revenueToday = await calculateRevenue(todayStart, todayEnd);
        const revenueMonth = await calculateRevenue(monthStart, monthEnd);

        // 5. Construct Response
        const dashboardData = {
            doctor: {
                firstName: req.user.first_name,
                lastName: req.user.last_name
            },
            schedule: todayAppointments.map(appt => ({
                id: appt.id,
                patientName: `${appt.patient.first_name} ${appt.patient.last_name}`,
                time: appt.datetime_start, 
                type: 'Consultation', 
                clinicName: appt.clinic.name,
                status: appt.status
            })),
            insights,
            revenue: {
                today: revenueToday,
                mtd: revenueMonth
            },
            // Mocking alerts/tasks as these tables don't exist yet
            alerts: [
                { id: 1, type: 'critical', message: 'Critical Lab Value: P. Smith', subtext: 'Potassium 6.2 mmol/L' },
                { id: 2, type: 'warning', message: 'New Allergy: A. Johnson', subtext: 'Penicillin - Anaphylaxis' },
            ],
            tasks: [
                { id: 1, title: 'Review Lab Results for J. Doe', priority: 'high' },
                { id: 2, title: 'Sign 3 Pending Notes', priority: 'normal' },
            ]
        };

        res.json(dashboardData);

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
        const doctorId = req.user.id; // This is the User ID (global)

        // 1. Fetch Clinical Associations (as before)
        const associations = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId },
            include: [{
                model: Clinic,
                as: 'Clinic',
                attributes: ['id', 'name', 'address', 'email', 'phone']
            }],
            order: [['active', 'DESC'], ['started_date', 'DESC']]
        });

        // 2. Extract Clinic IDs to fetch roles in bulk
        const clinicIds = associations.map(a => a.clinic_id);

        // 3. Fetch RBAC Roles from ClinicAdmin
        // This table holds the actual permissions (OWNER, PARTNER, etc.)
        const adminRecords = await ClinicAdmin.findAll({
            where: {
                user_id: doctorId,
                clinic_id: { [Op.in]: clinicIds },
                active: true
            },
            attributes: ['clinic_id', 'role']
        });

        // 4. Create a Lookup Map: { clinic_id: 'ROLE_NAME' }
        const roleMap = {};
        adminRecords.forEach(record => {
            roleMap[record.clinic_id] = record.role;
        });

        // 5. Merge Data
        const detailedClinics = associations.map(a => ({
            clinic_doctor_id: a.id,
            clinic: a.Clinic,
            specialization: a.specialization,
            started_date: a.started_date,
            active: a.active,
            // Use the mapped role, or fallback to 'DOCTOR_VISITING' if missing
            assigned_role: roleMap[a.clinic_id] || 'DOCTOR_VISITING'
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

exports.getDoctorInvoiceDetails = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const invoiceId = parseInt(req.params.id);

        // 1. Find all clinic-specific doctor profiles for the logged-in user
        const clinicDoctorProfiles = await ClinicDoctor.findAll({
            where: { global_doctor_id: doctorId, active: true },
            attributes: ['id']
        });

        if (!clinicDoctorProfiles || clinicDoctorProfiles.length === 0) {
            return res.status(404).json({ error: 'No clinic associations found.' });
        }

        const clinicDoctorIds = clinicDoctorProfiles.map(cdp => cdp.id);

        // 2. Find appointments associated with these clinic-doctor profiles
        const doctorAppointments = await Appointment.findAll({
            where: { clinic_doctor_id: { [Op.in]: clinicDoctorIds } },
            attributes: ['id']
        });

        if (!doctorAppointments || doctorAppointments.length === 0) {
            return res.status(404).json({ error: 'No appointments found.' });
        }

        const appointmentIds = doctorAppointments.map(app => app.id);

        // 3. Find InvoiceService entries linked to those appointments and this specific invoice
        const invoiceServices = await InvoiceService.findAll({
            where: { 
                appointment_id: { [Op.in]: appointmentIds },
                invoice_id: invoiceId
            },
            attributes: ['invoice_id']
        });

        // 4. Verify this doctor has access to this invoice
        if (!invoiceServices || invoiceServices.length === 0) {
            return res.status(403).json({ error: 'You do not have access to this invoice.' });
        }

        // 5. Fetch the full invoice with all details
        const invoice = await Invoice.findByPk(invoiceId, {
            include: [
                { 
                    model: Clinic, 
                    as: 'clinic', 
                    attributes: ['name'] 
                },
                { 
                    model: ClinicPatient, 
                    as: 'patient', 
                    attributes: ['first_name', 'last_name', 'email', 'phone_number'] 
                },
                { 
                    model: InvoiceService, 
                    as: 'services',
                    include: [
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['name', 'price']
                        }
                    ]
                }
            ]
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found.' });
        }

        res.json(invoice);

    } catch (err) {
        console.error('Error fetching doctor invoice details:', err);
        res.status(500).json({ error: 'Failed to fetch invoice details.' });
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

exports.getDoctorTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch incomplete tasks first, then completed ones (limit completed to save bandwidth)
    const tasks = await Task.findAll({
      where: { user_id: userId },
      order: [
        ['is_completed', 'ASC'], // Pending tasks first
        ['priority', 'DESC'],    // High priority next
        ['created_at', 'DESC']
      ],
      attributes: ['id', 'title', 'priority', 'is_completed', 'due_date'] // Select only what UI needs
    });

    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// POST /tasks
exports.createTask = async (req, res) => {
  try {
    const { title, priority, due_date } = req.body;
    
    const newTask = await Task.create({
      user_id: req.user.id,
      title,
      priority: priority || 'normal',
      due_date
    });

    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /tasks/:id - Toggle status or update details
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, priority, is_completed, due_date } = req.body;

    const task = await Task.findOne({ 
      where: { id: taskId, user_id: req.user.id } 
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Update fields if they are provided in the body
    if (title !== undefined) task.title = title;
    if (priority !== undefined) task.priority = priority;
    if (is_completed !== undefined) task.is_completed = is_completed;
    if (due_date !== undefined) task.due_date = due_date;

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const deleted = await Task.destroy({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!deleted) return res.status(404).json({ error: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientAllergies = async (req, res) => {
    try {
        const { patientId } = req.params;
        const allergies = await PatientAllergy.findAll({
            where: { clinic_patient_id: patientId },
            order: [['created_at', 'DESC']]
        });
        res.json(allergies);
    } catch (err) {
        console.error("Error fetching allergies:", err);
        res.status(500).json({ error: 'Failed to fetch allergies' });
    }
};

// POST /doctor/patient/:patientId/allergies
exports.addPatientAllergy = async (req, res) => {
    try {
        const { patientId } = req.params;
        const { allergy_name, severity, reaction } = req.body;
        
        // Basic duplicate check
        const existing = await PatientAllergy.findOne({
            where: { clinic_patient_id: patientId, allergy_name }
        });

        if (existing) {
            return res.status(400).json({ error: 'This allergy is already recorded for this patient.' });
        }

        const newAllergy = await PatientAllergy.create({
            clinic_patient_id: patientId,
            allergy_name,
            severity: severity || 'unknown',
            reaction,
            recorded_by: req.user.id
        });

        res.status(201).json(newAllergy);
    } catch (err) {
        console.error("Error adding allergy:", err);
        res.status(500).json({ error: 'Failed to add allergy' });
    }
};

// DELETE /doctor/allergies/:id
exports.deletePatientAllergy = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await PatientAllergy.destroy({ where: { id } });
        
        if (!result) return res.status(404).json({ error: 'Allergy not found' });
        
        res.status(200).json({ message: 'Allergy removed' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove allergy' });
    }
};