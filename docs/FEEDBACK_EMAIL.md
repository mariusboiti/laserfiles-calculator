# Feedback Email Delivery

## Env vars

Set these on the `apps/api` runtime:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `FEEDBACK_TO_EMAIL=contact@laserfilespro.com`
- `FEEDBACK_FROM_EMAIL=LaserFilesPro Studio <no-reply@laserfilespro.com>`

## How to test (curl)

```bash
curl -i -X POST "http://localhost:4000/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "feedback",
    "message": "Hello from curl",
    "tool": "studio",
    "pageUrl": "https://studio.laserfilespro.com/studio",
    "meta": {"source": "curl"}
  }'
```

Expected response:

- `200 OK`
- Body: `{ "ok": true }`

## Rate limits

- Unauthenticated: 3 requests / 10 minutes / IP
- Authenticated: 10 requests / 10 minutes / userId
