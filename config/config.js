require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
  },
  production: {
    // This tells Sequelize to use the DATABASE_URL environment variable
    // we set up in the Render dashboard.
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      // This is required for connecting to Neon
      ssl: {
        require: true,
        rejectUnauthorized: false, // This may be needed to avoid certificate errors
      },
    },
  },
};
