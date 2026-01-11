const { Product } = require('../models');
const logger = require('../lib/logger');
const { NotFoundError, ConflictError, ValidationError } = require('../errors');

function normalizeProductPayload(payload = {}) {
  const out = {};

  if (payload.name !== undefined) out.name = String(payload.name).trim();
  if (payload.sku !== undefined) out.sku = String(payload.sku).trim();
  if (payload.description !== undefined) {
    const v = payload.description === null ? null : String(payload.description).trim();
    out.description = v === '' ? null : v;
  }

  if (payload.price !== undefined) {
    const num = Number(payload.price);
    if (!Number.isFinite(num) || num < 0) throw new ValidationError('Geçersiz fiyat', { price: payload.price });
    out.price = num.toFixed(2);
  }

  if (payload.trackStock !== undefined) out.trackStock = Boolean(payload.trackStock);

  if (payload.stockQuantity !== undefined) {
    if (payload.stockQuantity === null) {
      out.stockQuantity = null;
    } else {
      const q = Number(payload.stockQuantity);
      if (!Number.isInteger(q) || q < 0) throw new ValidationError('Geçersiz stok miktarı', { stockQuantity: payload.stockQuantity });
      out.stockQuantity = q;
    }
  }

  return out;
}

async function listProducts({ includeInactive = false } = {}) {
  const where = includeInactive ? {} : { isActive: true };
  return Product.findAll({ where, order: [['id', 'ASC']] });
}

async function getProductById(id, { includeInactive = false } = {}) {
  const where = includeInactive ? { id } : { id, isActive: true };
  const p = await Product.findOne({ where });
  if (!p) throw new NotFoundError('Ürün bulunamadı', { id });
  return p;
}

async function createProduct(payload) {
  const data = normalizeProductPayload(payload);

  if (!data.name) throw new ValidationError('name zorunlu', { field: 'name' });
  if (!data.sku) throw new ValidationError('sku zorunlu', { field: 'sku' });
  if (data.price === undefined) throw new ValidationError('price zorunlu', { field: 'price' });

  // trackStock true ise stockQuantity boş gelmesin (default 0)
  if (data.trackStock !== false && data.stockQuantity === undefined) data.stockQuantity = 0;
  if (data.trackStock === false) data.stockQuantity = null;

  try {
    const created = await Product.create(data);
    logger.info('product_create', { sku: created.sku });
    return created;
  } catch (err) {
    // SKU unique
    if (String(err?.name).includes('SequelizeUniqueConstraintError')) {
      throw new ConflictError('SKU zaten kullanılıyor', { sku: data.sku });
    }
    throw err;
  }
}

async function updateProduct(id, payload) {
  const p = await getProductById(id, { includeInactive: true });
  const data = normalizeProductPayload(payload);

  if (data.trackStock === false) {
    data.stockQuantity = null;
  } else if (data.trackStock === true) {
    if (data.stockQuantity === undefined) data.stockQuantity = p.stockQuantity ?? 0;
  }

  try {
    await p.update(data);
    return p;
  } catch (err) {
    if (String(err?.name).includes('SequelizeUniqueConstraintError')) {
      throw new ConflictError('SKU zaten kullanılıyor', { sku: data.sku });
    }
    throw err;
  }
}

async function deactivateProduct(id) {
  const p = await getProductById(id, { includeInactive: true });
  if (p.isActive === false) return p;
  await p.update({ isActive: false });
  return p;
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct
};
