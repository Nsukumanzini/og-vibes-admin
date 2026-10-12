# OG Vibes Admin Console

Production administration console for the OG Vibes student and staff apps.

## Requirements

- Node.js 22.13 or newer
- An admin user in Supabase with `app_metadata.role = admin`
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`

Never place the Supabase service-role key in this web project.

## Run locally

```powershell
cd C:\og-vibes-admin
npm ci
npm run dev
```

## Build

```powershell
npm run build
```

## Backend source

The database migrations and the `admin-control`, `notification-push`, and
`call-push` Edge Functions used by this console are stored under `supabase/`.
The migrations have already been applied to the linked OG Vibes project and the
functions have been published. Keep these files in source control so future
admin changes remain reproducible.

The browser only uses the public Supabase URL and anon key. Privileged actions
are validated in the Edge Function against the signed-in user's server-managed
admin role.
