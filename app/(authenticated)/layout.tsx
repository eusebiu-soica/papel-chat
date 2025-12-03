import { SignedIn } from "@clerk/nextjs"
import Sidebar from "@/components/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SignedIn>
      <div className="font-sans flex flex-row h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile drawer */}
        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" className="m-2">
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="data-[vaul-drawer-direction=left]:w-3/4">
              <Sidebar />
            </DrawerContent>
          </Drawer>
        </div>

        <Card className="flex-1 flex flex-col py-0 rounded-none border-none">
          <CardContent className={"flex-1 min-h-0 space-y-2 w-full overflow-hidden px-0"}>
            {children}
          </CardContent>
        </Card>
      </div>
    </SignedIn>
  )
}

