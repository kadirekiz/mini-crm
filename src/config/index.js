require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

// Not: test ortamında farklı DB kullanmak için
const resolvedDbName =
  env === 'test'
    ? (process.env.DB_NAME_TEST || process.env.DB_NAME || 'mini_crm_test')
    : (process.env.DB_NAME || 'mini_crm');

module.exports = {
  app: {
    port: process.env.APP_PORT || 3000,
    env
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    database: resolvedDbName,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || null,
    dialect: 'postgres',
    logging: false // TODO: loglama ile entegre edilecek
  }
};
