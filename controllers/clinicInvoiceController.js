const { Service, Invoice, InvoiceService, ClinicAdmin, ClinicDoctor } = require('../models');

const isAuthorized = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ where: { user_id: userId, clinic_id: clinicId, active: true } });
  if (isAdmin) return true;
  const isDoctor = await ClinicDoctor.findOne({ where: { global_doctor_id: userId, clinic_id: clinicId, active: true } });
  return !!isDoctor;
};

exports.createService = async (req, res) => {
  const { clinic_id } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, ...fields } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await Service.update(fields, { where: { id, clinic_id } });
    const updated = await Service.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteService = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.query;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });
    await Service.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listServices = async (req, res) => {
  try {
    const services = await Service.findAll({ where: { clinic_id: req.query.clinic_id } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createInvoice = async (req, res) => {
  const { clinic_id, appointment_id, services } = req.body;
  try {
    if (!await isAuthorized(req.user.id, clinic_id)) return res.status(403).json({ error: 'Unauthorized' });

    const total_amount = services.reduce((sum, s) => sum + (s.price * s.quantity), 0);
    const invoice = await Invoice.create({ clinic_id, appointment_id, total_amount });

    const serviceLinks = services.map(s => ({
      invoice_id: invoice.id,
      service_id: s.service_id,
      quantity: s.quantity,
      subtotal: s.price * s.quantity
    }));

    await InvoiceService.bulkCreate(serviceLinks);
    res.status(201).json({ invoice_id: invoice.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInvoiceDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await Invoice.findByPk(id);
    const services = await InvoiceService.findAll({ where: { invoice_id: id } });
    res.json({ invoice, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};