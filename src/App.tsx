import { HashRouter, Routes, Route, Link } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import ProcessList from "@/pages/ProcessList"
import ProcessBuilder from "@/pages/ProcessBuilder"

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b px-6 py-3 flex items-center gap-4">
          <Link to="/" className="font-semibold text-sm">
            ⚡ WFO Process Mapper
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Processes
            </Link>
            <Link to="/new" className="hover:text-foreground transition-colors">
              + New Process
            </Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<ProcessList />} />
          <Route path="/new" element={<ProcessBuilder />} />
          <Route path="/edit/:id" element={<ProcessBuilder />} />
        </Routes>
      </div>
      <Toaster />
    </HashRouter>
  )
}
