import ChatItem from "./chat-item"

interface Chat {
    id: string;
    name: string;
    message: string;
    unreadCount?: number;
    imageUrl?: string;
}

interface ChatsListProps {
    chats: Chat[];
}

export default function ChatsList({ chats }: ChatsListProps) {
    return (
        <div className="space-y-0">
            {chats.map((chat, index) => (
                <div key={chat.id}>
                    <ChatItem
                        id={chat.id}
                        name={chat.name}
                        message={chat.message}
                        unreadCount={chat.unreadCount}
                        imageUrl={chat.imageUrl}
                        isLast={index === chats.length - 1}
                    />
                </div>
            ))}
        </div>
    );
}