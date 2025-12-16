# Usage Tracking & Studio Implementation

## Overview
Implemented a complete usage tracking system with plan-based export limits and a new Studio shell for tools.

## Database Changes (Pas 1)

### Schema Updates
- Added `UserPlan` enum: `FREE`, `PRO`, `BUSINESS`
- Added `plan` field to `User` model (default: `FREE`)
- Created `UsageEvent` table to log exports:
  - `id`: unique identifier
  - `userId`: reference to User
  - `toolKey`: identifies which tool was used (e.g., 'price-calculator')
  - `createdAt`: timestamp

### Migration
- Migration file: `20251216152103_add_user_plan_and_usage_events`
- Status: ✅ Applied successfully

## API Endpoints (Pas 1)

### GET /auth/me
- **Enhanced** to include user `plan` field
- Returns: `{ user: { id, email, name, role, plan } }`

### POST /usage/export
- **New endpoint** to track and enforce export limits
- Request body: `{ toolKey: string }`
- Enforces FREE plan limit: 3 exports per day per toolKey
- PRO/BUSINESS plans: unlimited exports

**Success Response (200):**
```json
{
  "success": true,
  "blocked": false,
  "remaining": 2,
  "limit": 3,
  "plan": "FREE"
}
```

**Blocked Response (403):**
```json
{
  "message": "Export limit reached for your plan",
  "blocked": true,
  "remaining": 0,
  "limit": 3,
  "plan": "FREE"
}
```

## Web Implementation (Pas 2)

### Studio Shell
Created `/studio` route with:
- **StudioLayout**: Auth-protected layout with navigation
- **Studio home page**: Tool directory
- Auth guard: Redirects to `/login` if not authenticated

### Price Calculator Migration
- **New location**: `/studio/tools/price-calculator`
- **Old location**: `/pricing` (still exists in main app)

### Export Functionality
1. **Export Button**: Exports calculation to CSV
2. **Usage Tracking**: Calls `POST /usage/export` before export
3. **Limit Enforcement**: 
   - FREE users: 3 exports/day per tool
   - Shows remaining exports in UI
   - Blocks export when limit reached
4. **Upgrade Modal**: 
   - Displays when limit is reached
   - Shows current plan and limits
   - Presents PRO and BUSINESS plan options
   - "Upgrade Now" button (placeholder URL)

### UI Features
- Usage counter in header (shows remaining exports)
- Export button with loading state
- Upgrade modal with plan comparison
- Seamless error handling

## Testing Instructions

### 1. Test FREE Plan Limits
```bash
# Login as a user (default plan is FREE)
# Navigate to: http://localhost:3000/studio/tools/price-calculator

# Steps:
1. Calculate a price
2. Click "Export CSV" - should work (1/3)
3. Export again - should work (2/3)
4. Export again - should work (3/3)
5. Export again - should show Upgrade modal (blocked)
```

### 2. Test PRO/BUSINESS Plans
```sql
-- Update user plan in database
UPDATE "User" SET plan = 'PRO' WHERE email = 'your-email@example.com';
```

Then test unlimited exports (no limit should apply).

### 3. Test Daily Reset
Usage limits reset at midnight (00:00:00 local time).

### 4. Verify API Endpoints
```bash
# Get user info with plan
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/auth/me

# Track export (should succeed for FREE plan with <3 exports today)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toolKey":"price-calculator"}' \
  http://localhost:4000/usage/export
```

## Files Created/Modified

### Backend (API)
- ✅ `prisma/schema.prisma` - Added UserPlan enum and UsageEvent table
- ✅ `apps/api/src/usage/usage.module.ts` - New module
- ✅ `apps/api/src/usage/usage.service.ts` - Usage tracking logic
- ✅ `apps/api/src/usage/usage.controller.ts` - Export endpoint
- ✅ `apps/api/src/app.module.ts` - Registered UsageModule
- ✅ `apps/api/src/auth/auth.controller.ts` - Enhanced /me endpoint

### Frontend (Web)
- ✅ `apps/web/app/studio/layout.tsx` - Studio shell layout
- ✅ `apps/web/app/studio/page.tsx` - Studio home page
- ✅ `apps/web/app/studio/tools/price-calculator/page.tsx` - Price calculator with usage tracking

### Database
- ✅ Migration: `20251216152103_add_user_plan_and_usage_events`

## Plan Limits Summary

| Plan     | Export Limit      | Price/Month |
|----------|-------------------|-------------|
| FREE     | 3/day per tool    | $0          |
| PRO      | Unlimited         | $29         |
| BUSINESS | Unlimited         | $99         |

## Next Steps (Optional)
1. Add more tools to Studio
2. Implement actual payment/upgrade flow
3. Add usage analytics dashboard
4. Email notifications when approaching limits
5. Add more granular usage tracking (per-feature)
6. Implement team/workspace plans for BUSINESS tier

## Notes
- The old `/pricing` page still exists in the main app for backward compatibility
- Studio is a separate section with its own layout and auth flow
- Usage events are logged per toolKey, allowing different limits per tool in the future
- The upgrade URL is a placeholder and should be replaced with actual payment integration
