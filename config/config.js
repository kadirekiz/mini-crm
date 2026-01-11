// Sequelize CLI config
// Not: Uygulama runtime config'i src/config/index.js altında.
// CLI'nin (migration) çalışabilmesi için ayrı bir config dosyası gerekiyor.

require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || null,
  database: process.env.DB_NAME || 'mini_crm',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
  logging: false
};

module.exports = {
  development: { ...base },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'mini_crm_test'
  },
  production: { ...base }
};
