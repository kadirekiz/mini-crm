const express = require('express');
const router = express.Router();

const productService = require('../services/productService');
const logger = require('../lib/logger');
const { ValidationError } = require('../errors');

const ALLOWED_FIELDS = ['name', 'sku', 'description', 'price', 'trackStock', 'stockQuantity'];

function parseId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Geçersiz id', { id: param });
  }
  return id;
}

function pickAllowed(body) {
  const out = {};
  for (const k of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  }
  return out;
}

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const products = await productService.listProducts({ includeInactive });
    res.json(products);
  } catch (err) {
    logger.error('products_list_error', { err });
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const includeInactive = req.query.includeInactive === 'true';
    const product = await productService.getProductById(id, { includeInactive });
    res.json(product);
  } catch (err) {
    logger.error('products_get_error', { err });
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const payload = pickAllowed(req.body || {});
    const created = await productService.createProduct(payload);
    res.status(201).json(created);
  } catch (err) {
    logger.error('products_create_error', { err });
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const payload = pickAllowed(req.body || {});
    const updated = await productService.updateProduct(id, payload);
    res.json(updated);
  } catch (err) {
    logger.error('products_update_error', { err });
    next(err);
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await productService.deactivateProduct(id);
    res.status(204).send();
  } catch (err) {
    logger.error('products_delete_error', { err });
    next(err);
  }
});

module.exports = router;
