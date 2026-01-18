/**
 * Email sending utility using nodemailer
 * Sends emails via SMTP configuration
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

async function sendEmailViaResend(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.SMTP_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Failed to send email via Resend:', res.status, txt.slice(0, 500));
      return false;
    }

    console.log(`Email sent successfully to ${options.to} (Resend)`);
    return true;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return false;
  }
}

// Create reusable transporter using SMTP
function createTransporter() {
  // Use environment variables for SMTP configuration
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('SMTP credentials not configured. Email sending will be skipped.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send an email
 * Returns true if successful, false otherwise
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const resendOk = await sendEmailViaResend(options);
  if (resendOk) return true;

  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping email send.');
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send feedback notification email
 */
export async function sendFeedbackNotification(params: {
  type: 'bug' | 'feature';
  toolSlug?: string;
  title: string;
  message: string;
  pageUrl?: string;
  userEmail?: string;
  ticketId: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const { type, toolSlug, title, message, pageUrl, userEmail, ticketId, metadata } = params;
  
  const typeLabel = type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request';
  const toolLabel = toolSlug ? `Tool: ${toolSlug}` : 'General';
  
  const subject = `[LaserFilesPro] ${typeLabel}: ${title.slice(0, 50)}${title.length > 50 ? '...' : ''}`;
  
  const text = `
New ${type === 'bug' ? 'Bug Report' : 'Feature Request'} Submitted
====================================

Ticket ID: ${ticketId}
Type: ${typeLabel}
${toolLabel}
${pageUrl ? `Page: ${pageUrl}` : ''}
${userEmail ? `User: ${userEmail}` : 'User: Anonymous'}

Title:
${title}

Message:
${message}

${metadata ? `
Metadata:
${JSON.stringify(metadata, null, 2)}
` : ''}
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${type === 'bug' ? '#dc2626' : '#f59e0b'}; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; margin-top: 15px; }
    .value { margin: 5px 0 15px; }
    .message-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap; }
    .meta { font-size: 12px; color: #94a3b8; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${typeLabel}</h2>
    </div>
    <div class="content">
      <div class="label">Ticket ID</div>
      <div class="value"><code>${ticketId}</code></div>
      
      <div class="label">Tool</div>
      <div class="value">${toolSlug || 'General / Not specific'}</div>
      
      ${pageUrl ? `
      <div class="label">Page URL</div>
      <div class="value"><a href="${pageUrl}">${pageUrl}</a></div>
      ` : ''}
      
      ${userEmail ? `
      <div class="label">User</div>
      <div class="value">${userEmail}</div>
      ` : ''}
      
      <div class="label">Title</div>
      <div class="value"><strong>${title}</strong></div>
      
      <div class="label">Message</div>
      <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
      
      ${metadata ? `
      <div class="meta">
        <details>
          <summary>Technical Details</summary>
          <pre style="font-size: 11px; overflow-x: auto;">${JSON.stringify(metadata, null, 2)}</pre>
        </details>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: process.env.FEEDBACK_EMAIL || 'contact@laserfilespro.com',
    subject,
    text,
    html,
  });
}
