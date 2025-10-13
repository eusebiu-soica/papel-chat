"use client"
import SectionTitle from "@/components/sidebar-header"
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

export default function ContainerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isChatPage = pathname.includes("/chat/")
    return (
        <Card className="w-full p-3 rounded-none border-none">
           <CardHeader className="px-0">
                <SectionTitle />
            </CardHeader>
            <CardContent className={"space-y-2 max-h-[70vh] w-full overflow-y-auto px-0"}>
                {children}
            </CardContent>
        </Card>
    )
}