import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Entitlements = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.entitlements;
});
