import ChatsList from "./chat-list-container";
import SidebarHeader from "./sidebar-header";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

const dummyChats = [
    {
        id: "1",
        name: "John Doe",
        message: "Hello there!",
        unreadCount: 3,
        imageUrl: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
    {
        id: "2",
        name: "Jane Smith",
        message: "How are you?",
        unreadCount: 0,
        imageUrl: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
    {
        id: "3",
        name: "Alice Johnson",
        message: "Meeting tomorrow?",
        unreadCount: 1,
        imageUrl: "https://images.pexels.com/photos/6497114/pexels-photo-6497114.jpeg",
    },
];

export default function Sidebar() {
    return (
        <Card className="rounded-none bg-transparent border-none max-w-[420px] w-full p-[8px] gap-2">
            <CardHeader className="px-0">
                <SidebarHeader />
            </CardHeader>
            <CardContent className="px-0">
                <ChatsList chats={dummyChats} />
            </CardContent>
            <CardFooter className="px-0">
            </CardFooter>
        </Card>
    )
}