# Google OAuth Setup Guide

## Prerequisites
To use Google authentication in your CGU Connect app, you need to set up Google OAuth credentials.

## Steps to Configure Google OAuth

### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

### 2. Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "CGU Connect"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users (optional for development)

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain (when deployed)
5. Add authorized redirect URIs:
   - `http://localhost:5173` (for development)
   - Your production domain (when deployed)
6. Copy the Client ID

### 4. Update Environment Variables
1. Open the `.env` file in your project root
2. Replace `your-google-client-id-here.apps.googleusercontent.com` with your actual Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
   ```

### 5. Test the Integration
1. Start your development server: `npm run dev`
2. Try signing in with a @cgu-odisha.ac.in Google account
3. The app should authenticate and create/login the user

## Important Notes

- **Domain Restriction**: The app only allows @cgu-odisha.ac.in email addresses
- **Security**: Never commit your actual Client ID to version control in production
- **Testing**: Use test accounts with @cgu-odisha.ac.in emails for development
- **Production**: Update the authorized origins and redirect URIs for your production domain

## Troubleshooting

### Common Issues:
1. **"redirect_uri_mismatch"**: Make sure your redirect URIs are correctly configured in Google Cloud Console
2. **"invalid_client"**: Check that your Client ID is correct in the .env file
3. **"access_denied"**: Ensure the user is using a @cgu-odisha.ac.in email address

### Development Tips:
- Use Chrome DevTools Network tab to debug OAuth requests
- Check browser console for detailed error messages
- Verify that the .env file is being loaded correctly