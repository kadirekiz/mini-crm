const express = require('express');
const router = express.Router();

const orderService = require('../services/orderService');
const logger = require('../lib/logger');
const { ValidationError } = require('../errors');

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Geçersiz id', { id: param });
  }
  return id;
}

// GET /api/orders?status=&customerId=&includeItems=true
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const includeItems = String(req.query.includeItems || '').toLowerCase() === 'true';
    const orders = await orderService.listOrders({
      status,
      customerId: Number.isFinite(customerId) && customerId > 0 ? customerId : undefined,
      includeItems,
      limit: 50
    });
    res.json(orders);
  } catch (err) {
    logger.error('orders_list_error', { err });
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const order = await orderService.getOrderById(id);
    res.json(order);
  } catch (err) {
    logger.error('orders_get_error', { err });
    next(err);
  }
});

// POST /api/orders
router.post('/', async (req, res, next) => {
  try {
    const created = await orderService.createOrder(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    logger.error('orders_create_error', { err });
    next(err);
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const status = req.body?.status;
    if (status === undefined) throw new ValidationError('status zorunlu', { field: 'status' });

    const updated = await orderService.updateOrderStatus(id, status);
    res.json(updated);
  } catch (err) {
    logger.error('orders_status_error', { err });
    next(err);
  }
});

module.exports = router;
