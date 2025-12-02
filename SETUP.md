# Papel Chat - Setup Guide

## Overview
Papel Chat is a modern, real-time messaging application built with Next.js 15, Prisma, PostgreSQL, and Tailwind CSS.

## Features Implemented

### 1. **Home Page (Request #1) ✅**
- Friendly welcome message when entering the app
- Visual guidance to select a chat from the sidebar
- Encouraging emoji and icons for better UX

### 2. **Chat Selection & Highlighting (Request #2a) ✅**
- Chat items in the sidebar highlight when selected
- Active state styling with left border and background color
- Smooth transitions and hover effects

### 3. **Chat Header (Request #2b) ✅**
- Displays user avatar and name at the top
- No online status shown (as requested)
- Clickable on avatar/name to open user info modal
- Search icon for searching through chat messages
- Dropdown menu with classic chat options

### 4. **User Info Modal (Request #2b) ✅**
- Shows user information with avatar and name
- Two tabs: Info and Actions
- Actions include:
  - Voice Call
  - Video Call
  - Block
  - Report
  - Restrict

### 5. **Chat Input Footer (Request #2c) ✅**
- Sticky footer that stays at the bottom of the page
- Icons for:
  - Image/Picture upload
  - Emoji picker
  - Attachments
- Send button with gradient styling
- Auto-expanding textarea for better UX

### 6. **Database & API (Request #3) ✅**
- Full Prisma schema with UUID support for Groups, Rooms, and Chats
- Secure PostgreSQL database connection
- Ready for Vercel deployment

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- npm or pnpm package manager

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Configure Database Connection**

Edit `.env.local` with your database connection string:

#### For Local PostgreSQL:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/papel_chat"
```

#### For Vercel Postgres:
```env
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require"
```

#### For Other Providers (Neon, Supabase, etc.):
```env
# Neon
DATABASE_URL="postgresql://user:password@host.neon.tech/papel_chat?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:password@db.host.supabase.co:5432/postgres"
```

### 3. **Initialize Prisma & Database**

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

### 4. **Run Development Server**

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

### 5. **Seed Database (Optional)**

Create a `prisma/seed.ts` file to add initial data:

```typescript
import prisma from "@/lib/prisma"

async function main() {
  // Create test users
  const user1 = await prisma.user.create({
    data: {
      email: "john@example.com",
      name: "John Doe",
      avatar: "https://avatar.vercel.sh/john",
    },
  })

  const user2 = await prisma.user.create({
    data: {
      email: "jane@example.com",
      name: "Jane Smith",
      avatar: "https://avatar.vercel.sh/jane",
    },
  })

  // Create a chat between them
  const chat = await prisma.chat.create({
    data: {
      userId1: user1.id,
      userId2: user2.id,
    },
  })

  // Add a test message
  await prisma.message.create({
    data: {
      content: "Hey! How are you?",
      senderId: user1.id,
      chatId: chat.id,
    },
  })

  console.log("Database seeded!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
```

Then run:
```bash
npx prisma db seed
```

## Database Schema

### Users
- `id`: Unique identifier (CUID)
- `email`: User email (unique)
- `name`: User display name
- `avatar`: Profile picture URL
- `createdAt`: Account creation timestamp
- Relations: sentMessages, receivedMessages, chats, groupMemberships, rooms

### Chats (1-on-1 conversations)
- `id`: UUID
- `userId1`: First user
- `userId2`: Second user
- `messages`: Associated messages
- Constraints: Unique pair of users

### Messages
- `id`: CUID
- `content`: Message text
- `senderId`: User who sent it
- `chatId`: Associated chat (optional)
- `groupId`: Associated group (optional)
- `createdAt`: Timestamp

### Groups
- `id`: UUID
- `name`: Group name
- `avatar`: Group picture
- `createdBy`: Creator user ID
- `members`: Group members
- `messages`: Group messages

### Rooms
- `id`: UUID
- `name`: Room name (unique)
- `topic`: Room description
- `createdBy`: Creator user ID

### BlockedUsers
- Tracks blocked relationships between users
- Prevents communication with blocked users

## API Endpoints

### Chats
- `GET /api/chats?userId=<id>` - Get user's chats
- `POST /api/chats` - Create new chat

### Messages
- `GET /api/messages?chatId=<id>` or `?groupId=<id>` - Fetch messages
- `POST /api/messages` - Send message

### Groups
- `GET /api/groups?userId=<id>` - Get user's groups
- `POST /api/groups` - Create new group

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create new room

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

## Deployment to Vercel

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. **Connect to Vercel**
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variables in Vercel dashboard
- Deploy!

### 3. **Setup Vercel Postgres** (Optional)
- In Vercel dashboard, create a Postgres database
- Vercel will automatically set `DATABASE_URL`
- Run migrations: `vercel env pull && npx prisma migrate deploy`

## Production Checklist

- [ ] Database is running and accessible
- [ ] `.env.local` is in `.gitignore`
- [ ] Environment variables are set in deployment platform
- [ ] Database migrations are applied
- [ ] API endpoints are tested
- [ ] CORS settings are configured if needed
- [ ] Authentication is implemented (if required)

## Architecture

```
papel-chat/
├── app/
│   ├── api/           # API routes
│   │   ├── chats/
│   │   ├── messages/
│   │   ├── groups/
│   │   ├── rooms/
│   │   └── users/
│   ├── chat/          # Chat pages
│   │   └── [id]/
│   ├── page.tsx       # Home page
│   └── layout.tsx     # Root layout
├── components/        # React components
│   ├── chat-*.tsx     # Chat-related components
│   ├── user-info-modal.tsx
│   └── ui/            # UI primitives
├── lib/
│   ├── context/       # React context
│   ├── prisma.ts      # Prisma client singleton
│   └── utils.ts       # Utilities
├── prisma/
│   └── schema.prisma  # Database schema
├── public/            # Static assets
└── .env.local         # Environment variables
```

## Next Steps

1. **Authentication**: Implement NextAuth.js or similar
2. **Real-time Messages**: Add WebSocket support or use libraries like Socket.io
3. **File Upload**: Integrate with cloud storage (AWS S3, Cloudinary)
4. **Search**: Add full-text search for messages
5. **Notifications**: Implement push notifications
6. **Image Optimization**: Use Next.js Image component

## Troubleshooting

### Database Connection Issues
```bash
# Test your connection string
npx prisma db execute --stdin < /dev/null
```

### Prisma Client Issues
```bash
# Regenerate Prisma Client
rm -rf node_modules/.prisma
npx prisma generate
```

### Port Already in Use
```bash
# Change port
npm run dev -- -p 3001
```

## Support
For issues or questions, check the documentation at:
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Vercel Docs](https://vercel.com/docs)
