# Home Base

A Discord-authenticated invite system for controlling access to your projects.

## Features

- **One-Time Invite Links**: Generate unique, single-use invite codes from the admin panel
- **Discord OAuth Integration**: Users authenticate via Discord to ensure verified accounts
- **Protected Dashboard**: Main dashboard locked behind authentication—only invited users and admins can access
- **Admin Panel**: Full invite management interface at `/admin` with link generation and tracking
- **User Tracking**: Automatically saves Discord ID and username for authenticated users
- **Service Integration**: Send user data to external services for authorization

## Tech Stack

- **Frontend**: [Vite](https://vitejs.dev/) + React + TypeScript
- **Backend**: [Convex](https://www.convex.dev/) (serverless database & API)
- **Authentication**: Discord OAuth2

## Project Structure

```
HOME-BASE/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx          # Discord login entry point
│   │   ├── InvitePage.tsx         # Invite link redemption (username + Discord auth)
│   │   ├── AuthCallbackPage.tsx   # OAuth callback handler
│   │   ├── Dashboard.tsx          # Protected user dashboard
│   │   └── AdminPanel.tsx         # Admin invite management
│   ├── context/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── styles/                    # Component-specific CSS
│   ├── App.tsx                    # Main router
│   └── main.tsx                   # React entry point
├── convex/
│   ├── schema.ts                  # Database schema
│   └── functions.ts               # Convex query/mutation functions
├── index.html                     # HTML entry point
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
└── .env.example                   # Environment template
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Discord OAuth
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback

# Convex backend
CONVEX_DEPLOYMENT=your_convex_deployment_url
CONVEX_URL=your_convex_url

# Backend only (server environment)
DISCORD_CLIENT_SECRET=your_discord_client_secret
ADMIN_IDS=discord_user_id_1,discord_user_id_2
SERVICE_URLS=https://service1.example.com,https://service2.example.com
```

### 3. Discord Developer Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add OAuth2 redirect URL: `http://localhost:5173/auth/callback`
4. Copy Client ID and Secret to `.env.local`

### 4. Convex Setup

1. Create a [Convex account](https://www.convex.dev/)
2. Run `npm run convex` to initialize and deploy your backend
3. Copy the deployment URL to `.env.local`

## Running the Project

### Development

```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Convex development backend
npm run convex
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## Docker and Coolify

This repository now includes a production `Dockerfile` and a small Node server that serves the Vite build and proxies `/api/*` to Convex. That makes it ready for Coolify or any other Docker-based host.

### Required environment variables

Set these values in Coolify:

- Build-time: `VITE_DISCORD_CLIENT_ID`, `VITE_DISCORD_REDIRECT_URI`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_ZIPLINE_BASE_URL`
- Runtime: `CONVEX_URL` or `VITE_CONVEX_SITE_URL`, `DISCORD_CLIENT_SECRET`, `ADMIN_IDS`, `SERVICE_URLS`

If your Coolify setup separates build and runtime variables, make sure the `VITE_*` values are available during the image build, because Vite bakes them into the frontend bundle.

### Container behavior

- `npm run build` creates the static frontend bundle
- `npm run start` serves `dist/` on port `3000`
- `/api/*` requests are proxied to your Convex deployment
- client-side routes fall back to `index.html` so refreshes on `/dashboard`, `/admin`, and `/invite` keep working

### Coolify port

Expose container port `3000` in Coolify.

## API Endpoints (Backend)

These are implemented as Convex queries and mutations:

- `getUserByDiscordId` - Fetch user by Discord ID
- `upsertUser` - Create or update user after auth
- `generateInvite` - Create new invite code (admin only)
- `getInviteByCode` - Fetch invite details
- `useInvite` - Mark invite as used after redemption
- `getAllInvites` - List all invites (admin only)
- `isAdmin` - Check if user is admin
- `getUnusedInvitesCount` - Count available invites

## User Flows

### User Registration Flow
1. User visits invite link: `/invite?code=ABC123`
2. Enter username
3. Click "Connect Discord"
4. Redirected to Discord OAuth
5. Authorized, redirected to callback
6. User data saved, invite marked used
7. Redirected to dashboard

### Admin Flow
1. Login with Discord (must be in `ADMIN_IDS`)
2. Access `/admin` panel
3. Generate new invite codes
4. Copy links and share with users
5. Track invite usage in real-time

## Customization

- **Colors/Branding**: Edit CSS files in `src/styles/`
- **Database Schema**: Modify `convex/schema.ts`
- **Backend Logic**: Update `convex/functions.ts`
- **Pages**: Add new routes in `src/App.tsx`

## Environment Configuration

| Variable | Frontend | Backend | Description |
|----------|----------|---------|-------------|
| `DISCORD_CLIENT_ID` | ✅ | ✅ | Discord OAuth app ID |
| `DISCORD_CLIENT_SECRET` | ❌ | ✅ | Discord OAuth app secret |
| `DISCORD_REDIRECT_URI` | ✅ | ❌ | OAuth callback URL |
| `ADMIN_IDS` | ❌ | ✅ | Comma-separated Discord user IDs with admin access |
| `SERVICE_URLS` | ❌ | ✅ | External service endpoints for user data sync |
| `CONVEX_DEPLOYMENT` | ✅ | ✅ | Convex deployment ID |

## Troubleshooting

- **Invite not working**: Verify code is in database and not already used
- **OAuth redirect failed**: Check `DISCORD_REDIRECT_URI` matches Discord app settings
- **Admin panel inaccessible**: Ensure your Discord ID is in `ADMIN_IDS`
- **Convex errors**: Run `npm run convex` to sync schema to backend

## License

MIT
