const { normalizeEmail, normalizePhone } = require('../../scripts/etl/normalize');

describe('ETL normalize', () => {
  test('normalizeEmail: lowercases valid email', () => {
    const r = normalizeEmail('Ada@Example.com');
    expect(r.ok).toBe(true);
    expect(r.value).toBe('ada@example.com');
  });

  test('normalizeEmail: invalid becomes null', () => {
    const r = normalizeEmail('noname@example');
    expect(r.ok).toBe(false);
    expect(r.value).toBe(null);
  });

  test('normalizePhone: TR formats to +90XXXXXXXXXX', () => {
    const r1 = normalizePhone('0555 111 22 33');
    expect(r1.ok).toBe(true);
    expect(r1.value).toBe('+905551112233');

    const r2 = normalizePhone('+90 (555) 111-22-33');
    expect(r2.ok).toBe(true);
    expect(r2.value).toBe('+905551112233');
  });

  test('normalizePhone: invalid returns null', () => {
    const r = normalizePhone('123');
    expect(r.ok).toBe(false);
    expect(r.value).toBe(null);
  });
});
