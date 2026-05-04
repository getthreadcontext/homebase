# Home Base - Setup Instructions

Before you can test the application, you need to initialize the admin IDs in your Convex database.

## 1. Initialize Admin IDs (One-time Setup)

The admin IDs are read from the database, not from `.env`. You need to initialize them once:

### Option A: Using Convex CLI (Recommended)

```bash
npx convex run functions:initializeAdminIds --args '{"adminIds":"1143443589737750608"}'
```

Replace `1143443589737750608` with your Discord ID from `.env` `ADMIN_IDS` field (comma-separated for multiple).

### Option B: Using Convex Dashboard

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Navigate to your project
3. Go to the **Functions** tab
4. Find `initializeAdminIds`
5. Click **Run** and enter:
   ```json
   {
     "adminIds": "1143443589737750608"
   }
   ```
6. Click **Run Function**

## 2. Restart Development Servers

```bash
# Terminal 1: Stop and restart Vite
npm run dev

# Terminal 2: Restart Convex (if not already running)
npm run convex
```

## 3. Test the Application

1. Open http://localhost:5173
2. Click "Login with Discord"
3. Authorize the Discord app
4. You should be logged in as an admin with access to `/admin` panel

## Troubleshooting

### "Authentication failed" on login

- Check that your Discord OAuth credentials are correct in `.env`
- Make sure the redirect URI matches exactly: `http://localhost:5173/auth/callback`
- Check browser console for detailed error messages

### Can't access `/admin` panel

- Make sure you ran `initializeAdminIds` with your Discord ID
- Your Discord ID must match exactly in the `ADMIN_IDS` field

### Admin check endpoint error

- Make sure `ADMIN_IDS` have been initialized in the database
- Restart both dev servers after initializing

## How It Works

1. **Admin IDs are stored in database**: The `initializeAdminIds` function saves your admin IDs to the `config` table
2. **Auto-registration on login**: When you log in, the system checks if your Discord ID is in the admin list and automatically registers you as an admin
3. **Protected admin access**: The `/admin` route is only accessible if you're registered in the admins table

## Environment Variables

Your `.env` file should have these (already set up):

```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id
VITE_DISCORD_REDIRECT_URI=http://localhost:5173/auth/callback
DISCORD_CLIENT_SECRET=your_discord_client_secret
ADMIN_IDS=your_discord_id
```

The `ADMIN_IDS` value gets copied to the database during initialization, so you only need to run `initializeAdminIds` once.

