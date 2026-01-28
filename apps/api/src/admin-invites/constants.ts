/**
 * Admin Edition Invite System Constants
 */

// Default values for invite creation
export const ADMIN_INVITE_DEFAULTS = {
  CREDITS_GRANT: 200,
  DURATION_DAYS: 30,
  INVITE_VALIDITY_DAYS: 14,
} as const;

// Error messages
export const ADMIN_INVITE_ERRORS = {
  INVALID_TOKEN: 'Invalid or expired invite token',
  ALREADY_REDEEMED: 'This invite has already been redeemed',
  REVOKED: 'This invite has been revoked',
  EXPIRED: 'This invite has expired',
  EMAIL_MISMATCH: 'This invite was created for a different email address',
  ALREADY_HAS_ADMIN_EDITION: 'Admin Edition is already active on your account. Please wait until it expires before redeeming a new invite.',
  NOT_FOUND: 'Invite not found',
  CANNOT_REVOKE: 'Cannot revoke invite with current status',
} as const;

// Success messages
export const ADMIN_INVITE_SUCCESS = {
  CREATED: 'Invite created successfully',
  REDEEMED: 'Admin Edition activated successfully!',
  REVOKED: 'Invite revoked successfully',
} as const;

// Message templates for UI
export const ADMIN_INVITE_MESSAGES = {
  // Redeem page messages
  REDEEM_TITLE: 'Admin Edition Invite',
  REDEEM_DESCRIPTION: 'You\'ve been invited to receive free PRO access!',
  REDEEM_BENEFITS: [
    '1 month of PRO access',
    '200 AI credits',
    'Admin Edition badge',
  ],
  REDEEM_BUTTON: 'Activate Admin Edition',
  REDEEM_SUCCESS_TITLE: 'Admin Edition Activated!',
  REDEEM_SUCCESS_DESCRIPTION: 'Welcome to LaserFilesPro Admin Edition',

  // Email mismatch
  EMAIL_MISMATCH_TITLE: 'Email Mismatch',
  EMAIL_MISMATCH_DESCRIPTION: (inviteEmail: string, userEmail: string) =>
    `This invite was created for ${inviteEmail}, but you're logged in as ${userEmail}.`,

  // Invalid invite
  INVALID_INVITE_TITLE: 'Invalid Invite',
  INVALID_INVITE_DESCRIPTION: 'This invite is no longer valid.',

  // Missing token
  MISSING_TOKEN_TITLE: 'Missing Invite Token',
  MISSING_TOKEN_DESCRIPTION: 'This page requires a valid invite link. Please use the link provided to you.',

  // Account page
  COMMUNITY_ACCESS_TITLE: 'Community Access',
  COMMUNITY_ACCESS_DESCRIPTION: (badgeType: string) =>
    `You have PRO access through the ${badgeType} program. This access was granted via an invite link and includes full PRO features.`,

  // Badge labels
  BADGE_ADMIN_EDITION: 'Admin Edition',
  BADGE_COMMUNITY_PARTNER: 'Community Partner',

  // Admin panel
  ADMIN_PANEL_TITLE: 'Admin Edition Invites',
  ADMIN_PANEL_DESCRIPTION: 'Manage community admin invites for PRO access + AI credits',
  CREATE_INVITE_TITLE: 'Create New Invite',
  CREATE_INVITE_DESCRIPTION: 'Generate a one-time invite link for a Facebook group admin',
  INVITE_URL_NOTICE: 'Invite created! Copy this link (shown only once):',
} as const;

// Tooltip content
export const ADMIN_INVITE_TOOLTIPS = {
  BADGE_DESCRIPTION: (badgeType: string) =>
    `PRO access granted via ${badgeType} invite`,
  DAYS_REMAINING: (days: number) =>
    days === 0
      ? 'Expires today'
      : days === 1
        ? '1 day remaining'
        : `${days} days remaining`,
} as const;
