<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/48a5274f-4efe-4634-a88c-480049174f47

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Optional: Use Supabase Instead of Local SQLite

By default, this app stores users/test runs in local `bro_testing.db` (SQLite).
To switch to Supabase:

1. Run `supabase/schema.sql` in your Supabase SQL Editor
2. Add env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Restart the server (`npm run dev`)

When both vars are set, the backend automatically uses Supabase.
