const { sequelize, Order, OrderItem, Customer, Product } = require('../models');
const logger = require('../lib/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

const ALLOWED_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'];

function parsePositiveInt(v, field) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError(`Geçersiz ${field}`, { [field]: v });
  return n;
}

function normalizeGuest(payload = {}) {
  if (!payload) return {};
  const out = {};
  if (payload.firstName !== undefined) out.guestFirstName = String(payload.firstName).trim() || null;
  if (payload.lastName !== undefined) out.guestLastName = payload.lastName === null ? null : String(payload.lastName).trim();
  if (payload.email !== undefined) {
    const v = payload.email === null ? null : String(payload.email).trim().toLowerCase();
    out.guestEmail = v === '' ? null : v;
  }
  if (payload.phone !== undefined) {
    const v = payload.phone === null ? null : String(payload.phone).trim();
    out.guestPhone = v === '' ? null : v;
  }
  return out;
}

async function listOrders({ status, customerId, includeItems = false, limit = 20 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const include = includeItems ? [{
    model: OrderItem,
    as: 'items',
    include: [{ model: Product, as: 'product' }]
  }, {
    model: Customer
  }] : undefined;

  return Order.findAll({ where, include, order: [['id', 'DESC']], limit });
}

async function getOrderById(id, transaction) {
  const o = await Order.findByPk(id, {
    transaction,
    include: [{
      model: OrderItem,
      as: 'items',
      include: [{ model: Product, as: 'product' }]
    }, {
      model: Customer
    }]
  });
  if (!o) throw new NotFoundError('Sipariş bulunamadı', { id });
  return o;
}

async function createOrder(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items : null;
  if (!items || items.length === 0) throw new ValidationError('Sipariş kalemleri (items) zorunlu', { field: 'items' });

  const customerId = payload.customerId !== undefined && payload.customerId !== null
    ? parsePositiveInt(payload.customerId, 'customerId')
    : null;

  const guest = normalizeGuest(payload.guest);

  const shippingAddress = payload.shippingAddress !== undefined && payload.shippingAddress !== null
    ? String(payload.shippingAddress).trim()
    : null;

  if (!customerId) {
    if (!guest.guestFirstName) throw new ValidationError('Guest sipariş için guest.firstName zorunlu', { field: 'guest.firstName' });
    if (!shippingAddress) throw new ValidationError('Guest sipariş için shippingAddress zorunlu', { field: 'shippingAddress' });
  }

  return sequelize.transaction(async (t) => {
    // Customer varsa doğrula
    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ where: { id: customerId, isActive: true }, transaction: t });
      if (!customer) throw new NotFoundError('Müşteri bulunamadı', { customerId });

      // shippingAddress verilmemişse müşteri adresini kullan
      if (!shippingAddress) {
        const addr = customer.address ? String(customer.address).trim() : null;
        if (!addr) throw new ValidationError('shippingAddress zorunlu (müşterinin kayıtlı adresi yok)', { field: 'shippingAddress' });
      }
    }

    const effectiveShippingAddress = shippingAddress || (customer ? (customer.address ? String(customer.address).trim() : null) : null);

    // Order oluştur
    const order = await Order.create({
      customerId: customerId,
      ...(!customerId ? guest : {}),
      shippingAddress: effectiveShippingAddress,
      status: 'pending',
      totalAmount: 0
    }, { transaction: t });

    let total = 0;

    for (const rawItem of items) {
      const productId = parsePositiveInt(rawItem.productId, 'productId');
      const quantity = parsePositiveInt(rawItem.quantity, 'quantity');

      // Ürünü kilitleyerek oku (stok için)
      const product = await Product.findOne({
        where: { id: productId, isActive: true },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!product) throw new NotFoundError('Ürün bulunamadı', { productId });

      if (product.trackStock) {
        const stock = product.stockQuantity ?? 0;
        if (stock < quantity) {
          throw new ConflictError('Yetersiz stok', { productId, requested: quantity, available: stock });
        }
        await product.update({ stockQuantity: stock - quantity }, { transaction: t });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * quantity;
      total += lineTotal;

      await OrderItem.create({
        orderId: order.id,
        productId: product.id,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2)
      }, { transaction: t });
    }

    await order.update({ totalAmount: total.toFixed(2) }, { transaction: t });

    logger.info('order_create', {
      orderId: order.id,
      hasCustomer: Boolean(customerId),
      itemsCount: items.length
    });

    // Aynı transaction içinde okursak, henüz commit edilmemiş kaydı görebiliriz.
    return getOrderById(order.id, t);
  });
}

async function updateOrderStatus(id, newStatus) {
  const status = String(newStatus).trim();
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ValidationError('Geçersiz status', { status, allowed: ALLOWED_STATUSES });
  }
  const o = await Order.findByPk(id);
  if (!o) throw new NotFoundError('Sipariş bulunamadı', { id });

  await o.update({ status });
  return getOrderById(id);
}

module.exports = {
  ALLOWED_STATUSES,
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus
};
