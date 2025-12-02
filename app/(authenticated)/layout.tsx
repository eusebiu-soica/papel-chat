import { SignedIn } from "@clerk/nextjs"
import Sidebar from "@/components/sidebar"
import { Card, CardContent } from "@/components/ui/card"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SignedIn>
      <div className="font-sans flex flex-row h-screen overflow-hidden">
        <Sidebar />
        <Card className="flex-1 flex flex-col p-3 px-8 rounded-none border-none">
          <CardContent className={"flex-1 min-h-0 space-y-2 w-full overflow-hidden px-0"}>
            {children}
          </CardContent>
        </Card>
      </div>
    </SignedIn>
  )
}

