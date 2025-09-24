
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env]; 
const db = {};

let sequelize;
if (config.use_env_variable) {
  // This block is for PRODUCTION (uses the DATABASE_URL from Render)
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  // This block is for DEVELOPMENT (uses the .env file from your local machine)
  // I've simplified this line slightly to pass the whole config object.
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.js') && file !== 'index.js')
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// CRUCIAL ADDITION: Call the associate method for each model if it exists
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;