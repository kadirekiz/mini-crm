/**
 * MiniCRM OpenAPI 3.0 dokümanı (minimal iskelet).
 * Hoca için: endpoint'ler, request/response şemaları ve örnekler ileride detaylandırılabilir.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'MiniCRM API',
    version: '0.1.0',
    description: 'MiniCRM - Müşteri, ürün ve sipariş yönetimi API'
  },
  servers: [{ url: 'http://localhost:3000' }],
  tags: [
    { name: 'Health' },
    { name: 'Customers' },
    { name: 'Products' },
    { name: 'Orders' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Servis sağlık kontrolü',
        responses: { '200': { description: 'OK' } }
      }
    },

    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Müşterileri listele',
        parameters: [
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Soft-deleted müşteriler de gelsin mi?'
          }
        ],
        responses: { '200': { description: 'Customer[]' } }
      },
      post: {
        tags: ['Customers'],
        summary: 'Müşteri oluştur',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Customer' }, '400': { description: 'Validation error' } }
      }
    },
    '/api/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Müşteri getir',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Customer' }, '404': { description: 'Not found' } }
      },
      put: {
        tags: ['Customers'],
        summary: 'Müşteri güncelle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Customer' }, '400': { description: 'Validation error' }, '404': { description: 'Not found' } }
      },
      delete: {
        tags: ['Customers'],
        summary: 'Müşteri soft delete',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } }
      }
    },

    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Ürünleri listele',
        parameters: [
          {
            name: 'includeInactive',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Soft-deleted ürünler de gelsin mi?'
          }
        ],
        responses: { '200': { description: 'Product[]' } }
      },
      post: {
        tags: ['Products'],
        summary: 'Ürün oluştur',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '201': { description: 'Product' }, '400': { description: 'Validation error' } }
      }
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Ürün getir',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Product' }, '404': { description: 'Not found' } }
      },
      put: {
        tags: ['Products'],
        summary: 'Ürün güncelle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Product' }, '400': { description: 'Validation error' }, '404': { description: 'Not found' } }
      },
      delete: {
        tags: ['Products'],
        summary: 'Ürün soft delete',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } }
      }
    },

    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Siparişleri listele',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'integer' } },
          { name: 'includeItems', in: 'query', schema: { type: 'boolean', default: false } }
        ],
        responses: { '200': { description: 'Order[]' } }
      },
      post: {
        tags: ['Orders'],
        summary: 'Sipariş oluştur (customer veya guest)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          '201': { description: 'Order' },
          '400': { description: 'Validation error' },
          '404': { description: 'Customer/Product not found' },
          '409': { description: 'Insufficient stock' }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Sipariş getir (items dahil)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'Order' }, '404': { description: 'Not found' } }
      }
    },
    '/api/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Sipariş durum güncelle',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Order' }, '400': { description: 'Validation error' }, '404': { description: 'Not found' } }
      }
    }
  }
};
