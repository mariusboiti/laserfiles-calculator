# Admin Backend V1

This document describes the Admin Backend feature for LaserFiles Studio, which allows administrators to manage users, view their plans and credits, add credits, and force synchronize entitlements from WordPress.

## Overview

The Admin Backend provides a secure interface for managing Studio users. It consists of:

- **NestJS API endpoints** under `/admin/*` protected by RBAC
- **Next.js Admin UI** at `/admin` for managing users
- **Audit logging** for all admin actions
- **Script** for promoting users to admin

## Architecture

### Roles

The system uses role-based access control (RBAC) with the following roles:

| Role | Description |
|------|-------------|
| `WORKER` | Default role for regular users |
| `ADMIN` | Full admin access to admin panel |
| `SUPPORT` | Reserved for future use (customer support) |

### Database Models

#### UserRole Enum
```prisma
enum UserRole {
  ADMIN
  WORKER
  SUPPORT
}
```

#### AdminAuditLog
```prisma
model AdminAuditLog {
  id            String           @id @default(uuid())
  adminUserId   String
  adminUser     User             @relation(...)
  targetUserId  String?
  targetUser    User?            @relation(...)
  action        AdminAuditAction
  reason        String?
  deltaCredits  Int?
  payload       Json?
  ip            String?
  userAgent     String?
  createdAt     DateTime         @default(now())
}

enum AdminAuditAction {
  ADD_CREDITS
  FORCE_SYNC_WP
  UPDATE_USER
  DELETE_USER
}
```

## API Endpoints

All endpoints require:
- Valid JWT token (cookie or Authorization header)
- User role = `ADMIN`

### GET /admin/stats

Returns dashboard statistics.

**Response:**
```json
{
  "totalUsers": 100,
  "usersByPlan": {
    "ACTIVE": 50,
    "TRIALING": 30,
    "CANCELED": 10,
    "INACTIVE": 10
  },
  "totalCreditsRemaining": 5000,
  "totalCreditsUsed": 3000,
  "totalCreditsGranted": 8000
}
```

### GET /admin/users

Returns paginated list of users.

**Query Parameters:**
- `search` (optional): Filter by email (case-insensitive contains)
- `plan` (optional): Filter by plan status (ACTIVE, TRIALING, CANCELED, INACTIVE)
- `page` (optional, default: 1): Page number
- `pageSize` (optional, default: 25, max: 100): Items per page

**Response:**
```json
{
  "users": [
    {
      "id": "cuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "WORKER",
      "createdAt": "2024-01-01T00:00:00Z",
      "plan": "ACTIVE",
      "aiCreditsTotal": 200,
      "aiCreditsUsed": 50,
      "aiCreditsRemaining": 150,
      "entitlementUpdatedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 25,
  "totalPages": 4
}
```

### GET /admin/users/:id

Returns detailed user information with entitlement and audit logs.

**Response:**
```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "WORKER",
    "wpUserId": "wp_123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  },
  "entitlement": {
    "plan": "ACTIVE",
    "aiCreditsTotal": 200,
    "aiCreditsUsed": 50,
    "aiCreditsRemaining": 150,
    "trialStartedAt": null,
    "trialEndsAt": null,
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx",
    "creditsNextGrantAt": "2024-02-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  },
  "auditLogs": [
    {
      "id": "uuid",
      "action": "ADD_CREDITS",
      "reason": "Customer support compensation",
      "deltaCredits": 50,
      "payload": {...},
      "createdAt": "2024-01-10T00:00:00Z",
      "adminUser": {
        "id": "admin-id",
        "email": "admin@example.com",
        "name": "Admin"
      }
    }
  ]
}
```

### POST /admin/users/:id/credits/add

Add credits to a user's account.

**Request Body:**
```json
{
  "amount": 50,
  "reason": "Customer support compensation"
}
```

**Validation:**
- `amount`: Required, integer, min: 1, max: 100000
- `reason`: Required, string, min length: 3

**Response:**
```json
{
  "success": true,
  "entitlement": {
    "plan": "ACTIVE",
    "aiCreditsTotal": 250,
    "aiCreditsUsed": 50,
    "aiCreditsRemaining": 200
  }
}
```

### POST /admin/users/:id/sync-from-wp

Force synchronize user entitlements from WordPress.

**Request Body:**
```json
{
  "reason": "User reported stale data"
}
```

**Validation:**
- `reason`: Required, string, min length: 3

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "entitlement": {
    "plan": "ACTIVE",
    "aiCreditsTotal": 200,
    "aiCreditsUsed": 50
  }
}
```

## Admin UI

The Admin UI is available at `/admin` in the Studio application.

### Pages

- **Dashboard** (`/admin`): Overview statistics, quick user search
- **Users List** (`/admin/users`): Searchable, filterable, paginated table
- **User Details** (`/admin/users/:id`): Full user info, add credits, force sync

### Access Control

The admin layout checks the user's role on mount:
1. Fetches `/api/me` to get current user
2. If role !== 'ADMIN', redirects to `/studio`
3. Only renders admin content for ADMIN users

## Setup & Deployment

### 1. Run Database Migration

```bash
# On production server with DATABASE_URL set
npx prisma migrate deploy
npx prisma generate
```

### 2. Promote First Admin

```bash
# Run from project root with DATABASE_URL set
npx ts-node scripts/make-admin.ts admin@example.com
```

### 3. Restart API Server

```bash
pm2 restart api
# or
systemctl restart laserfiles-api
```

## Security Considerations

1. **All endpoints require authentication** via JWT token
2. **Role verification** is enforced at guard level (RolesGuard)
3. **All actions are logged** to AdminAuditLog with:
   - Admin user ID
   - Target user ID
   - Action type
   - Reason (required)
   - Before/after state (in payload)
   - IP address
   - User agent
4. **No public endpoints** - all admin routes require ADMIN role
5. **Credits are added atomically** using Prisma increment

## Not Implemented in V1

The following features are explicitly **not** included in V1:

- **Change subscription plan** - WordPress remains source of truth
- **Stripe admin operations** - Use Stripe Dashboard directly
- **User impersonation** - May be added in future version
- **Bulk operations** - Individual user management only

## Testing

Run admin controller tests:

```bash
cd apps/api
npm test -- --testPathPattern=admin
```

## Troubleshooting

### User can't access admin panel
1. Verify user has `role: ADMIN` in database
2. Check JWT token is valid and not expired
3. Verify RolesGuard is applied to admin endpoints

### Credits not updating
1. Check AdminAuditLog for the action
2. Verify UserEntitlement record exists for user
3. Check for transaction errors in API logs

### WordPress sync not working
1. Verify `WORDPRESS_PLUGIN_API_URL` env variable
2. Check `WORDPRESS_PLUGIN_API_KEY` is set
3. Review API logs for sync errors
