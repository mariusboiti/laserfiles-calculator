import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export type EmailPayload = {
  to: string;
  from: string;
  subject: string;
  text: string;
};

@Injectable()
export class EmailService {
  async send(payload: EmailPayload): Promise<void> {
    const provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    if (provider !== 'resend') {
      throw new ServiceUnavailableException('Email provider not configured');
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Email provider not configured');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Email delivery failed (provider responded ${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
      );
    }
  }
}
