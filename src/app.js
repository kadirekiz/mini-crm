const express = require('express');
const { randomUUID } = require('crypto');

const config = require('./config');
const logger = require('./lib/logger');
const { AppError } = require('./errors');

const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');
const productsRouter = require('./routes/products');

// Swagger UI
const swaggerUi = require('swagger-ui-express');
const openapiDoc = require('./docs/openapi');

const app = express();

app.use(express.json());

// Trace / Request ID
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs
    });
  });

  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// API Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: 'Not Found',
    code: 'NOT_FOUND',
    requestId: req.requestId
  });
});

// Error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId;

  let status = 500;
  let payload = {
    message: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    requestId
  };

  if (err instanceof AppError) {
    status = err.status;
    payload = {
      message: err.message,
      code: err.code,
      requestId,
      details: err.details
    };
  } else if (err && typeof err === 'object' && 'message' in err) {
    payload.message = String(err.message);
    payload.details = { stack: err?.stack };
  }

  logger.error('unhandled_error', {
    requestId,
    status,
    code: payload.code,
    err: { message: err?.message, stack: err?.stack }
  });

  res.status(status).json(payload);
});

module.exports = app;
