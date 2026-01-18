import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token =
      (request as any).cookies?.lf_access_token ||
      request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return true;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-access-secret');
      (request as any).user = payload;
    } catch {
      // ignore
    }

    return true;
  }
}
