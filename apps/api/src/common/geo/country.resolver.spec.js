const { getRequestCountry } = require('./country.resolver.ts');

describe('country.resolver', () => {
  test('prefers CF-IPCountry header', () => {
    process.env.NODE_ENV = 'production';
    const req = { headers: { 'cf-ipcountry': 'ro', 'x-vercel-ip-country': 'us' } };
    expect(getRequestCountry(req)).toBe('RO');
  });

  test('falls back to x-vercel-ip-country', () => {
    process.env.NODE_ENV = 'production';
    const req = { headers: { 'x-vercel-ip-country': 'de' } };
    expect(getRequestCountry(req)).toBe('DE');
  });

  test('accepts x-debug-country only in non-production', () => {
    process.env.NODE_ENV = 'test';
    const req = { headers: { 'x-debug-country': 'ro' } };
    expect(getRequestCountry(req)).toBe('RO');
  });

  test('ignores x-debug-country in production', () => {
    process.env.NODE_ENV = 'production';
    const req = { headers: { 'x-debug-country': 'ro' } };
    expect(getRequestCountry(req)).toBe(null);
  });
});
