import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { computeHmacSha256Base64, secureCompareString } from '../wp-hmac';

@Injectable()
export class WpEntitlementWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    const signatureHeader = (req.headers['x-wc-webhook-signature'] || req.headers['x-wp-signature']) as
      | string
      | string[]
      | undefined;

    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const secret =
      process.env.WP_WEBHOOK_SECRET ||
      process.env.LASERFILES_WEBHOOK_SECRET ||
      process.env.LASERFILES_API_KEY ||
      '';

    if (!secret) {
      throw new BadRequestException('Webhook not configured');
    }

    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body for signature verification');
    }

    const expected = computeHmacSha256Base64(rawBody, secret);
    if (!secureCompareString(String(signature).trim(), expected)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
