# Security Guide

## Encryption Configuration

This application uses client-side encryption for all messages. To ensure security, you **MUST** configure the encryption secret.

### Required Environment Variable

Add the following to your `.env.local` file:

```bash
ENCRYPTION_SECRET="your-strong-random-secret-here"
```

### Generating a Strong Secret

**On Linux/Mac:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Or use an online generator:**
- Use a cryptographically secure random string generator
- Minimum 32 characters recommended
- Use a mix of letters, numbers, and special characters

### Security Best Practices

1. **Never commit the secret to version control**
   - The `.env.local` file is already in `.gitignore`
   - Never share the secret publicly

2. **Use different secrets for different environments**
   - Development: Use a test secret
   - Production: Use a strong, unique secret
   - Staging: Use a different secret from production

3. **Rotate secrets periodically**
   - If compromised, rotate immediately
   - Plan regular rotation (e.g., quarterly)

4. **How encryption works**
   - Each chat uses a key derived from: `chatId + masterSecret`
   - Uses PBKDF2 with 10,000 iterations for key derivation
   - AES-256 encryption for message content
   - All participants in a chat can decrypt messages (shared key per chat)

5. **Important Notes**
   - The secret is exposed in the client bundle (NEXT_PUBLIC_ prefix)
   - This is necessary for client-side decryption
   - The security model assumes the secret is kept private
   - For maximum security, consider server-side encryption instead
   - **See `SECURITY_ASSESSMENT.md` for a detailed security analysis**

### Setting Up

1. Create `.env.local` in the project root:
```bash
ENCRYPTION_SECRET="your-generated-secret-here"
NEXT_PUBLIC_DB_PROVIDER="firestore"
DATABASE_URL="your-database-url"
```

2. Restart your development server after adding the secret

3. Verify encryption is working:
   - Send a message
   - Check that it's encrypted in the database
   - Verify the receiver can decrypt it

### Troubleshooting

**Warning: "ENCRYPTION_SECRET not set!"**
- Add the secret to `.env.local`
- Restart the dev server
- Clear browser cache if needed

**Messages not decrypting:**
- Ensure all users have the same secret configured
- Check that the secret hasn't changed between encryption/decryption
- Verify the chat ID is correct

