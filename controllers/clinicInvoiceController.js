const { Service, Invoice, InvoiceService, ClinicAdmin, ClinicDoctor, ClinicPatient } = require('../models');

const isAuthorizedForClinic = async (userId, clinicId) => {
  const isAdmin = await ClinicAdmin.findOne({ 
    where: { user_id: userId, clinic_id: clinicId } 
  });
  if (isAdmin) return true;
  
  const isDoctor = await ClinicDoctor.findOne({ 
    where: { global_doctor_id: userId, clinic_id: clinicId, active: true } 
  });
  return !!isDoctor;
};

exports.createService = async (req, res) => {
  const { clinic_id, name, price } = req.body;
  try {
    if (!await isAuthorizedForClinic(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const service = await Service.create({ 
      clinic_id, 
      name, 
      price
    });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { clinic_id, name, price } = req.body;
  try {
    if (!await isAuthorizedForClinic(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await Service.update({ name, price }, { where: { id, clinic_id } });
    const updated = await Service.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteService = async (req, res) => {
  const { id } = req.params;
  const { clinic_id } = req.body;
  try {
    if (!await isAuthorizedForClinic(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await Service.destroy({ where: { id, clinic_id } });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listServices = async (req, res) => {
  const { clinic_id } = req.query;
  try {
    const services = await Service.findAll({ where: { clinic_id } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// clinicInvoiceController.js

exports.createInvoice = async (req, res) => {
  // CHANGED: Now expecting clinic_patient_id instead of patient_profile_id
  const { clinic_id, clinic_patient_id, services } = req.body;
  try {
    if (!await isAuthorizedForClinic(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let total_amount = 0;
    const serviceLinks = [];

    for (const service of services) {
      let serviceRecord;
      if (service.service_id) {
        serviceRecord = await Service.findOne({
          where: { id: service.service_id, clinic_id }
        });
        if (!serviceRecord) {
          return res.status(400).json({ error: `Service with ID ${service.service_id} not found` });
        }
      } else {
        if (!service.name || !service.price) {
          return res.status(400).json({ error: 'New services must have a name and price' });
        }
        serviceRecord = await Service.create({
          clinic_id,
          name: service.name,
          price: service.price
        });
      }
      
      total_amount += serviceRecord.price;
      serviceLinks.push({
        invoice_id: null,
        service_id: serviceRecord.id,
        price: serviceRecord.price,
        appointment_id: service.appointment_id || null
      });
    }

    // CHANGED: Use clinic_patient_id directly
    const invoice = await Invoice.create({ 
      clinic_id, 
      clinic_patient_id, 
      total_amount 
    });

    const finalServiceLinks = serviceLinks.map(link => ({
      ...link,
      invoice_id: invoice.id
    }));

    await InvoiceService.bulkCreate(finalServiceLinks);
    res.status(201).json({ invoice_id: invoice.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInvoiceDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (!await isAuthorizedForClinic(req.user.id, invoice.clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const services = await InvoiceService.findAll({ where: { invoice_id: id } });
    res.json({ invoice, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listInvoices = async (req, res) => {
  const { clinic_id, page = 1, limit = 10 } = req.query;
  
  try {
    if (!await isAuthorizedForClinic(req.user.id, clinic_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: { clinic_id },
      order: [['invoice_date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get patient and service details separately to avoid association issues
    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => {
        try {
          // Get patient details
          const patient = await ClinicPatient.findByPk(invoice.clinic_patient_id);
          
          // Get invoice services
          const invoiceServices = await InvoiceService.findAll({
            where: { invoice_id: invoice.id }
          });

          // Get service details for each invoice service
          const servicesWithDetails = await Promise.all(
            invoiceServices.map(async (invoiceService) => {
              const service = await Service.findByPk(invoiceService.service_id);
              return {
                id: invoiceService.id,
                service_id: invoiceService.service_id,
                price: invoiceService.price,
                service: service ? { name: service.name } : { name: 'Unknown Service' }
              };
            })
          );

          return {
            id: invoice.id,
            clinic_id: invoice.clinic_id,
            clinic_patient_id: invoice.clinic_patient_id,
            invoice_date: invoice.invoice_date,
            total_amount: invoice.total_amount,
            patient: patient ? {
              id: patient.id,
              first_name: patient.first_name || '',
              last_name: patient.last_name || '',
              email: patient.email || '',
              phone_number: patient.phone_number || ''
            } : {
              id: null,
              first_name: 'Unknown',
              last_name: 'Patient',
              email: '',
              phone_number: ''
            },
            services: servicesWithDetails,
            serviceCount: servicesWithDetails.length
          };
        } catch (detailError) {
          console.error('Error fetching details for invoice:', invoice.id, detailError);
          return {
            id: invoice.id,
            clinic_id: invoice.clinic_id,
            clinic_patient_id: invoice.clinic_patient_id,
            invoice_date: invoice.invoice_date,
            total_amount: invoice.total_amount,
            patient: {
              id: null,
              first_name: 'Unknown',
              last_name: 'Patient',
              email: '',
              phone_number: ''
            },
            services: [],
            serviceCount: 0
          };
        }
      })
    );

    res.json({
      invoices: invoicesWithDetails,
      totalCount: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Error in listInvoices:', err);
    res.status(500).json({ error: err.message });
  }
};