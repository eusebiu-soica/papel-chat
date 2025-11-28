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
        <div className="space-y-1">
            {chats.map((chat) => (
                <ChatItem
                    key={chat.id}
                    id={chat.id}
                    name={chat.name}
                    message={chat.message}
                    unreadCount={chat.unreadCount}
                    imageUrl={chat.imageUrl}
                />
            ))}
        </div>
    );
}