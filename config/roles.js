const ROLES = {
  // --- TIER 1: THE OWNER (Global Control) ---
  OWNER: {
    inherits: ['CLINIC_ADMIN', 'DOCTOR_OWNER'],
    permissions: [
      'manage_branches',       // Matches the branch creation logic we added
      'manage_roles'          // Matches /api/clinic-user/staff-permissions
    ]
  },

  // --- TIER 2: BRANCH ADMIN (One Branch, Full Access) ---
  CLINIC_ADMIN: {
    inherits: ['RECEPTIONIST', 'NURSE'], 
    permissions: [
      'manage_staff',          // /api/clinic-user/clinic-doctor (add/delete)
      'manage_roles',          // /api/clinic-user/staff-permissions
      'manage_clinic_profile', // /api/clinic/:id (update)
      'manage_services',       // /api/clinic-invoice/service/*
      'manage_templates',      // /api/clinic-vitals/templates/*
      'view_financials',       // /api/analytics/financial
      'view_analytics_ops',    // /api/dashboard/kpi-metrics
      'delete_patient',        // /api/clinic-user/clinic-patient (delete)
      'manage_vitals_library', //api/clinic-vitals/library/*  
      'view_clinic_details',
      'manage_availability' 
    ]
  },

  // --- TIER 3: DOCTOR VARIANTS ---
  
  // 3a. Doctor (Owner): Full Admin + Clinical Tools
  DOCTOR_OWNER: {
    inherits: ['CLINIC_ADMIN', 'DOCTOR_PARTNER'], 
    permissions: [] 
  },

  // 3b. Doctor (Partner): Clinical + Financial View (No Deletes)
  DOCTOR_PARTNER: {
    inherits: ['DOCTOR_VISITING'],
    permissions: [
      'view_financials',       // /api/analytics/financial
      'view_analytics_doc',    // /api/analytics/doctor-performance
      'view_all_schedule',     // /api/appointment/ (get all)
      'manage_appointments' ,
      'view_clinic_details'   // /api/appointment/ (create/update)
    ]
  },

  // 3c. Doctor (Visiting): Strict Silo (Own Data Only)
  DOCTOR_VISITING: {
    inherits: [],
    permissions: [
      'manage_appointments',
      'manage_patients',
      'view_own_schedule',     // /api/doctor/appointments
      'view_assigned_patients',// /api/doctor/my-patients-details
      'create_prescription',   // /api/prescription
      'view_prescription',     // /api/prescription/:id
      'manage_medical_records',// /api/consultation-note
      'manage_availability',   // /api/doctor/availability
      'view_patient_history'   // /api/doctor-vitals/patient
    ]
  },

  // --- TIER 4: STAFF (Workflow Only) ---
  
  // Nurse/Receptionist (Combined Workflow)
  RECEPTIONIST: {
    inherits: [],
    permissions: [
      'manage_patients',       // /api/clinic-user/clinic-patient
      'manage_appointments',   // /api/appointment/
      'view_all_schedule',     // /api/appointment/
      'manage_invoices',       // /api/clinic-invoice/invoice/create
      'view_services',         // /api/clinic-invoice/service/list
      'manage_vitals_entry'    // /api/clinic-vitals/entry/submit
    ]
  },

  // Nurse separate role
  NURSE: {
    inherits: [],
    permissions: [
      'manage_vitals_entry',   // /api/clinic-vitals/entry/submit
      'view_patient_history',  // /api/clinic-vitals/entry/history
      'manage_medical_records',// /api/consultation-note
      'view_all_schedule'      // /api/appointment/
    ]
  }
};

module.exports = ROLES;