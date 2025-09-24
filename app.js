const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const clinicUserRoutes = require('./routes/clinicUserRoutes');
const clinicVitalsRoutes = require('./routes/clinicVitalsRoutes');
const clinicInvoiceRoutes = require('./routes/clinicInvoiceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const consultationNoteRoutes = require('./routes/consultationNoteRoutes');
const doctorVitalsRoutes = require('./routes/doctorVitalsRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

// Mounting route files
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/clinic-user', clinicUserRoutes);
app.use('/api/clinic-vitals', clinicVitalsRoutes);
app.use('/api/clinic-invoice', clinicInvoiceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/consultation-notes', consultationNoteRoutes);
app.use('/api/doctor/vitals', doctorVitalsRoutes);
app.use('/api/doctor', doctorRoutes);



// Health check
app.get('/ping', (req, res) => res.send('pong'));

module.exports = app;
