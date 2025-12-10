import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURES_KEY } from '../decorators/features.decorator';
import { EntitlementsService } from '../../entitlements/entitlements.service';

@Injectable()
export class EntitlementsGuard implements CanActivate {
  private readonly entitlementsService = new EntitlementsService();

  constructor(private readonly reflector: Reflector = new Reflector()) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing user for entitlements');
    }

    const wpUserId = String(user.wpUserId || user.sub || user.id);
    const entitlements = await this.entitlementsService.getEntitlementsForWpUser(wpUserId);
    request.entitlements = entitlements;

    const requiredFeatures = this.reflector.getAllAndOverride<string[]>(FEATURES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    for (const feature of requiredFeatures) {
      if (!entitlements.features[feature]) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'FEATURE_LOCKED',
          feature,
          message: `Feature ${feature} is locked for your current plan.`,
        } as any);
      }
    }

    return true;
  }
}
