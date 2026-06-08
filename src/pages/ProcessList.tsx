import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function ProcessList() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WFO Process Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-guided process mapping tool for TLs
          </p>
        </div>
        <Button asChild>
          <Link to="/new">+ New Process</Link>
        </Button>
      </div>
      <div className="text-muted-foreground text-sm py-16 text-center border rounded-lg">
        No processes submitted yet. Click <strong>+ New Process</strong> to get started.
      </div>
    </div>
  )
}
