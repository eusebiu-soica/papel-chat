# 🔥 Firebase Migration Guide

This project now supports **both Firebase Realtime Database and Prisma/PostgreSQL** with an easy-to-switch adapter pattern.

## 🎯 Quick Start

### Switch to Firebase

1. **Install Firebase dependencies:**
   ```bash
   npm install firebase
   ```

2. **Set environment variable:**
   ```bash
   # In .env.local or your environment
   NEXT_PUBLIC_DB_PROVIDER=firebase
   ```

3. **Update Firebase config** (if needed):
   Edit `lib/firebase/config.ts` with your Firebase project details.

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Switch back to Prisma

1. **Set environment variable:**
   ```bash
   NEXT_PUBLIC_DB_PROVIDER=prisma
   ```

2. **Make sure DATABASE_URL is set** in your `.env.local`

3. **Restart your dev server**

## 📁 Architecture

### Adapter Pattern

```
lib/db/
├── adapter.ts          # Interface/contract
├── firebase-adapter.ts # Firebase implementation
├── prisma-adapter.ts   # Prisma implementation
└── provider.ts         # Factory to select adapter
```

### How It Works

1. **Database Adapter Interface** (`adapter.ts`)
   - Defines all database operations as TypeScript interfaces
   - Both implementations must follow this contract

2. **Firebase Adapter** (`firebase-adapter.ts`)
   - Implements all operations using Firebase Realtime Database
   - Includes real-time subscriptions

3. **Prisma Adapter** (`prisma-adapter.ts`)
   - Implements all operations using Prisma/PostgreSQL
   - Falls back to polling for real-time (no subscriptions)

4. **Provider** (`provider.ts`)
   - Factory that selects the adapter based on `NEXT_PUBLIC_DB_PROVIDER`
   - Exports singleton `db` instance

## 🔄 Real-Time Features

### Firebase (Real-time)
- ✅ Real-time message updates
- ✅ Real-time chat list updates
- ✅ No polling needed
- ✅ Instant updates across clients

### Prisma (Polling)
- ⚠️ Uses polling (2s for messages, 10s for chats)
- ⚠️ Not truly real-time
- ✅ Works with existing PostgreSQL setup

## 📝 API Routes

All API routes now use the `db` adapter:

```typescript
import { db } from "@/lib/db/provider"

// Works with both Firebase and Prisma
const chats = await db.getChatsByUserId(userId)
const message = await db.createMessage({ ... })
```

## 🎣 React Hooks

### Real-time Messages Hook

```typescript
import { useRealtimeMessages } from "@/hooks/use-realtime-messages"

function ChatComponent({ chatId }: { chatId: string }) {
  const { messages, isLoading } = useRealtimeMessages({ chatId })
  
  // Automatically uses Firebase subscriptions if available
  // Falls back to polling with Prisma
}
```

### Real-time Chats Hook

```typescript
import { useRealtimeChats } from "@/hooks/use-realtime-chats"

function Sidebar({ userId }: { userId: string }) {
  const { chats, isLoading } = useRealtimeChats(userId)
  
  // Automatically uses Firebase subscriptions if available
  // Falls back to polling with Prisma
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database Provider (required)
NEXT_PUBLIC_DB_PROVIDER=firebase  # or "prisma"

# Prisma Database URL (only if using Prisma)
DATABASE_URL="postgresql://..."

# Firebase config is in lib/firebase/config.ts
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable **Realtime Database**
4. Copy your config to `lib/firebase/config.ts`

## 📊 Database Structure

### Firebase Realtime Database Structure

```
{
  "users": {
    "$userId": {
      "email": "...",
      "name": "...",
      "avatar": "...",
      "createdAt": timestamp,
      "updatedAt": timestamp
    }
  },
  "chats": {
    "$chatId": {
      "userId1": "...",
      "userId2": "...",
      "createdAt": timestamp,
      "updatedAt": timestamp
    }
  },
  "messages": {
    "$messageId": {
      "content": "...",
      "senderId": "...",
      "chatId": "...",
      "groupId": "...",
      "replyToId": "...",
      "deletedForEveryone": false,
      "createdAt": timestamp,
      "updatedAt": timestamp
    }
  },
  "message_reactions": {
    "$reactionId": {
      "messageId": "...",
      "userId": "...",
      "emoji": "...",
      "createdAt": timestamp
    }
  },
  "groups": { ... },
  "group_members": { ... },
  "rooms": { ... },
  "blocked_users": { ... }
}
```

## 🚀 Migration Steps

### From Prisma to Firebase

1. **Install Firebase:**
   ```bash
   npm install firebase
   ```

2. **Set provider:**
   ```bash
   NEXT_PUBLIC_DB_PROVIDER=firebase
   ```

3. **Update Firebase config** in `lib/firebase/config.ts`

4. **Test the app** - it should work immediately!

5. **Migrate data** (optional):
   - Export from PostgreSQL
   - Import to Firebase Realtime Database
   - Or let users recreate data naturally

### From Firebase to Prisma

1. **Set provider:**
   ```bash
   NEXT_PUBLIC_DB_PROVIDER=prisma
   ```

2. **Set DATABASE_URL** in `.env.local`

3. **Run migrations:**
   ```bash
   npx prisma migrate dev
   ```

4. **Test the app**

## ⚠️ Important Notes

1. **Data Migration**: Switching providers doesn't automatically migrate data. You'll need to export/import manually or let users recreate.

2. **Real-time**: Firebase provides true real-time updates. Prisma uses polling.

3. **Performance**: Firebase Realtime Database is optimized for real-time, Prisma/PostgreSQL for complex queries.

4. **Costs**: Consider Firebase pricing vs PostgreSQL hosting costs.

5. **Development**: Both adapters work in development. Choose based on your needs.

## 🐛 Troubleshooting

### Firebase not connecting
- Check Firebase config in `lib/firebase/config.ts`
- Verify Realtime Database is enabled in Firebase Console
- Check browser console for errors

### Prisma errors
- Verify `DATABASE_URL` is set
- Run `npx prisma generate`
- Check database connection

### Real-time not working
- With Firebase: Check Firebase rules allow read/write
- With Prisma: Real-time uses polling (expected behavior)

## 📚 Files Changed

### New Files
- `lib/db/adapter.ts` - Database interface
- `lib/db/firebase-adapter.ts` - Firebase implementation
- `lib/db/prisma-adapter.ts` - Prisma implementation
- `lib/db/provider.ts` - Adapter factory
- `lib/firebase/config.ts` - Firebase configuration
- `hooks/use-realtime-messages.ts` - Real-time messages hook
- `hooks/use-realtime-chats.ts` - Real-time chats hook

### Updated Files
- `app/api/chats/route.ts` - Uses adapter
- `app/api/messages/route.ts` - Uses adapter
- `app/api/messages/react/route.ts` - Uses adapter
- `app/api/messages/delete/route.ts` - Uses adapter
- `package.json` - Added Firebase dependency

## ✅ Benefits

1. **Easy Switching**: Change one environment variable
2. **Type Safety**: Full TypeScript support
3. **Real-time Ready**: Firebase provides instant updates
4. **Backward Compatible**: Existing Prisma code still works
5. **Modular**: Clean separation of concerns

## 🎉 You're All Set!

Your app now supports both Firebase and Prisma. Switch between them anytime by changing `NEXT_PUBLIC_DB_PROVIDER`!

