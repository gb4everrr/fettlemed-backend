const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Ensure this matches your .env key or hardcode it
const DATABASE_URL = '';

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing.");
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

// Define the model matching your DB
const DrugCatalog = sequelize.define('DrugCatalog', {
    name: { type: DataTypes.TEXT, allowNull: false },
    generic_name: { type: DataTypes.TEXT },
    strength: { type: DataTypes.STRING },
    form: { type: DataTypes.STRING },
    manufacturer: { type: DataTypes.TEXT },
    search_aliases: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { 
    tableName: 'drug_catalog', 
    timestamps: false 
});

// Helper for stability (Sleep function)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runImport() {
    try {
        await sequelize.authenticate();
        console.log("✅ Connected to DB.");

        // 1. Check existing progress
        const existingCount = await DrugCatalog.count();
        console.log(`📊 Current Database Rows: ${existingCount.toLocaleString()}`);

        // 2. Load CSV
        const csvPath = path.resolve(__dirname, '../drugs.csv'); // Ensure filename is correct
        if (!fs.existsSync(csvPath)) throw new Error("drugs.csv not found!");

        console.log("📂 Reading CSV file into memory...");
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        
        const allRecords = parse(fileContent, {
            columns: true, 
            skip_empty_lines: true, 
            trim: true
        });

        console.log(`📄 Total CSV Rows: ${allRecords.length.toLocaleString()}`);

        // 3. Determine where to start
        if (existingCount >= allRecords.length) {
            console.log("🎉 All rows seem to be imported already!");
            process.exit(0);
        }

        const remainingRecords = allRecords.slice(existingCount);
        console.log(`🚀 Resuming import from row ${existingCount + 1}.`);
        console.log(`📝 Rows left to import: ${remainingRecords.length.toLocaleString()}`);

        // 4. Map and Insert the Rest
        let batch = [];
        let totalProcessed = 0;
        const BATCH_SIZE = 500; // Small batch for network stability

        for (const row of remainingRecords) {
            batch.push({
                name: row.name || row.drug_name, // Adjust based on your CSV headers
                generic_name: row.generic_name || row.composition,
                strength: row.strength,
                form: row.form,
                manufacturer: row.manufacturer,
                search_aliases: `${row.name} ${row.generic_name || ''} ${row.manufacturer || ''}`,
                is_active: true
            });

            if (batch.length >= BATCH_SIZE) {
                await DrugCatalog.bulkCreate(batch);
                totalProcessed += batch.length;
                
                // Progress Bar
                const percent = Math.round((totalProcessed / remainingRecords.length) * 100);
                process.stdout.write(`\r⏳ Importing... ${percent}% (${totalProcessed} / ${remainingRecords.length})`);
                
                batch = [];
                
                // STABILITY FIX: Pause for 100ms to let the connection breathe
                await sleep(100); 
            }
        }

        // Final batch
        if (batch.length > 0) {
            await DrugCatalog.bulkCreate(batch);
        }

        console.log("\n✅ SUCCESS! All remaining drugs imported.");
        process.exit();

    } catch (error) {
        console.error("\n❌ Error during import:", error.message);
        process.exit(1);
    }
}

runImport();