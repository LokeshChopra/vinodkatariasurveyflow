# SurveyFlow – Supabase + Netlify Ready

This package keeps the existing SurveyFlow UI and Supabase data layer, and adds a Netlify Function for the existing `/api/*` endpoints so the deployed site does not return 404 for the AI/text APIs.

## Local

```bash
npm install
npm run build
```

For AI calls locally, add `GEMINI_API_KEY` to `.env` or your shell environment. The Supabase publishable key and URL are already configured in `.env`.

## Netlify

Set these Environment Variables in Netlify for the Production context:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_BUCKET`
- `GEMINI_API_KEY` (server-side only)
- `GEMINI_MODEL` (for example `gemini-3.8-flash`)

The included `netlify.toml` builds the Vite app and rewrites `/api/*` to the Netlify Function. Do not add `GEMINI_API_KEY` to a `VITE_` variable.

## Supabase

Run `supabase_schema.sql` in the Supabase SQL Editor. It creates the survey record/table structure and the `survey-files` storage bucket used by the existing app.
