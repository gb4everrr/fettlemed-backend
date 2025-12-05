const { 
  Appointment, 
  ClinicDoctor, 
  AppointmentSlot, 
  Invoice, 
  InvoiceService, 
  Service
  // Removed: ClinicAdmin (No longer needed here)
} = require('../models');
const { Op } = require('sequelize');
const { format } = require('date-fns');

// REMOVED: const isAuthorized = ... (Middleware handles this now)

// 1. Doctor Performance Reports
exports.getDoctorPerformance = async (req, res) => {
  const { clinic_id, startDate, endDate } = req.query;

  try {
    // SECURITY: checkPermission('view_analytics_doc') middleware has already validated access.

    // Fetch appointments in range
    const appointments = await Appointment.findAll({
      where: {
        clinic_id,
        datetime_start: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      include: [{ model: ClinicDoctor, as: 'doctor', attributes: ['id', 'first_name', 'last_name'] }]
    });

    // Process A: Patient Volume (Group by Doctor)
    const volumeMap = {};
    // Process B: Completion vs Cancellation
    const statusMap = {};

    appointments.forEach(app => {
      const docName = `Dr. ${app.doctor.first_name} ${app.doctor.last_name}`;
      
      // Volume
      volumeMap[docName] = (volumeMap[docName] || 0) + 1;

      // Status (0: Pending, 1: Confirmed, 2: Cancelled, 3: Completed/Checked-in)
      if (!statusMap[docName]) statusMap[docName] = { confirmed: 0, cancelled: 0 };
      
      if (app.status === 2) {
        statusMap[docName].cancelled++;
      } else {
        statusMap[docName].confirmed++;
      }
    });

    // Format for Recharts
    const volumeData = Object.keys(volumeMap).map(name => ({ name, consultations: volumeMap[name] }));
    const statusData = Object.keys(statusMap).map(name => ({
      name,
      confirmed: statusMap[name].confirmed,
      cancelled: statusMap[name].cancelled
    }));

    res.json({ volumeData, statusData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Operational Metrics
exports.getOperationalMetrics = async (req, res) => {
  const { clinic_id, startDate, endDate } = req.query;

  try {
    // SECURITY: checkPermission('view_analytics_ops') middleware has already validated access.

    // A. Peak Hours (Heatmap logic)
    const appointments = await Appointment.findAll({
      where: {
        clinic_id,
        datetime_start: { [Op.between]: [new Date(startDate), new Date(endDate)] },
        status: { [Op.ne]: 2 } // Exclude cancelled
      }
    });

    // Initialize generic heatmap buckets (0-23 hours)
    const hoursDist = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    
    appointments.forEach(app => {
      const hour = new Date(app.datetime_start).getHours(); 
      hoursDist[hour].count++;
    });

    // B. Slot Utilization
    const totalSlots = await AppointmentSlot.count({
      where: {
        clinic_id,
        start_time: { [Op.between]: [new Date(startDate), new Date(endDate)] }
      }
    });

    const bookedSlots = await AppointmentSlot.count({
      where: {
        clinic_id,
        booked: true,
        start_time: { [Op.between]: [new Date(startDate), new Date(endDate)] }
      }
    });

    const utilizationRate = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : 0;

    res.json({ 
      peakHours: hoursDist,
      utilization: { booked: bookedSlots, total: totalSlots, rate: parseFloat(utilizationRate) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Financial Reports
exports.getFinancialReports = async (req, res) => {
  const { clinic_id, startDate, endDate } = req.query;

  try {
    // SECURITY: checkPermission('view_financials') middleware has already validated access.

    // Fetch Invoices with Services
    const invoices = await Invoice.findAll({
      where: {
        clinic_id,
       invoice_date : { [Op.between]: [new Date(startDate), new Date(endDate)] }
      },
      include: [
        {
          model: InvoiceService, 
          as: 'services',
          include: [{ model: Service, as: 'service' }]
        }
      ]
    });

    // A. Revenue by Service Type
    const serviceRevenue = {};
    // B. Daily Earnings
    const dailyEarnings = {};

    invoices.forEach(inv => {
      // Daily Earnings
      const day = format(new Date(inv.invoice_date), 'yyyy-MM-dd');
      dailyEarnings[day] = (dailyEarnings[day] || 0) + inv.total_amount;

      // Service Revenue breakdown
      if (inv.services) { // Fixed property name from InvoiceServices to services (matches include alias)
        inv.services.forEach(is => {
          const serviceName = is.service ? is.service.name : 'Custom Item';
          serviceRevenue[serviceName] = (serviceRevenue[serviceName] || 0) + is.price;
        });
      }
    });

    const revenueByServiceData = Object.keys(serviceRevenue).map(name => ({
      name,
      value: serviceRevenue[name]
    }));

    const earningsData = Object.keys(dailyEarnings).sort().map(date => ({
      date,
      amount: dailyEarnings[date]
    }));

    res.json({ revenueByServiceData, earningsData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};