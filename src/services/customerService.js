const { Customer } = require('../models');
const logger = require('../lib/logger');
const { NotFoundError } = require('../errors');

function normalizeCustomerPayload(payload = {}) {
  const out = {};

  if (payload.firstName !== undefined) out.firstName = String(payload.firstName).trim();
  if (payload.lastName !== undefined) out.lastName = payload.lastName === null ? null : String(payload.lastName).trim();

  if (payload.email !== undefined) {
    const v = payload.email === null ? null : String(payload.email).trim().toLowerCase();
    out.email = v === '' ? null : v;
  }

  if (payload.phone !== undefined) {
    const v = payload.phone === null ? null : String(payload.phone).trim();
    out.phone = v === '' ? null : v;
  }

  if (payload.address !== undefined) {
    const v = payload.address === null ? null : String(payload.address).trim();
    out.address = v === '' ? null : v;
  }

  return out;
}

async function listCustomers({ includeInactive = false } = {}) {
  return Customer.findAll({
    where: includeInactive ? {} : { isActive: true },
    limit: 50
  });
}

async function getCustomerById(id, { includeInactive = false } = {}) {
  const customer = await Customer.findOne({
    where: includeInactive ? { id } : { id, isActive: true }
  });

  if (!customer) {
    throw new NotFoundError('Müşteri bulunamadı', { id });
  }
  return customer;
}

async function createCustomer(payload) {
  const normalized = normalizeCustomerPayload(payload);

  logger.info('customer_create', {
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    hasEmail: Boolean(normalized.email),
    hasPhone: Boolean(normalized.phone)
  });

  const customer = await Customer.create(normalized);
  return customer;
}

async function updateCustomer(id, payload) {
  const customer = await getCustomerById(id, { includeInactive: true });

  const normalized = normalizeCustomerPayload(payload);
  await customer.update(normalized);

  return customer;
}

async function deactivateCustomer(id) {
  const customer = await getCustomerById(id, { includeInactive: true });
  if (customer.isActive === false) return customer;

  await customer.update({ isActive: false });
  return customer;
}

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer
};
