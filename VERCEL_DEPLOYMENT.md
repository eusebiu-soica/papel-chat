# 🚀 Vercel Deployment Guide

## Firebase Configuration for Vercel

To deploy your Papel Chat app to Vercel with Firebase, you need to configure the following environment variables:

### Required Environment Variables

Add these in **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**:

#### Firebase Client Configuration (Public)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### Firebase Admin SDK (Server-side only)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

### Getting Firebase Credentials

#### 1. Client Configuration (NEXT_PUBLIC_*)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll to **Your apps** section
5. Click the **Web** icon (`</>`) if you haven't created a web app yet
6. Copy the values from the `firebaseConfig` object

#### 2. Service Account (Admin SDK)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Extract these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters!)

**Important**: When copying `FIREBASE_PRIVATE_KEY`:
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Keep the `\n` characters (they're literal, not newlines)
- Wrap the entire value in quotes in Vercel

### Setting Up Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the Firebase Console
6. Click **Publish**

### Deployment Steps

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Fix Firebase configuration"
   git push
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables**
   - In Vercel project settings, add all the environment variables listed above
   - Make sure to set them for **Production**, **Preview**, and **Development** environments

4. **Deploy**
   - Vercel will automatically deploy on push
   - Or click **Deploy** manually

5. **Verify Deployment**
   - Check build logs for any errors
   - Test the app after deployment

### Troubleshooting

#### Build Error: "Service account object must contain a string 'project_id' property"

**Solution**: Make sure you've set:
- `FIREBASE_PROJECT_ID` (not `FIREBASE_PROJECT_ID`)
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (with proper formatting)

#### Runtime Error: "Missing or insufficient permissions"

**Solution**: 
1. Make sure Firestore security rules are published in Firebase Console
2. Verify the rules allow authenticated users (see `firestore.rules`)
3. Check that users are properly authenticated via Clerk → Firebase

#### Firebase Admin Not Initialized

**Solution**: 
- The app will continue to work without Admin SDK for client-side operations
- Admin SDK is only needed for `/api/auth/firebase` endpoint
- Make sure all three Admin environment variables are set correctly

### Environment Variable Format Example

In Vercel, when adding `FIREBASE_PRIVATE_KEY`, it should look like:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(multiple lines)
...
-----END PRIVATE KEY-----
```

But in Vercel's UI, you'll paste it with `\n` characters preserved, or Vercel will handle it automatically.

### Testing Locally Before Deploying

1. Copy `.env.local.example` to `.env.local` (if exists)
2. Add all environment variables to `.env.local`
3. Test locally: `npm run dev`
4. Test build: `npm run build`
5. If build succeeds, deploy to Vercel

### Security Notes

- ✅ `NEXT_PUBLIC_*` variables are exposed to the client (this is expected)
- ✅ `FIREBASE_*` (without NEXT_PUBLIC) are server-only
- ✅ Never commit `.env.local` to git
- ✅ Use different Firebase projects for dev/staging/production if possible

### Quick Checklist

- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Service account key downloaded
- [ ] All environment variables added to Vercel
- [ ] Firestore security rules published
- [ ] Build succeeds locally (`npm run build`)
- [ ] Deployment succeeds on Vercel
- [ ] App works after deployment

---

**Need help?** Check:
- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [Firebase Migration Guide](./FIREBASE_MIGRATION.md)
- [Firebase Console](https://console.firebase.google.com/)

