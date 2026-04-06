const { Op } = require('sequelize');
const { User, ClinicAdmin, Clinic, Invoice, ClinicPatient, Appointment, PatientProfile, Prescription, ClinicDoctor,VitalsEntry, VitalsRecordedValue,ClinicVitalConfig } = require('../models');



// Helper function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  const currentVal = current || 0;
  const previousVal = previous || 0;
  
  if (previousVal === 0) {
    return currentVal > 0 ? 100.0 : 0.0; // Avoid division by zero
  }
  return ((currentVal - previousVal) / previousVal) * 100;
};

// Main function to get all KPI metrics
exports.getKpiMetrics = async (req, res) => {
  const { clinic_id, startDate, endDate } = req.query;
  
  try {
   

    // 2. Define Date Ranges
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Calculate previous period for comparison
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1); // e.g., 1ms before start
    const prevStart = new Date(prevEnd.getTime() - duration);

    // 3. Run all queries in parallel
    const [
      // Revenue
      currentRevenue,
      prevRevenue,
      // New Patients
      currentNewPatients,
      prevNewPatients,
      // Total Invoices (Changed from Pending)
      currentTotalInvoices,
      prevTotalInvoices,
      // Appointments
      totalAppointments,
      confirmedAppointments,
      canceledAppointments
    ] = await Promise.all([
      // Total Revenue Queries
      Invoice.sum('total_amount', { where: { clinic_id, invoice_date: { [Op.between]: [start, end] } } }),
      Invoice.sum('total_amount', { where: { clinic_id, invoice_date: { [Op.between]: [prevStart, prevEnd] } } }),
      
      // New Patients Queries (using createdAt)
      ClinicPatient.count({ where: { clinic_id, registered_at: { [Op.between]: [start, end] } } }),
      ClinicPatient.count({ where: { clinic_id, registered_at: { [Op.between]: [prevStart, prevEnd] } } }),
      
      // Total Invoices Queries (replaces Pending)
      Invoice.count({ where: { clinic_id, invoice_date: { [Op.between]: [start, end] } } }),
      Invoice.count({ where: { clinic_id, invoice_date: { [Op.between]: [prevStart, prevEnd] } } }),

      // Appointment Queries (for current period only)
      Appointment.count({ where: { clinic_id, datetime_start: { [Op.between]: [start, end] } } }),
      Appointment.count({ where: { clinic_id, status: 1, datetime_start: { [Op.between]: [start, end] } } }), // 1 = Confirmed
      Appointment.count({ where: { clinic_id, status: 2, datetime_start: { [Op.between]: [start, end] } } })  // 2 = Canceled
    ]);

    // 4. Format the response
    const response = {
      totalRevenue: {
        value: currentRevenue || 0,
        percentageChange: calculatePercentageChange(currentRevenue, prevRevenue)
      },
      newPatients: {
        value: currentNewPatients || 0,
        percentageChange: calculatePercentageChange(currentNewPatients, prevNewPatients)
      },
      totalInvoices: { // <-- This field name has changed
        value: currentTotalInvoices || 0,
        percentageChange: calculatePercentageChange(currentTotalInvoices, prevTotalInvoices)
      },
      appointments: {
        total: totalAppointments || 0,
        confirmed: confirmedAppointments || 0,
        canceled: canceledAppointments || 0
      }
    };

    res.json(response);

  } catch (err) {
    console.error('Error fetching KPI metrics:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientDashboard = async (req, res) => {
  const { patientId } = req.params; // The Profile ID (e.g., 3)

  try {
    // 1. Fetch Global Profile by PK to get the associated user_id
    const patientProfile = await PatientProfile.findByPk(patientId, {
      attributes: ['id', 'user_id', 'abha_number', 'abha_address']
    });

    if (!patientProfile) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    // 2. Find all local clinic records linked to that User (e.g., User 6)
    const clinicRecords = await ClinicPatient.findAll({
      where: { global_patient_id: patientProfile.user_id },
      attributes: ['id']
    });

    const localPatientIds = clinicRecords.map(r => r.id);

    // If no clinic linkings exist, return the profile with empty lists
    if (!localPatientIds.length) {
      return res.json({
        patient: patientProfile,
        upcoming_appointments: [],
        active_prescriptions: [],
        latest_vitals: []
      });
    }

    // 3. Fetch Upcoming Appointments
    const appointments = await Appointment.findAll({
      where: {
        // Use clinic_patient_id as per your model
        clinic_patient_id: { [Op.in]: localPatientIds }, 
        // Filter for today onwards (using inline date logic)
        datetime_start: { [Op.gte]: new Date().setHours(0, 0, 0, 0) },
        status: { [Op.not]: 2 } // Assuming 2 is 'cancelled'
      },
      include: [
        { 
          model: ClinicDoctor, 
          as: 'doctor', // Correct lowercase alias
          attributes: ['first_name', 'last_name', 'specialization'] // Fetch directly from clinic_doctor
        },
        { 
          model: Clinic, 
          as: 'clinic', // Correct lowercase alias
          attributes: ['name', 'address','timezone'] 
        }
      ],
      order: [['datetime_start', 'ASC']],
      limit: 5 
    });

    // --- STEP 3: Fetch Prescriptions (Using Local IDs) ---
    const activePrescriptions = await Prescription.findAll({
  where: {
    clinic_patient_id: { [Op.in]: localPatientIds } // FIXED: uses clinic_patient_id
  },
  limit: 5,
  order: [['created_at', 'DESC']]
});

// --- STEP 5: Fetch Latest Vitals (Using Local IDs) ---
    const latestVitalEntry = await VitalsEntry.findOne({
      where: { 
        clinic_patient_id: { [Op.in]: localPatientIds } 
      },
      // FIX: Database uses 'entry_date'. Using 'id' as a tie-breaker for the most recent.
      order: [['entry_date', 'DESC'], ['id', 'DESC']], 
      include: [{
        model: VitalsRecordedValue,
        as: 'values', // From vitals_entry.js association
        include: [{ 
          model: ClinicVitalConfig, 
          as: 'config', // From vitals_recorded_value.js association
          attributes: ['vital_name', 'unit'] // Database uses 'vital_name'
        }]
      }]
    });

    const vitalStats = [];
    if (latestVitalEntry && latestVitalEntry.values) {
      latestVitalEntry.values.forEach(record => {
        if (record.config) {
          vitalStats.push({
            name: record.config.vital_name, // Mapping 'vital_name' to 'name' for Flutter
            value: record.vital_value,     // Database uses 'vital_value'
            unit: record.config.unit || ''
          });
        }
      });
    }

    // --- STEP 5: Aggregate Response ---
    res.json({
      patient: patientProfile,
      upcoming_appointments: appointments,
      active_prescriptions: activePrescriptions,
      latest_vitals: vitalStats
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
};