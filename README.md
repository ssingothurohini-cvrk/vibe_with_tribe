# VIBE WITH TRIBE

**More Fun. Less Stress.** A mobile-first social app for sharing little moments, finding your people, and taking a softer break from the scroll.

## Project overview

This project is a social-media MVP with a premium dark UI and a feed architecture built around:

- home feed with posts and likes
- stories and story viewer
- profile editing and privacy controls
- comments and follows
- communities and discovery panels
- message preview flows
- breathing and mood tools
- entertainment content and games

The app originally used browser-local storage and a Supabase-ready data model. It now includes a Convex integration layer to persist the core social entities in a production-friendly schema while preserving the current UI and local demo behavior as a fallback.

## Convex setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_AUTH_ISSUER=https://YOUR_PROJECT.supabase.co/auth/v1
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=dev:your-project
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site
```

3. Start the Convex backend with `npx convex dev` from the project root.
4. Start the frontend with `npm run dev`.
5. Open `http://localhost:3000`.

## Convex schema

The Convex schema is defined in [`convex/schema.ts`](convex/schema.ts). It includes the tables required for the app's actual data model:

- `profiles` — user profile records and privacy state
- `posts` — feed posts with media URLs and captions
- `comments` — comments tied to a post
- `likes` — likes keyed by user and post
- `follows` — follower relationships between users
- `stories` — ephemeral media stories with expiration timestamps
- `communities` — community groups and ownership metadata
- `conversations` — direct-message thread records
- `messages` — message content inside a conversation
- `notifications` — user-facing activity updates

These collections are indexed for common reads such as by user, post, username, creation time, or follower pair.

## Backend functions

The `convex` backend exposes the application logic in [`convex/social.ts`](convex/social.ts), including:

- `listProfiles`, `getProfile`, `upsertProfile`
- `getFeed`, `createPost`, `toggleLike`, `addComment`
- `toggleFollow`, `listStories`, `createStory`
- `listCommunities`, `createCommunity`
- `getConversation`, `sendMessage`, `listNotifications`

The project preserves the original local demo fallback, but the Convex-backed paths are used when a signed-in user is present.

## Authentication and privacy

The app continues to use Supabase Auth for browser login and sign-out. `ConvexClientProvider` forwards the current Supabase access token to Convex, and `convex/auth.config.ts` accepts tokens from the configured issuer with the `authenticated` audience. Set `SUPABASE_AUTH_ISSUER` to `https://<project-ref>.supabase.co/auth/v1` in the Convex deployment environment as well as `.env.local`.

Supabase must use an asymmetric signing key supported by Convex's OIDC integration. If the project still uses the legacy HS256 signing secret, switch it to an asymmetric signing key before relying on Convex identity checks. Until the issuer is configured, Convex requests remain unauthenticated; do not treat the current user-ID arguments in backend functions as secure authorization.

This structure keeps the UI stable while allowing data to be stored and rehydrated from Convex for the social model described by the app.

## Current integration boundaries

- Supabase Auth provides email/password registration, login, Google OAuth handoff, session restoration, sign-out, and password reset when configured. The app also exposes an explicitly local-only demo profile when it is not configured.
- Supabase Storage handles account media when configured. Create the `posts`, `stories`, and `avatars` buckets and apply the existing [`supabase/schema.sql`](supabase/schema.sql) setup before enabling uploads.
- The existing direct-message path uses Supabase conversations and Realtime when a valid recipient account and Supabase project are available. Otherwise, messages are browser-local previews.
- Existing Convex-backed feed, post, like, comment, follow, and story calls remain unchanged. A successful frontend build does not verify their deployment auth configuration or signed-in authorization.
- Example profiles, trends, notifications, and community cards are preview content, not live account activity. Community joins, saved posts, game points, mood, and demo messages are stored in this browser only.
- Lucy is available through a server-side AI endpoint when `OPENAI_API_KEY` is configured. The project has no paid feature, admin dashboard, analytics provider, or separate outbound-email service; password reset uses Supabase Auth's email.
- Post/story composers can use browser camera still-photo capture with front/back camera selection and canvas-applied filters. Camera access requires a supported browser, a secure context (localhost or HTTPS), and explicit permission. Live video recording, trimming, licensed music, and sticker/text compositing are not implemented.
- Caption drafts are stored locally per account/demo profile and do not include media files. Pre-expiry story deletion is currently available only for locally-created preview stories; cloud-story deletion needs an authorized backend operation.
- Local preview posts can be edited and deleted by their local owner with confirmation. Existing cloud posts intentionally expose no edit/delete control because the backend has no owner-checked edit/delete operation; do not treat local controls as cloud authorization.
- The application has no public profile routes, so its root metadata disables search indexing. Open Graph and Twitter summary metadata are provided for shared links.

Before deployment, configure the real Supabase project URL and public anon/publishable key in `.env.local`, set `SUPABASE_AUTH_ISSUER` in the Convex dev deployment environment, configure the matching redirect URLs and Google provider if used, and test a complete auth round-trip. Do not ship while Convex still reports an unset issuer or while its public functions rely on unverified client-supplied user IDs.

## Lucy AI chat

The Lucy assistant is available as a floating widget across the app. It streams responses from the server-only `app/api/lucy/route.ts` endpoint, keeps chat history in the current browser session only, and does not write chat data to Convex or Supabase. The server prompt instructs Lucy to reply in English or Telugu to match the user and to identify herself as AI.

Lucy can use browser speech synthesis for the spoken greeting and replies, and browser speech recognition for voice input. Recognition starts only after the user taps the microphone and confirms the disclosure; browser vendors may process audio to recognize speech, while Lucy's app endpoint receives only the recognized text. Voice availability and language/voice quality depend on browser and installed system voices. Unsupported browsers retain text chat. No voiceprint enrollment or raw voice recording storage is implemented.

Add these variables to `.env.local` for local development and to the hosting provider's server environment for deployment:

```env
OPENAI_API_KEY=your-server-side-api-key
OPENAI_MODEL=gpt-4o-mini
```

Keep `OPENAI_API_KEY` server-only: do not prefix it with `NEXT_PUBLIC_` or put it in frontend code. `OPENAI_MODEL` is optional; the route defaults to `gpt-4o-mini`. Without an API key, Lucy remains visible and explains that setup is needed; message attempts receive a real configuration error rather than a fake AI reply. Restart the Next.js dev server after changing environment variables.

The Home section has a small set of randomized floating hearts behind the interface. They are removed on other sections and use reduced-motion styling when the device requests less animation.

## Safety and platform limits

This existing web MVP is not yet suitable to claim as a child-safe social network. Its Supabase and Convex auth environment is not configured in this workspace, and current public Convex social functions still accept client-supplied user IDs. Do not use these flows for private or child accounts until authentication and server-side ownership checks are completed and verified. Parent-child account links, age-based server policy, content moderation, block/report enforcement, and account deletion are not implemented as secure backend workflows.

A browser app cannot lock other installed apps, reliably listen for a wake phrase in the background, or access platform-level parental controls. Those capabilities require a native Android/iOS app and explicit operating-system permissions. Lucy's microphone use is foreground-only and user initiated; notification reading is not enabled.

## Run commands

```bash
npm install
npx convex dev
npm run dev
```

Production build:

```bash
npm run build
```

## GitHub and Vercel deployment

The project uses the standard Next.js Vercel runtime; no custom `vercel.json` is required. The Convex Vercel guide recommends deploying Convex functions as part of each Vercel build so the frontend receives the matching deployment URL.

### Push this existing project to GitHub

`.gitignore` excludes local `.env*` files (while retaining `.env.example`), `node_modules`, `.next`, `.vercel`, the machine-specific VS Code task file, and TypeScript build cache. This workspace is initialized as a Git repository with `origin` set to `https://github.com/ssingothurohini-cvrk/vibe_with_tribe.git`; no files have been committed or pushed. Verify the target, review staged files, then commit and push when ready:

```bash
git remote -v
git status --short
git add .
git status --short
git commit -m "Prepare Vibe With Tribe for deployment"
git branch -M main
git push -u origin main
```

If `origin` is not the intended repository, stop and confirm the target before changing it. Review staged files and never force-push over existing work.

### Connect Vercel to Convex

1. Import the GitHub repository at <https://vercel.com/new>. Use the repository root as the Root Directory and keep the detected Next.js framework, install command (`npm install`), and output settings.
2. In the existing Convex project, create/select a **production** deployment. Generate a Production deploy key with the `deployment:deploy` permission. In Vercel, add it as `CONVEX_DEPLOY_KEY` scoped to **Production only**. Never put a deploy key in a `NEXT_PUBLIC_*` variable or commit it.
3. Set the Vercel Build Command to:

	```bash
	npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd 'npm run build'
	```

	This deploys Convex functions and sets the frontend URL for that build. Do not hardcode the local `dev:content-leopard-911` deployment as the production URL.
4. If enabling Vercel Preview deployments with isolated Convex backends, create a separate **Preview** deploy key and scope `CONVEX_DEPLOY_KEY` to Preview only. Do not reuse the production key for Preview. Each preview branch then gets its own Convex preview deployment/data.
5. Add the app environment variables below in Vercel. Set them for the appropriate environment and redeploy after changes.
6. Importing the repository links GitHub to Vercel. Pushes to the production branch trigger production deployments; pull requests create Preview deployments when enabled. Vercel shows the shareable `*.vercel.app` URL and build logs under the deployment.

### Environment variables

Set these in Vercel as needed; keep secret values in the hosting dashboard, not GitHub:

| Variable | Where | Purpose |
| --- | --- | --- |
| `CONVEX_DEPLOY_KEY` | Vercel server/build environment; separate Production and Preview keys | Lets `npx convex deploy` deploy functions. Secret; never expose to the browser. |
| `NEXT_PUBLIC_CONVEX_URL` | Set by the Convex deploy build command above | Browser URL for the matching Convex deployment. |
| `SUPABASE_AUTH_ISSUER` | Convex deployment environment | `https://<project-ref>.supabase.co/auth/v1`; required by the existing Convex auth config when using Supabase Auth. |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel, if using Supabase | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel, if using Supabase | Supabase publishable/anon key. Never use a service-role key here. |
| `OPENAI_API_KEY` | Vercel server environment, if enabling Lucy AI replies | Server-side OpenAI key; do not prefix with `NEXT_PUBLIC_`. |
| `OPENAI_MODEL` | Optional server variable | Lucy model override; defaults to `gpt-4o-mini`. |

`NEXT_PUBLIC_CONVEX_SITE_URL` is not required by the current frontend. Configure Supabase Storage buckets and Auth redirect URLs in the Supabase dashboard if those services are used. Supabase JWT signing must use an asymmetric key supported by Convex.

### Current deployment status

The checked-in `.env.local` identifies only the existing Convex **development** deployment. No production deploy key, Supabase project URL/key, Supabase issuer, or OpenAI API key is configured in this workspace. I have not created or deployed a production Convex deployment or a Vercel site. The production build has been tested locally; the live Vercel URL and deployed backend still require the dashboard setup above. Existing public Convex functions also trust client-supplied user IDs, so do not expose private-account or child data until server-side authorization is repaired and tested.

## Manual setup still required

- Add the real Convex URL and deployment details in `.env.local`.
- Configure any provider-specific auth settings if you want to move beyond the current local demo flow.
- If you are using Supabase storage for media, keep the existing bucket configuration and upload rules.
- For a fully production-grade deployment, add moderation, rate limiting, and real auth policies beyond the MVP UI behavior.

