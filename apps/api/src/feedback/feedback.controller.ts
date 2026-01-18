import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackService } from './feedback.service';
import { RateLimiter } from './rate-limiter';

const limiter = new RateLimiter(10 * 60 * 1000);

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  async submit(@Req() req: Request, @Body() body: SubmitFeedbackDto) {
    const message = String(body.message || '').trim();
    const type = body.type;

    const user: any = (req as any).user;
    const userId = user?.id || user?.sub;
    const email = user?.email;

    const ipRaw = String(req.headers['x-forwarded-for'] || req.ip || '');
    const ip = ipRaw.split(',')[0].trim() || undefined;

    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;

    if (userId) {
      limiter.checkOrThrow(`u:${String(userId)}`, 10);
    } else {
      limiter.checkOrThrow(`ip:${ip || 'unknown'}`, 3);
    }

    return this.feedback.submit({
      type,
      message,
      tool: body.tool,
      pageUrl: body.pageUrl,
      meta: body.meta,
      identity: {
        userId: userId ? String(userId) : undefined,
        email: typeof email === 'string' ? email : undefined,
        ip,
        userAgent,
      },
    });
  }
}
