import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from '../email/email.service';

export type FeedbackInput = {
  type: 'feedback' | 'bug';
  message: string;
  tool?: string;
  pageUrl?: string;
  meta?: Record<string, unknown>;
  identity: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
  };
};

@Injectable()
export class FeedbackService {
  constructor(private readonly email: EmailService) {}

  async submit(input: FeedbackInput) {
    const to = process.env.FEEDBACK_TO_EMAIL;
    const from = process.env.FEEDBACK_FROM_EMAIL;

    if (!to || !from) {
      throw new ServiceUnavailableException('Email provider not configured');
    }

    const subject =
      input.type === 'bug'
        ? '[LaserFilesPro Studio] Bug Report'
        : '[LaserFilesPro Studio] Feedback';

    const lines: string[] = [];
    lines.push(subject);
    lines.push('');
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`Tool: ${input.tool || '-'}`);
    lines.push(`Page: ${input.pageUrl || '-'}`);
    lines.push(`UserId: ${input.identity.userId || '-'}`);
    lines.push(`Email: ${input.identity.email || '-'}`);
    lines.push(`IP: ${input.identity.ip || '-'}`);
    lines.push(`User-Agent: ${input.identity.userAgent || '-'}`);
    lines.push('');
    lines.push('Message:');
    lines.push(input.message);

    if (input.meta) {
      let metaText = '';
      try {
        metaText = JSON.stringify(input.meta, null, 2);
      } catch {
        metaText = '[unserializable meta]';
      }

      if (metaText.length > 20000) {
        metaText = metaText.slice(0, 20000) + '\n... (truncated)';
      }

      lines.push('');
      lines.push('Meta:');
      lines.push(metaText);
    }

    await this.email.send({
      to,
      from,
      subject,
      text: lines.join('\n'),
    });

    return { ok: true };
  }
}
