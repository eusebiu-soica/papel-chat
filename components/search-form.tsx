import { Search } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Field, FieldContent } from "./ui/field"
import { Input } from "./ui/input"
export default function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props} className="w-full min-w-0">
      <Field className="py-0 w-full">
        <FieldContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <Input
            id="search"
            placeholder="Search..."
            className="pl-7 sm:pl-8 pr-2 border-none text-xs sm:text-sm h-8 sm:h-9"
          />
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 sm:size-4 -translate-y-1/2 opacity-50 select-none" />
        </FieldContent>
      </Field>
    </form>
  )
}
