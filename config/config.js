require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
     timezone: '+00:00',
    dialectOptions: {
      useUTC: true,
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    timezone: '+00:00',
    dialectOptions: {
      useUTC: true,
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
