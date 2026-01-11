const { createLogger, transports, format } = require('winston');

const env = process.env.NODE_ENV || 'development';
const level = process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug');

const logger = createLogger({
  level,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [new transports.Console({ silent: env === 'test' })]
});

module.exports = logger;
