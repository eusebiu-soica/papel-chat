# 🔐 Vercel Environment Variables Setup

## Required Firebase Environment Variables

To fix the Firebase initialization error on Vercel, add these environment variables in your **Vercel Dashboard**:

### Step 1: Go to Vercel Dashboard
1. Navigate to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Client-Side Firebase Variables (NEXT_PUBLIC_*)

These are **public** variables that will be exposed to the browser:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id (optional)
```

### Step 3: Add Server-Side Firebase Admin Variables

These are **private** variables (server-only):

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

## How to Get These Values

### Client Configuration (NEXT_PUBLIC_*)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll to **Your apps** section
5. If you haven't created a web app, click the **Web** icon (`</>`)
6. Copy the values from the `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",           // → NEXT_PUBLIC_FIREBASE_API_KEY
     authDomain: "...",           // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     projectId: "...",            // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
     storageBucket: "...",        // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     messagingSenderId: "...",    // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     appId: "...",                // → NEXT_PUBLIC_FIREBASE_APP_ID
     measurementId: "..."        // → NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)
   }
   ```

### Service Account (Admin SDK)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Extract these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

**Important for FIREBASE_PRIVATE_KEY:**
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Keep the `\n` characters (they're literal, not newlines)
- In Vercel, paste the entire key including the BEGIN/END lines

## Vercel Environment Variable Format

When adding `FIREBASE_PRIVATE_KEY` in Vercel:

1. Copy the entire private key from the JSON file
2. Paste it directly into Vercel's environment variable field
3. Vercel will handle the formatting automatically

Example format (what you'll paste):
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(multiple lines)
...
-----END PRIVATE KEY-----
```

## After Adding Variables

1. **Redeploy** your application in Vercel
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

2. **Verify** the build succeeds
   - Check the build logs for any errors
   - The error about missing Firebase env vars should be gone

## Quick Checklist

- [ ] All 6-7 `NEXT_PUBLIC_FIREBASE_*` variables added
- [ ] All 3 `FIREBASE_*` (Admin) variables added
- [ ] `FIREBASE_PRIVATE_KEY` includes BEGIN/END lines
- [ ] Variables are set for **Production**, **Preview**, and **Development** environments (or at least Production)
- [ ] Redeployed the application
- [ ] Build succeeds without Firebase errors

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'getProvider')"
- **Cause**: Firebase environment variables are missing
- **Fix**: Add all required `NEXT_PUBLIC_FIREBASE_*` variables

### Error: "Firebase Admin SDK not initialized"
- **Cause**: Admin SDK credentials are missing
- **Fix**: Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`

### Build succeeds but app doesn't work
- Check that variables are set for the correct environment (Production/Preview)
- Verify variable names are exactly as shown (case-sensitive)
- Check for typos in variable values

---

**Need more help?** See:
- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)

