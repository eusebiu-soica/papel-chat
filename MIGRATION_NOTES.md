# Database Migration Notes

## Schema Changes

The Prisma schema has been updated to support:
1. **Message Replies** - Messages can now reply to other messages
2. **Message Reactions** - Users can react to messages with emojis
3. **Delete for Everyone** - Messages can be deleted for all participants

## Migration Steps

1. **Create and apply the migration:**
   ```bash
   npx prisma migrate dev --name add_message_features
   ```

2. **If you encounter any issues, you can reset the database (⚠️ WARNING: This will delete all data):**
   ```bash
   npx prisma migrate reset
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

## New Fields Added

### Message Model
- `replyToId` - Optional reference to the message being replied to
- `replyTo` - Relation to the parent message
- `replies` - Relation to child messages
- `deletedForEveryone` - Boolean flag for deleted messages
- `deletedAt` - Timestamp when message was deleted
- `reactions` - Relation to MessageReaction model

### MessageReaction Model (New)
- `id` - Primary key
- `messageId` - Reference to the message
- `userId` - Reference to the user who reacted
- `emoji` - The emoji reaction (e.g., "👍", "❤️")
- `createdAt` - Timestamp

## API Endpoints Added

1. **POST /api/messages/react** - Add or remove a reaction to a message
   ```json
   {
     "messageId": "message-id",
     "emoji": "👍"
   }
   ```

2. **POST /api/messages/delete** - Delete a message for everyone
   ```json
   {
     "messageId": "message-id"
   }
   ```

## Updated Endpoints

- **POST /api/messages** - Now supports `replyToId` field
- **GET /api/messages** - Now includes reactions, replies, and delete status

