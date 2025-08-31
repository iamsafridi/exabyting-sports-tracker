# Google OAuth Setup Instructions

To enable authentication for the Exabyting Sports Money Tracker, you need to set up Google OAuth credentials.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `exabyting-sports-tracker`
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "Internal" (for Exabyting employees only)
   - Fill in app name: "Exabyting Sports Money Tracker"
   - Add your email as developer contact
4. For Application type, select "Web application"
5. Name: "Exabyting Sports Tracker"
6. Add Authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
   - `https://your-production-domain.com/auth/google/callback` (for production)

## Step 4: Configure Environment Variables

1. Copy the Client ID and Client Secret from the credentials page
2. Open `/backend/.env` file
3. Replace the placeholder values:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

## Step 5: Domain Restriction (Optional but Recommended)

To ensure only @exabyting.com emails can access:

1. In OAuth consent screen, go to "Scopes"
2. Add these scopes if not already present:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`

## Step 6: Test the Setup

1. Start the backend server: `npm start`
2. Open the frontend in browser
3. Click "Sign in with Google"
4. Verify only @exabyting.com emails are accepted

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- The app is configured to only allow @exabyting.com domain emails
- Sessions expire after 24 hours for security
- All API endpoints require authentication

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Ensure the redirect URI in Google Console exactly matches: `http://localhost:3001/auth/google/callback`

**Error: "Access blocked"**
- Make sure you're using an @exabyting.com email address
- Check that the OAuth consent screen is properly configured

**Error: "Invalid client"**
- Verify the Client ID and Secret are correctly set in the .env file
- Ensure there are no extra spaces or quotes in the .env values
