const { Op } = require('sequelize');
const { ClinicAdmin, Clinic, Invoice, ClinicPatient, Appointment } = require('../models');



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