import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function ProcessBuilder() {
  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back</Link>
          </Button>
          <span className="text-sm text-muted-foreground">New Process</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Save Draft</Button>
          <Button size="sm">Submit to Notion</Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r overflow-y-auto p-6">
          <p className="text-muted-foreground text-sm">Wizard coming soon…</p>
        </div>
        <div className="flex-1 bg-muted/30 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Process map canvas coming soon…</p>
        </div>
      </div>
    </div>
  )
}
