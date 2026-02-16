const Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * createTable() => "appointment_slot", deps: []
 * createTable() => "availability_exception", deps: []
 * createTable() => "clinic_patient", deps: []
 * createTable() => "clinic_vital_config", deps: []
 * createTable() => "clinic_vital_template", deps: []
 * createTable() => "diagnosis_catalog", deps: []
 * createTable() => "doctor_availability", deps: []
 * createTable() => "drug_catalog", deps: []
 * createTable() => "lab_catalog", deps: []
 * createTable() => "patient_profile", deps: []
 * createTable() => "users", deps: []
 * createTable() => "clinic", deps: [clinic]
 * createTable() => "clinic_doctor", deps: [clinic]
 * createTable() => "appointment", deps: [clinic, clinic_patient, clinic_doctor, appointment_slot]
 * createTable() => "clinic_admin", deps: [users, clinic]
 * createTable() => "appointment_diagnosis", deps: [appointment]
 * createTable() => "clinic_vital_template_member", deps: [clinic_vital_template, clinic_vital_config]
 * createTable() => "consultation_note", deps: [appointment]
 * createTable() => "consultation_note_history", deps: [consultation_note, clinic_doctor]
 * createTable() => "doctor_profile", deps: [users]
 * createTable() => "doctor_vital_assignment", deps: [clinic_doctor, clinic_vital_config]
 * createTable() => "report_upload", deps: [patient_profile]
 * createTable() => "invoice", deps: [clinic, clinic_patient]
 * createTable() => "service", deps: [clinic]
 * createTable() => "lab_order", deps: [clinic, clinic_patient, appointment, clinic_doctor, lab_catalog]
 * createTable() => "patient_allergies", deps: [clinic_patient]
 * createTable() => "patient_self_data", deps: [patient_profile]
 * createTable() => "prescription", deps: [appointment, clinic_doctor]
 * createTable() => "document_ocr_data", deps: [report_upload]
 * createTable() => "invoice_service", deps: [invoice, service, appointment]
 * createTable() => "tasks", deps: [users]
 * createTable() => "vitals_entry", deps: [appointment]
 * createTable() => "vitals_recorded_value", deps: [vitals_entry, clinic_vital_config]
 * addIndex(patient_allergies_clinic_patient_id) => "patient_allergies"
 * addIndex(tasks_user_id_is_completed) => "tasks"
 *
 */

const info = {
  revision: 1,
  name: "initial_schema",
  created: "2026-02-16T14:33:50.966Z",
  comment: "",
};

const migrationCommands = (transaction) => [
  {
    fn: "createTable",
    params: [
      "appointment_slot",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          field: "clinic_doctor_id",
          allowNull: false,
        },
        start_time: {
          type: Sequelize.DATE,
          field: "start_time",
          allowNull: false,
        },
        end_time: { type: Sequelize.DATE, field: "end_time", allowNull: false },
        booked: {
          type: Sequelize.BOOLEAN,
          field: "booked",
          defaultValue: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "availability_exception",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          field: "clinic_doctor_id",
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        date: { type: Sequelize.DATEONLY, field: "date", allowNull: false },
        start_time: {
          type: Sequelize.TIME,
          field: "start_time",
          allowNull: false,
        },
        end_time: { type: Sequelize.TIME, field: "end_time", allowNull: false },
        is_available: {
          type: Sequelize.BOOLEAN,
          field: "is_available",
          defaultValue: false,
        },
        note: { type: Sequelize.TEXT, field: "note", allowNull: true },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_patient",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        global_patient_id: {
          type: Sequelize.INTEGER,
          field: "global_patient_id",
          allowNull: true,
        },
        first_name: {
          type: Sequelize.STRING,
          field: "first_name",
          allowNull: true,
        },
        last_name: {
          type: Sequelize.STRING,
          field: "last_name",
          allowNull: true,
        },
        email: { type: Sequelize.STRING, field: "email", allowNull: true },
        phone_number: {
          type: Sequelize.STRING,
          field: "phone_number",
          allowNull: true,
        },
        address: { type: Sequelize.STRING, field: "address", allowNull: true },
        emergency_contact: {
          type: Sequelize.STRING,
          field: "emergency_contact",
          allowNull: true,
        },
        patient_code: {
          type: Sequelize.STRING,
          field: "patient_code",
          allowNull: true,
        },
        clinic_notes: {
          type: Sequelize.TEXT,
          field: "clinic_notes",
          allowNull: true,
        },
        dob: { type: Sequelize.DATEONLY, field: "dob" },
        gender: {
          type: Sequelize.STRING,
          field: "gender",
          defaultValue: "Male",
          allowNull: true,
        },
        registered_at: {
          type: Sequelize.DATE,
          field: "registered_at",
          defaultValue: Sequelize.NOW,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_vital_config",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        vital_name: {
          type: Sequelize.STRING,
          field: "vital_name",
          allowNull: false,
        },
        data_type: { type: Sequelize.STRING, field: "data_type" },
        unit: { type: Sequelize.STRING, field: "unit" },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
        is_required: {
          type: Sequelize.BOOLEAN,
          field: "is_required",
          defaultValue: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_vital_template",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        template_name: {
          type: Sequelize.STRING,
          field: "template_name",
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          field: "description",
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "createdAt",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updatedAt",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "diagnosis_catalog",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: { type: Sequelize.TEXT, field: "name", allowNull: false },
        type: { type: Sequelize.STRING, field: "type" },
        snomed_code: { type: Sequelize.STRING, field: "snomed_code" },
        snomed_fsn: { type: Sequelize.TEXT, field: "snomed_fsn" },
        icd_code: { type: Sequelize.STRING, field: "icd_code" },
        icd_description: { type: Sequelize.TEXT, field: "icd_description" },
        body_system: { type: Sequelize.STRING, field: "body_system" },
        clinical_specialty: {
          type: Sequelize.STRING,
          field: "clinical_specialty",
        },
        search_aliases: { type: Sequelize.TEXT, field: "search_aliases" },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "doctor_availability",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          field: "clinic_doctor_id",
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        weekday: { type: Sequelize.STRING, field: "weekday", allowNull: false },
        start_time: {
          type: Sequelize.TIME,
          field: "start_time",
          allowNull: false,
        },
        end_time: { type: Sequelize.TIME, field: "end_time", allowNull: false },
        active: {
          type: Sequelize.BOOLEAN,
          field: "active",
          defaultValue: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "drug_catalog",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: { type: Sequelize.TEXT, field: "name", allowNull: false },
        generic_name: {
          type: Sequelize.STRING,
          field: "generic_name",
          allowNull: true,
        },
        strength: {
          type: Sequelize.STRING,
          field: "strength",
          allowNull: true,
        },
        form: { type: Sequelize.STRING, field: "form", allowNull: true },
        manufacturer: {
          type: Sequelize.STRING,
          field: "manufacturer",
          allowNull: true,
        },
        search_aliases: {
          type: Sequelize.TEXT,
          field: "search_aliases",
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "lab_catalog",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        test_name: {
          type: Sequelize.TEXT,
          field: "test_name",
          allowNull: false,
        },
        test_code: { type: Sequelize.STRING, field: "test_code" },
        search_aliases: { type: Sequelize.TEXT, field: "search_aliases" },
        category: { type: Sequelize.STRING, field: "category" },
        unit: { type: Sequelize.STRING, field: "unit" },
        reference_range: { type: Sequelize.TEXT, field: "reference_range" },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "patient_profile",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        user_id: { type: Sequelize.INTEGER, field: "user_id", allowNull: true },
        address: { type: Sequelize.TEXT, field: "address", allowNull: true },
        emergency_contact: {
          type: Sequelize.STRING,
          field: "emergency_contact",
          allowNull: true,
        },
        abha_number: {
          type: Sequelize.STRING(14),
          field: "abha_number",
          unique: true,
          allowNull: true,
        },
        abha_address: {
          type: Sequelize.STRING,
          field: "abha_address",
          unique: true,
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "users",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING,
          field: "email",
          unique: true,
          allowNull: false,
        },
        password_hash: {
          type: Sequelize.TEXT,
          field: "password_hash",
          allowNull: false,
        },
        role: { type: Sequelize.STRING, field: "role", allowNull: false },
        first_name: {
          type: Sequelize.STRING,
          field: "first_name",
          allowNull: true,
        },
        last_name: {
          type: Sequelize.STRING,
          field: "last_name",
          allowNull: true,
        },
        phone_number: {
          type: Sequelize.STRING,
          field: "phone_number",
          allowNull: true,
        },
        profile_image_url: {
          type: Sequelize.TEXT,
          field: "profile_image_url",
          allowNull: true,
        },
        kyc_level: {
          type: Sequelize.INTEGER,
          field: "kyc_level",
          defaultValue: 0,
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: { type: Sequelize.STRING, field: "name", allowNull: false },
        address: { type: Sequelize.TEXT, field: "address", allowNull: true },
        email: {
          type: Sequelize.STRING,
          field: "email",
          unique: true,
          allowNull: true,
        },
        phone: { type: Sequelize.STRING, field: "phone", allowNull: true },
        timezone: {
          type: Sequelize.STRING,
          field: "timezone",
          comment: 'IANA timezone name, e.g., "Asia/Kolkata"',
          defaultValue: "UTC",
          allowNull: false,
        },
        brandColor: {
          type: Sequelize.STRING,
          field: "brand_color",
          defaultValue: "#2D5367",
          allowNull: true,
        },
        parent_clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          field: "parent_clinic_id",
          references: { model: "clinic", key: "id" },
          allowNull: true,
        },
        hfr_id: {
          type: Sequelize.STRING,
          field: "hfr_id",
          unique: true,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "createdAt",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updatedAt",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_doctor",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          field: "clinic_id",
          references: { model: "clinic", key: "id" },
          allowNull: false,
        },
        global_doctor_id: {
          type: Sequelize.INTEGER,
          field: "global_doctor_id",
          allowNull: true,
        },
        first_name: {
          type: Sequelize.STRING,
          field: "first_name",
          allowNull: true,
        },
        last_name: {
          type: Sequelize.STRING,
          field: "last_name",
          allowNull: true,
        },
        email: { type: Sequelize.STRING, field: "email", allowNull: true },
        phone_number: {
          type: Sequelize.STRING,
          field: "phone_number",
          allowNull: true,
        },
        address: { type: Sequelize.STRING, field: "address", allowNull: true },
        medical_reg_no: {
          type: Sequelize.STRING,
          field: "medical_reg_no",
          allowNull: true,
        },
        specialization: {
          type: Sequelize.STRING,
          field: "specialization",
          allowNull: true,
        },
        started_date: {
          type: Sequelize.DATEONLY,
          field: "started_date",
          allowNull: true,
        },
        active: {
          type: Sequelize.BOOLEAN,
          field: "active",
          defaultValue: true,
        },
        assigned_role: {
          type: Sequelize.STRING,
          field: "assigned_role",
          defaultValue: "DOCTOR",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "appointment",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic", key: "id" },
          field: "clinic_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_patient", key: "id" },
          field: "clinic_patient_id",
          allowNull: false,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_doctor", key: "id" },
          field: "clinic_doctor_id",
          allowNull: false,
        },
        slot_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "appointment_slot", key: "id" },
          field: "slot_id",
          allowNull: true,
        },
        datetime_start: {
          type: Sequelize.DATE,
          field: "datetime_start",
          allowNull: false,
        },
        datetime_end: {
          type: Sequelize.DATE,
          field: "datetime_end",
          allowNull: false,
        },
        invoice_no: {
          type: Sequelize.STRING,
          field: "invoice_no",
          allowNull: true,
        },
        status: { type: Sequelize.INTEGER, field: "status", defaultValue: 0 },
        notes: { type: Sequelize.TEXT, field: "notes", allowNull: true },
        arrival_time: {
          type: Sequelize.DATE,
          field: "arrival_time",
          allowNull: true,
        },
        appointment_type: {
          type: Sequelize.INTEGER,
          field: "appointment_type",
          defaultValue: 0,
        },
        priority_score: {
          type: Sequelize.INTEGER,
          field: "priority_score",
          defaultValue: 0,
        },
        is_priority: {
          type: Sequelize.BOOLEAN,
          field: "is_priority",
          defaultValue: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_admin",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "users", key: "id" },
          field: "user_id",
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "clinic", key: "id" },
          field: "clinic_id",
          allowNull: false,
        },
        role: {
          type: Sequelize.STRING,
          field: "role",
          defaultValue: "CLINIC_ADMIN",
          allowNull: false,
        },
        custom_permissions: {
          type: Sequelize.JSON,
          field: "custom_permissions",
          defaultValue: Sequelize.Array,
          allowNull: true,
        },
        active: {
          type: Sequelize.BOOLEAN,
          field: "active",
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          field: "createdAt",
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          field: "updatedAt",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "appointment_diagnosis",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          field: "clinic_patient_id",
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          field: "clinic_doctor_id",
        },
        diagnosis_catalog_id: {
          type: Sequelize.INTEGER,
          field: "diagnosis_catalog_id",
        },
        description: {
          type: Sequelize.TEXT,
          field: "description",
          allowNull: false,
        },
        code: { type: Sequelize.STRING, field: "code" },
        type: {
          type: Sequelize.STRING,
          field: "type",
          defaultValue: "Provisional",
        },
        added_by_user_id: {
          type: Sequelize.INTEGER,
          field: "added_by_user_id",
        },
        added_by_name: { type: Sequelize.STRING, field: "added_by_name" },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "clinic_vital_template_member",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        template_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "clinic_vital_template", key: "id" },
          field: "template_id",
          allowNull: false,
        },
        vital_config_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_vital_config", key: "id" },
          field: "vital_config_id",
          allowNull: false,
        },
        is_required: {
          type: Sequelize.BOOLEAN,
          field: "is_required",
          defaultValue: false,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          field: "sort_order",
          defaultValue: 0,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "consultation_note",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          field: "clinic_patient_id",
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          field: "clinic_doctor_id",
        },
        subjective: { type: Sequelize.TEXT, field: "subjective" },
        objective: { type: Sequelize.TEXT, field: "objective" },
        observations_private: {
          type: Sequelize.TEXT,
          field: "observations_private",
        },
        diagnosis_comments: {
          type: Sequelize.TEXT,
          field: "diagnosis_comments",
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          defaultValue: Sequelize.NOW,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "consultation_note_history",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        consultation_note_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "consultation_note", key: "id" },
          field: "consultation_note_id",
          allowNull: false,
        },
        updated_by_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_doctor", key: "id" },
          allowNull: true,
          field: "updated_by_id",
        },
        subjective: { type: Sequelize.TEXT, field: "subjective" },
        objective: { type: Sequelize.TEXT, field: "objective" },
        observations_private: {
          type: Sequelize.TEXT,
          field: "observations_private",
        },
        change_reason: { type: Sequelize.STRING, field: "change_reason" },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          defaultValue: Sequelize.NOW,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "doctor_profile",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "users", key: "id" },
          field: "user_id",
          allowNull: false,
        },
        medical_reg_no: {
          type: Sequelize.STRING,
          field: "medical_reg_no",
          allowNull: true,
        },
        specialization: {
          type: Sequelize.STRING,
          field: "specialization",
          allowNull: true,
        },
        hpr_id: {
          type: Sequelize.STRING,
          field: "hpr_id",
          unique: true,
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "doctor_vital_assignment",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_doctor", key: "id" },
          field: "clinic_doctor_id",
          allowNull: false,
        },
        vital_config_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "clinic_vital_config", key: "id" },
          field: "vital_config_id",
          allowNull: false,
        },
        is_required: {
          type: Sequelize.BOOLEAN,
          field: "is_required",
          defaultValue: false,
        },
        sort_order: {
          type: Sequelize.INTEGER,
          field: "sort_order",
          defaultValue: 0,
        },
        assigned_at: {
          type: Sequelize.DATE,
          field: "assigned_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "report_upload",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        patient_profile_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "patient_profile", key: "id" },
          field: "patient_profile_id",
          allowNull: true,
        },
        report_type: {
          type: Sequelize.STRING,
          field: "report_type",
          allowNull: true,
        },
        upload_url: {
          type: Sequelize.TEXT,
          field: "upload_url",
          allowNull: true,
        },
        uploaded_at: {
          type: Sequelize.DATE,
          field: "uploaded_at",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "invoice",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "clinic", key: "id" },
          field: "clinic_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          field: "clinic_patient_id",
          references: { model: "clinic_patient", key: "id" },
          allowNull: false,
        },
        invoice_date: {
          type: Sequelize.DATE,
          field: "invoice_date",
          defaultValue: Sequelize.NOW,
        },
        total_amount: {
          type: Sequelize.FLOAT,
          field: "total_amount",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "service",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: { type: Sequelize.STRING, field: "name", allowNull: true },
        price: { type: Sequelize.FLOAT, field: "price", allowNull: true },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic", key: "id" },
          field: "clinic_id",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "lab_order",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic", key: "id" },
          field: "clinic_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_patient", key: "id" },
          field: "clinic_patient_id",
          allowNull: false,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: true,
        },
        ordered_by_doctor_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_doctor", key: "id" },
          allowNull: true,
          field: "ordered_by_doctor_id",
        },
        lab_catalog_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "lab_catalog", key: "id" },
          field: "lab_catalog_id",
          allowNull: true,
        },
        test_name: {
          type: Sequelize.STRING,
          field: "test_name",
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING,
          field: "status",
          defaultValue: "Ordered",
        },
        priority: {
          type: Sequelize.STRING,
          field: "priority",
          defaultValue: "routine",
        },
        notes: { type: Sequelize.TEXT, field: "notes" },
        result_value: { type: Sequelize.TEXT, field: "result_value" },
        ordered_at: {
          type: Sequelize.DATE,
          field: "ordered_at",
          defaultValue: Sequelize.NOW,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "patient_allergies",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "clinic_patient", key: "id" },
          field: "clinic_patient_id",
          allowNull: false,
        },
        allergy_name: {
          type: Sequelize.STRING,
          field: "allergy_name",
          allowNull: false,
        },
        severity: {
          type: Sequelize.STRING,
          field: "severity",
          defaultValue: "unknown",
        },
        reaction: {
          type: Sequelize.STRING,
          field: "reaction",
          allowNull: true,
        },
        recorded_by: {
          type: Sequelize.INTEGER,
          field: "recorded_by",
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "patient_self_data",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        patient_profile_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "patient_profile", key: "id" },
          field: "patient_profile_id",
          allowNull: true,
        },
        data_type: {
          type: Sequelize.STRING,
          field: "data_type",
          allowNull: true,
        },
        data: { type: Sequelize.JSON, field: "data", allowNull: true },
        entry_time: {
          type: Sequelize.DATE,
          field: "entry_time",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "prescription",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: true,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          field: "clinic_patient_id",
          allowNull: true,
        },
        clinic_doctor_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "clinic_doctor", key: "id" },
          field: "clinic_doctor_id",
          allowNull: true,
        },
        drug_catalog_id: {
          type: Sequelize.INTEGER,
          field: "drug_catalog_id",
          allowNull: true,
        },
        drug_name: {
          type: Sequelize.TEXT,
          field: "drug_name",
          allowNull: false,
        },
        dose: { type: Sequelize.STRING, field: "dose", allowNull: true },
        frequency: {
          type: Sequelize.STRING,
          field: "frequency",
          allowNull: true,
        },
        duration: {
          type: Sequelize.STRING,
          field: "duration",
          allowNull: true,
        },
        instructions: {
          type: Sequelize.TEXT,
          field: "instructions",
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          field: "is_active",
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "document_ocr_data",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        upload_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "report_upload", key: "id" },
          field: "upload_id",
          allowNull: true,
        },
        processed_text: {
          type: Sequelize.TEXT,
          field: "processed_text",
          allowNull: true,
        },
        parsed_json: {
          type: Sequelize.JSON,
          field: "parsed_json",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "invoice_service",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "invoice", key: "id" },
          field: "invoice_id",
          allowNull: false,
        },
        service_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "service", key: "id" },
          field: "service_id",
          allowNull: false,
        },
        price: { type: Sequelize.FLOAT, field: "price", allowNull: false },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "tasks",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "NO ACTION",
          references: { model: "users", key: "id" },
          field: "user_id",
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(150),
          field: "title",
          allowNull: false,
        },
        priority: {
          type: Sequelize.STRING,
          field: "priority",
          defaultValue: "normal",
        },
        is_completed: {
          type: Sequelize.BOOLEAN,
          field: "is_completed",
          defaultValue: false,
        },
        due_date: { type: Sequelize.DATE, field: "due_date", allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          field: "created_at",
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          field: "updated_at",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "vitals_entry",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        clinic_id: {
          type: Sequelize.INTEGER,
          field: "clinic_id",
          allowNull: false,
        },
        clinic_patient_id: {
          type: Sequelize.INTEGER,
          field: "clinic_patient_id",
          allowNull: false,
        },
        entry_date: {
          type: Sequelize.DATEONLY,
          field: "entry_date",
          defaultValue: Sequelize.NOW,
        },
        entry_time: { type: Sequelize.TIME, field: "entry_time" },
        recorded_by_admin_id: {
          type: Sequelize.INTEGER,
          field: "recorded_by_admin_id",
        },
        appointment_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
          references: { model: "appointment", key: "id" },
          field: "appointment_id",
          allowNull: true,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "createTable",
    params: [
      "vitals_recorded_value",
      {
        id: {
          type: Sequelize.INTEGER,
          field: "id",
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        vitals_entry_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "vitals_entry", key: "id" },
          field: "vitals_entry_id",
          allowNull: false,
        },
        config_id: {
          type: Sequelize.INTEGER,
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          references: { model: "clinic_vital_config", key: "id" },
          field: "config_id",
          allowNull: false,
        },
        vital_value: {
          type: Sequelize.STRING,
          field: "vital_value",
          allowNull: false,
        },
      },
      { transaction },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "patient_allergies",
      ["clinic_patient_id"],
      {
        indexName: "patient_allergies_clinic_patient_id",
        name: "patient_allergies_clinic_patient_id",
        transaction,
      },
    ],
  },
  {
    fn: "addIndex",
    params: [
      "tasks",
      ["user_id", "is_completed"],
      {
        indexName: "tasks_user_id_is_completed",
        name: "tasks_user_id_is_completed",
        transaction,
      },
    ],
  },
];

const rollbackCommands = (transaction) => [
  {
    fn: "dropTable",
    params: ["appointment", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["appointment_diagnosis", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["appointment_slot", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["availability_exception", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_admin", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_doctor", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_patient", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_vital_config", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_vital_template", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["clinic_vital_template_member", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["consultation_note", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["consultation_note_history", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["diagnosis_catalog", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["doctor_availability", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["doctor_profile", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["doctor_vital_assignment", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["document_ocr_data", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["drug_catalog", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["invoice", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["invoice_service", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["lab_catalog", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["lab_order", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["patient_allergies", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["patient_profile", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["patient_self_data", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["prescription", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["report_upload", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["service", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["tasks", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["users", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["vitals_entry", { transaction }],
  },
  {
    fn: "dropTable",
    params: ["vitals_recorded_value", { transaction }],
  },
];

const pos = 0;
const useTransaction = true;

const execute = (queryInterface, sequelize, _commands) => {
  let index = pos;
  const run = (transaction) => {
    const commands = _commands(transaction);
    return new Promise((resolve, reject) => {
      const next = () => {
        if (index < commands.length) {
          const command = commands[index];
          console.log(`[#${index}] execute: ${command.fn}`);
          index++;
          queryInterface[command.fn](...command.params).then(next, reject);
        } else resolve();
      };
      next();
    });
  };
  if (useTransaction) return queryInterface.sequelize.transaction(run);
  return run(null);
};

module.exports = {
  pos,
  useTransaction,
  up: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, migrationCommands),
  down: (queryInterface, sequelize) =>
    execute(queryInterface, sequelize, rollbackCommands),
  info,
};
