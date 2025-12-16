# Per-Tool Daily Export Limits - Implementation Summary

## ✅ Implementation Complete

This document describes the per-tool daily export limit system implemented according to exact specifications.

---

## Database Schema

### Enums Added
```prisma
enum UserPlan {
  FREE
  PRO
  BUSINESS
}

enum UsageAction {
  EXPORT
}
```

### User Model
```prisma
model User {
  // ... existing fields
  plan      UserPlan         @default(FREE)
  usageEvents UsageEvent[]
}
```

### UsageEvent Model
```prisma
model UsageEvent {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  toolKey   String
  action    UsageAction
  createdAt DateTime    @default(now())

  @@index([userId, toolKey, action, createdAt])
}
```

**Migration Applied:** `20251216152859_add_usage_action_enum`

---

## API Endpoints

### GET /auth/me
Returns user information including plan:
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "ADMIN",
    "plan": "FREE"
  }
}
```

### POST /usage/export
**Request:**
```json
{
  "toolKey": "price-calculator"
}
```

**Response (Allowed):**
```json
{
  "allowed": true,
  "remaining": 2,
  "limit": 3
}
```

**Response (Blocked):**
```json
{
  "allowed": false,
  "remaining": 0,
  "limit": 3
}
```

### Business Logic
- **FREE users:** Max 3 EXPORT events per day per toolKey
- **PRO/BUSINESS users:** Always allowed (returns limit: 999)
- Day boundary: Server timezone midnight (00:00:00)
- If under limit: Creates UsageEvent and returns updated stats
- If at/over limit: Returns `allowed: false` without creating event

---

## Web Implementation

### Structure
- **Location:** `/studio/tools/price-calculator`
- **Layout:** `StudioLayout` with auth guard
- **Tool logic:** Unchanged (no rewrite)

### Export Flow
1. User clicks "Export CSV"
2. Call `POST /usage/export` with `toolKey: 'price-calculator'`
3. Check `allowed` field in response:
   - If `true`: Proceed with CSV export
   - If `false`: Show Upgrade modal
4. Display remaining exports in header

### Upgrade Modal
Shows when `allowed: false`:
- Current plan: FREE
- Daily limit: 3 exports/day
- Remaining today: 0
- Upgrade options: PRO ($29/mo), BUSINESS ($99/mo)

---

## Testing

### Test FREE Plan Limits
```bash
# 1. Login as FREE user (default)
# 2. Navigate to: http://localhost:3000/studio/tools/price-calculator
# 3. Calculate a price
# 4. Click "Export CSV" 3 times → should work
# 5. 4th export → Upgrade modal appears
```

### Test PRO/BUSINESS Plans
```sql
-- Upgrade user to PRO
UPDATE "User" SET plan = 'PRO' WHERE email = 'user@example.com';

-- Test unlimited exports (no limit)
```

### Verify Database
```sql
-- Check usage events
SELECT * FROM "UsageEvent" 
WHERE "userId" = 'your-user-id' 
  AND "toolKey" = 'price-calculator'
  AND "action" = 'EXPORT'
  AND "createdAt" >= CURRENT_DATE;

-- Check user plan
SELECT id, email, plan FROM "User";
```

---

## Files Modified

### Backend
- ✅ `prisma/schema.prisma` - Added Plan enum, UsageAction enum, User.plan, UsageEvent model
- ✅ `apps/api/src/usage/usage.service.ts` - Implements trackExport with exact logic
- ✅ `apps/api/src/usage/usage.controller.ts` - POST /usage/export endpoint
- ✅ `apps/api/src/auth/auth.controller.ts` - Enhanced GET /me with plan

### Frontend
- ✅ `apps/web/app/studio/layout.tsx` - Studio shell with auth guard
- ✅ `apps/web/app/studio/page.tsx` - Studio home
- ✅ `apps/web/app/studio/tools/price-calculator/page.tsx` - Export integration

### Database
- ✅ Migration: `20251216152859_add_usage_action_enum`

---

## Key Features

✅ Per-tool limits (different tools can have different limits in future)  
✅ Daily reset at server timezone midnight  
✅ Action-based tracking (EXPORT enum, extensible for other actions)  
✅ Proper indexes for efficient queries  
✅ Non-FREE plans always allowed  
✅ Exact response format: `{allowed, remaining, limit}`  
✅ Tool logic unchanged (only export wrapper added)  
✅ Upgrade modal on limit reached  

---

## Notes

- The Prisma Client generation had a file lock (Windows) but migration was applied successfully
- Restart the API server to pick up the new Prisma types
- The old `/pricing` page remains unchanged for backward compatibility
- Studio is a separate section with its own layout
- Usage events are logged with action enum for future extensibility

---

## Next Steps (Optional)

1. Add more tools to Studio with their own toolKeys
2. Implement payment/upgrade flow
3. Add usage analytics dashboard
4. Different limits per tool (e.g., 5 exports for tool A, 3 for tool B)
5. Email notifications when approaching limits
6. Admin panel to view all usage events
