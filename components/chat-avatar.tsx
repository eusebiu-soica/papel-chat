import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ChatAvatarProps {
    imageUrl?: string;
    name?: string;
}

export default function ChatAvatar({ imageUrl, name }: ChatAvatarProps) {
    const initials = name ? name.charAt(0).toUpperCase() : "U"; // U for Unknown

    return (
        <Avatar className="size-10">
            {imageUrl ? (
                <AvatarImage src={imageUrl} alt={name || "Chat Avatar"} />
            ) : (
                <AvatarFallback>{initials}</AvatarFallback>
            )}
        </Avatar>
    );
}