import * as crypto from 'crypto';

export function computeHmacSha256Hex(payload: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function computeWpSsoSignatureHex(params: {
  wpUserId: number | string;
  email: string;
  iat: number;
  secret: string;
}): string {
  return computeHmacSha256Hex(`${params.wpUserId}|${params.email}|${params.iat}`, params.secret);
}

export function secureCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}


export function computeHmacSha256Base64(payload: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64");
}

export function secureCompareString(a: string, b: string): boolean {
  const ab = Buffer.from(a ?? "", "utf8");
  const bb = Buffer.from(b ?? "", "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
