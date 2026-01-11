const express = require('express');
const router = express.Router();

const customerService = require('../services/customerService');
const logger = require('../lib/logger');
const { ValidationError } = require('../errors');

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'address'];

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Geçersiz id', { id: param });
  }
  return id;
}

function validateAllowedFields(body) {
  const keys = Object.keys(body || {});
  const unknown = keys.filter(k => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) {
    throw new ValidationError('Bilinmeyen alan(lar) gönderildi', { unknown });
  }
}

function validateEmail(email) {
  if (email === null || email === undefined || email === '') return;
  const s = String(email).trim();
  // Basit kontrol (ödev için yeterli)
  if (!s.includes('@') || s.startsWith('@') || s.endsWith('@')) {
    throw new ValidationError('Geçersiz email', { email });
  }
}

function validateCreateCustomer(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Body zorunludur');
  }

  validateAllowedFields(body);

  if (body.firstName === undefined || String(body.firstName).trim() === '') {
    throw new ValidationError('firstName zorunludur');
  }

  validateEmail(body.email);
}

function validateUpdateCustomer(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Body zorunludur');
  }

  validateAllowedFields(body);

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw new ValidationError('Güncellenecek en az bir alan göndermelisiniz');
  }

  if (body.firstName !== undefined && String(body.firstName).trim() === '') {
    throw new ValidationError('firstName boş olamaz');
  }

  validateEmail(body.email);
}

// GET /api/customers?includeInactive=true
router.get('/', async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive || 'false').toLowerCase() === 'true';
    const customers = await customerService.listCustomers({ includeInactive });
    res.json(customers);
  } catch (err) {
    logger.error('customers_list_error', { err });
    next(err);
  }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    validateCreateCustomer(req.body);
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err) {
    logger.error('customers_create_error', { err });
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const customer = await customerService.getCustomerById(id);
    res.json(customer);
  } catch (err) {
    logger.error('customers_get_error', { err });
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    validateUpdateCustomer(req.body);

    const customer = await customerService.updateCustomer(id, req.body);
    res.json(customer);
  } catch (err) {
    logger.error('customers_update_error', { err });
    next(err);
  }
});

// DELETE /api/customers/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await customerService.deactivateCustomer(id);
    res.status(204).send();
  } catch (err) {
    logger.error('customers_delete_error', { err });
    next(err);
  }
});

module.exports = router;
