const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

afterAll(async () => {
  await sequelize.close();
});

describe('MiniCRM API (Customers + Products + Orders)', () => {
  test('GET /api/customers initially returns empty array', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('POST /api/customers creates customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ firstName: 'Test', lastName: 'User', address: 'Istanbul' });

    expect(res.statusCode).toBe(201);
    expect(res.body.firstName).toBe('Test');
  });

  test('GET /api/customers returns exactly one active customer', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].isActive).toBe(true);
  });

  test('GET /api/customers/:id returns created customer', async () => {
    const list = await request(app).get('/api/customers');
    const id = list.body[0].id;

    const res = await request(app).get(`/api/customers/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.firstName).toBe('Test');
  });

  test('PUT /api/customers/:id updates customer', async () => {
    const list = await request(app).get('/api/customers');
    const id = list.body[0].id;

    const res = await request(app).put(`/api/customers/${id}`).send({ lastName: 'User2' });
    expect(res.statusCode).toBe(200);
    expect(res.body.lastName).toBe('User2');
  });

  test('Products CRUD works', async () => {
    const create = await request(app)
      .post('/api/products')
      .send({ name: 'Keyboard', sku: 'KB-001', price: 199.9, trackStock: true, stockQuantity: 5 });
    expect(create.statusCode).toBe(201);
    expect(create.body.sku).toBe('KB-001');

    const list = await request(app).get('/api/products');
    expect(list.statusCode).toBe(200);
    expect(list.body.length).toBe(1);

    const id = list.body[0].id;

    const get = await request(app).get(`/api/products/${id}`);
    expect(get.statusCode).toBe(200);
    expect(get.body.name).toBe('Keyboard');

    const upd = await request(app).put(`/api/products/${id}`).send({ stockQuantity: 4 });
    expect(upd.statusCode).toBe(200);
    expect(upd.body.stockQuantity).toBe(4);

    const del = await request(app).delete(`/api/products/${id}`);
    expect(del.statusCode).toBe(204);

    const activeList = await request(app).get('/api/products');
    expect(activeList.body.length).toBe(0);

    const allList = await request(app).get('/api/products?includeInactive=true');
    expect(allList.body.length).toBe(1);
    expect(allList.body[0].isActive).toBe(false);
  });

  test('Order create (customer) consumes stock and returns items', async () => {
    // create a new product with stock=3
    const p = await request(app)
      .post('/api/products')
      .send({ name: 'Mouse', sku: 'MS-001', price: 50, trackStock: true, stockQuantity: 3 });
    expect(p.statusCode).toBe(201);
    const productId = p.body.id;

    const customers = await request(app).get('/api/customers');
    const customerId = customers.body[0].id;

    const order = await request(app)
      .post('/api/orders')
      .send({
        customerId,
        items: [{ productId, quantity: 2 }]
      });
    // customer address already Istanbul in previous test, so shippingAddress can be omitted
    expect(order.statusCode).toBe(201);
    expect(order.body.customerId).toBe(customerId);
    expect(order.body.items.length).toBe(1);
    expect(order.body.totalAmount).toBe('100.00');

    const prodAfter = await request(app).get(`/api/products/${productId}?includeInactive=true`);
    expect(prodAfter.body.stockQuantity).toBe(1);
  });

  test('Order create (guest) works', async () => {
    // Create product with trackStock=false
    const p = await request(app)
      .post('/api/products')
      .send({ name: 'E-Book', sku: 'EB-001', price: 10, trackStock: false });
    expect(p.statusCode).toBe(201);

    const order = await request(app)
      .post('/api/orders')
      .send({
        guest: { firstName: 'Ada', lastName: 'Lovelace' },
        shippingAddress: 'Istanbul',
        items: [{ productId: p.body.id, quantity: 1 }]
      });

    expect(order.statusCode).toBe(201);
    expect(order.body.customerId).toBe(null);
    expect(order.body.guestFirstName).toBe('Ada');
    expect(order.body.items.length).toBe(1);
    expect(order.body.totalAmount).toBe('10.00');
  });

  test('Order create returns 409 when stock is insufficient', async () => {
    const p = await request(app)
      .post('/api/products')
      .send({ name: 'Limited', sku: 'LIM-001', price: 5, trackStock: true, stockQuantity: 1 });
    expect(p.statusCode).toBe(201);

    const customers = await request(app).get('/api/customers');
    const customerId = customers.body[0].id;

    const order = await request(app)
      .post('/api/orders')
      .send({ customerId, items: [{ productId: p.body.id, quantity: 2 }] });

    expect(order.statusCode).toBe(409);
    expect(order.body.code).toBe('CONFLICT');
    expect(order.body.message.toLowerCase()).toContain('stok');
    expect(order.body.details).toMatchObject({ productId: p.body.id, requested: 2, available: 1 });

    // Stock should remain unchanged after failure
    const prodAfter = await request(app).get(`/api/products/${p.body.id}?includeInactive=true`);
    expect(prodAfter.statusCode).toBe(200);
    expect(prodAfter.body.stockQuantity).toBe(1);
  });

  test('Order status update works', async () => {
    const orders = await request(app).get('/api/orders?includeItems=true');
    expect(orders.statusCode).toBe(200);
    expect(orders.body.length).toBeGreaterThan(0);
    const id = orders.body[0].id;

    // includeItems=true returns items array (can be empty if no items were created, but should exist)
    expect(orders.body[0]).toHaveProperty('items');

    const upd = await request(app).patch(`/api/orders/${id}/status`).send({ status: 'shipped' });
    expect(upd.statusCode).toBe(200);
    expect(upd.body.status).toBe('shipped');
  });

  test('DELETE /api/customers/:id soft deletes customer', async () => {
    const list = await request(app).get('/api/customers');
    const id = list.body[0].id;

    const del = await request(app).delete(`/api/customers/${id}`);
    expect(del.statusCode).toBe(204);

    const activeList = await request(app).get('/api/customers');
    expect(activeList.body.length).toBe(0);

    const allList = await request(app).get('/api/customers?includeInactive=true');
    expect(allList.body.length).toBe(1);
    expect(allList.body[0].isActive).toBe(false);
  });
});
