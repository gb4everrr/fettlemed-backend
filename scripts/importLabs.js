const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const DATABASE_URL = '';

if (!DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not set.");
    process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

const LabCatalog = sequelize.define('LabCatalog', {
    test_name: { type: DataTypes.TEXT, allowNull: false, unique: true }, // Added unique
    test_code: { type: DataTypes.TEXT },
    search_aliases: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING },
    unit: { type: DataTypes.TEXT },
    reference_range: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { 
    tableName: 'lab_catalog', 
    timestamps: false 
});

async function runImport() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        // 1. Ensure Table Exists
        await LabCatalog.sync(); 

        // 2. Read File
        // Make sure the filename matches exactly what is in your folder!
        const csvPath = path.resolve(__dirname, '../Combined Standardised List.csv'); 
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File not found at: ${csvPath}`);
        }

        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log(`🚀 Found ${records.length} records. Processing...`);

        // 3. Map CSV Headers to DB Columns Safely
        // This fixes issues if your CSV has "Test Name" instead of "test_name"
        const formattedRecords = records.map(r => ({
            test_name: r.test_name || r['Test Name'] || r['name'],
            test_code: r.test_code || r['Test Code'] || r['code'],
            category: r.category || r['Category'],
            unit: r.unit || r['Unit'],
            reference_range: r.reference_range || r['Reference Range'],
            search_aliases: r.search_aliases || `${r.test_name || ''} ${r.test_code || ''}`,
            is_active: true
        })).filter(r => r.test_name); // Skip empty rows

        // 4. Import in Batches (Prevents SSL Errors)
        const BATCH_SIZE = 500;
        for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
            const batch = formattedRecords.slice(i, i + BATCH_SIZE);
            
            await LabCatalog.bulkCreate(batch, { 
                updateOnDuplicate: ['test_code', 'category', 'unit', 'reference_range', 'search_aliases'] 
            });
            
            process.stdout.write(`\r✅ Processed ${Math.min(i + BATCH_SIZE, formattedRecords.length)} / ${formattedRecords.length}`);
        }

        console.log('\n🎉 Import Complete!');
        process.exit();

    } catch (err) {
        console.error('\n❌ IMPORT FAILED:', err.message);
        if (err.parent) console.error('Details:', err.parent.message); // Logs the SQL error
        process.exit(1);
    }
}

runImport();