import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Start seeding...")

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: "john@example.com" },
    update: {},
    create: {
      email: "john@example.com",
      name: "John Doe",
      avatar: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "jane@example.com" },
    update: {},
    create: {
      email: "jane@example.com",
      name: "Jane Smith",
      avatar: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      avatar: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
  })

  console.log(`Created or updated users: ${user1.id}, ${user2.id}, ${user3.id}`)

  // Create chats
  const chat1 = await prisma.chat.upsert({
    where: {
      userId1_userId2: {
        userId1: user1.id,
        userId2: user2.id,
      },
    },
    update: {},
    create: {
      userId1: user1.id,
      userId2: user2.id,
    },
  })

  const chat2 = await prisma.chat.upsert({
    where: {
      userId1_userId2: {
        userId1: user1.id,
        userId2: user3.id,
      },
    },
    update: {},
    create: {
      userId1: user1.id,
      userId2: user3.id,
    },
  })

  console.log(`Created or updated chats: ${chat1.id}, ${chat2.id}`)

  // Create test messages
  const msg1 = await prisma.message.create({
    data: {
      content: "Hey! How are you doing?",
      senderId: user1.id,
      chatId: chat1.id,
    },
  })

  const msg2 = await prisma.message.create({
    data: {
      content: "I'm doing great! How about you?",
      senderId: user2.id,
      chatId: chat1.id,
    },
  })

  const msg3 = await prisma.message.create({
    data: {
      content: "Want to grab coffee later?",
      senderId: user1.id,
      chatId: chat2.id,
    },
  })

  console.log(`Created messages: ${msg1.id}, ${msg2.id}, ${msg3.id}`)

  console.log("Seeding finished.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
