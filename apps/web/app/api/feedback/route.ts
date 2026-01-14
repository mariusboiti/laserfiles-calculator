/**
 * Feedback API Routes
 * POST /api/feedback - Submit feedback
 * GET /api/feedback/mine - Get user's feedback (handled in separate file)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { storeFile, generateArtifactKey } from '@/lib/storage/server';
import { sanitizeSvg } from '@/lib/artifacts/svg';
import { sendFeedbackNotification } from '@/lib/email/sendEmail';

export const runtime = 'nodejs';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const db = prisma as any;

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'image/svg+xml',
  'text/plain',
  'application/json',
];

async function getCurrentUser(): Promise<{ id: string; email?: string } | null> {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  
  if (!userId) return null;
  return { id: userId, email: undefined };
}

function base64ToBytes(base64: string): Uint8Array {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function generateFeedbackKey(ticketId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = Math.random().toString(36).substring(2, 10);
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
  return `feedback/${year}/${month}/${ticketId}/${uuid}-${safeFilename}`;
}

/**
 * POST /api/feedback - Submit new feedback
 */
export async function POST(req: NextRequest) {
  try {
    let user = await getCurrentUser();
    
    if (!user) {
      // Allow anonymous feedback with demo user
      user = { id: 'demo-user', email: undefined };
    }

    const body = await req.json();
    const { type, toolSlug, pageUrl, title, message, severity, metadata, attachments } = body;

    // Validate required fields
    if (!type || !['bug', 'feature', 'BUG', 'FEATURE'].includes(type)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid type. Must be "bug" or "feature"' } },
        { status: 400 }
      );
    }

    if (!title || title.length < 3) {
      return NextResponse.json(
        { ok: false, error: { message: 'Title is required (min 3 characters)' } },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { ok: false, error: { message: 'Message is required (min 10 characters)' } },
        { status: 400 }
      );
    }

    // Validate severity for bugs
    const feedbackType = type.toUpperCase();
    let feedbackSeverity = null;
    if (feedbackType === 'BUG' && severity) {
      const sev = severity.toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(sev)) {
        return NextResponse.json(
          { ok: false, error: { message: 'Invalid severity' } },
          { status: 400 }
        );
      }
      feedbackSeverity = sev;
    }

    // Validate attachments
    if (attachments && attachments.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { ok: false, error: { message: `Maximum ${MAX_ATTACHMENTS} attachments allowed` } },
        { status: 400 }
      );
    }

    try {
      // Create ticket
      const ticket = await db.feedbackTicket.create({
        data: {
          userId: user.id,
          userEmail: user.email || null,
          type: feedbackType,
          toolSlug: toolSlug || null,
          pageUrl: pageUrl || null,
          title,
          message,
          severity: feedbackSeverity,
          status: 'NEW',
          metadataJson: metadata || null,
        },
      });

      // Process attachments
      const savedAttachments = [];
      if (attachments && Array.isArray(attachments)) {
        for (const attachment of attachments) {
          const { filename, mimeType, base64 } = attachment;

          if (!filename || !mimeType || !base64) continue;

          if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            console.warn(`Skipping attachment with invalid mime type: ${mimeType}`);
            continue;
          }

          const bytes = base64ToBytes(base64);
          if (bytes.length > MAX_FILE_SIZE) {
            console.warn(`Skipping attachment that exceeds size limit: ${filename}`);
            continue;
          }

          // Sanitize SVG files
          let finalBytes = bytes;
          if (mimeType === 'image/svg+xml') {
            const svgString = new TextDecoder().decode(bytes);
            const sanitized = sanitizeSvg(svgString);
            finalBytes = new TextEncoder().encode(sanitized);
          }

          const key = generateFeedbackKey(ticket.id, filename);
          const url = await storeFile({ key, contentType: mimeType, bytes: finalBytes });

          const att = await db.feedbackAttachment.create({
            data: {
              ticketId: ticket.id,
              filename,
              mimeType,
              sizeBytes: finalBytes.length,
              url,
            },
          });

          savedAttachments.push({
            id: att.id,
            filename: att.filename,
            url: att.url,
          });
        }
      }

      // Send email notification (don't block on failure)
      sendFeedbackNotification({
        type: feedbackType === 'BUG' ? 'bug' : 'feature',
        toolSlug: toolSlug || undefined,
        title,
        message,
        pageUrl: pageUrl || undefined,
        userEmail: user.email || undefined,
        ticketId: ticket.id,
        metadata: metadata || undefined,
      }).catch((err) => {
        console.error('Failed to send feedback notification email:', err);
      });

      return NextResponse.json({
        ok: true,
        data: {
          id: ticket.id,
          type: ticket.type,
          title: ticket.title,
          status: ticket.status,
          attachments: savedAttachments,
          createdAt: ticket.createdAt,
        },
      });
    } catch (dbError) {
      console.error('Failed to create feedback ticket:', dbError);
      return NextResponse.json(
        { ok: false, error: { message: 'Failed to submit feedback' } },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
