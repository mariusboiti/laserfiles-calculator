import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const token =
      (request as any).cookies?.lf_access_token ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return false;
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      );
      (request as any).user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
