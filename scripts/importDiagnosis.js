const fs = require('fs');
const { parse } = require('csv-parse'); // Ensure 'csv-parse' is installed
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = ''; // Or hardcode
const sequelize = new Sequelize(DATABASE_URL, { logging: false });

const DiagnosisCatalog = sequelize.define('DiagnosisCatalog', {
  name: DataTypes.TEXT,
  type: DataTypes.STRING,
  snomed_code: DataTypes.STRING,
  snomed_fsn: DataTypes.TEXT,
  icd_code: DataTypes.STRING,
  icd_description: DataTypes.TEXT,
  body_system: DataTypes.STRING,
  clinical_specialty: DataTypes.STRING,
  search_aliases: DataTypes.TEXT,
  is_active: DataTypes.BOOLEAN
}, { tableName: 'diagnosis_catalog', timestamps: false });

async function runImport() {
  await sequelize.authenticate();
  console.log("🚀 Starting Diagnosis Import...");
  
  // 1. Setup Stream
  const parser = fs.createReadStream('diagnosis_data.csv').pipe(parse({
    columns: true, skip_empty_lines: true, trim: true
  }));

  let batch = [];
  let total = 0;

  // 2. Map Your Data Fields
  for await (const row of parser) {
    batch.push({
      name: row.diagnosis_name,
      type: row.diagnosis_type,
      snomed_code: row.snomed_ct_code,
      snomed_fsn: row.snomed_ct_fsn,
      icd_code: row.icd10_code,
      icd_description: row.icd10_description,
      body_system: row.body_system,
      clinical_specialty: row.clinical_specialty,
      // Create a rich search text
      search_aliases: `${row.snomed_ct_fsn} ${row.icd10_description} ${row.body_system}`,
      is_active: true
    });

    if (batch.length >= 1000) {
      await DiagnosisCatalog.bulkCreate(batch);
      total += batch.length;
      console.log(`✅ Imported ${total} rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) await DiagnosisCatalog.bulkCreate(batch);
  console.log("🎉 DONE!");
  process.exit();
}

runImport();