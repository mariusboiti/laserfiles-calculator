const {
  computeHmacSha256Hex,
  computeWpSsoSignatureHex,
  secureCompareHex,
} = require('./wp-hmac');

describe('wp-hmac', () => {
  test('computes deterministic hmac sha256 hex', () => {
    const sig1 = computeHmacSha256Hex('hello', 'secret');
    const sig2 = computeHmacSha256Hex('hello', 'secret');
    const sig3 = computeHmacSha256Hex('hello!', 'secret');

    expect(sig1).toHaveLength(64);
    expect(sig1).toEqual(sig2);
    expect(sig1).not.toEqual(sig3);
  });

  test('secureCompareHex checks equality', () => {
    const a = 'a'.repeat(64);
    const b = 'a'.repeat(64);
    const c = 'b'.repeat(64);

    expect(secureCompareHex(a, b)).toBe(true);
    expect(secureCompareHex(a, c)).toBe(false);
    expect(secureCompareHex(a, 'a')).toBe(false);
  });

  test('computes wp sso signature payload as wpUserId|email|iat', () => {
    const sig = computeWpSsoSignatureHex({
      wpUserId: 123,
      email: 'user@example.com',
      iat: 1730000000,
      secret: 'sso-secret',
    });

    const expected = computeHmacSha256Hex(
      '123|user@example.com|1730000000',
      'sso-secret',
    );
    expect(sig).toEqual(expected);
  });
});
