import { HashRouter, Routes, Route, Link } from "react-router-dom"
import { ThemeProvider, useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Toaster } from "@/components/ui/sonner"
import ProcessList from "@/pages/ProcessList"
import ProcessBuilder from "@/pages/ProcessBuilder"
import ProcessAnalytics from "@/pages/ProcessAnalytics"
import ErrorBoundary from "@/components/ErrorBoundary"

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
      title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedTheme === 'dark'
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <HashRouter>
        <ErrorBoundary>
          <div className="min-h-screen bg-background text-foreground">
            <header className="border-b px-6 py-3 flex items-center gap-4">
              <Link to="/" className="font-semibold text-sm">
                ⚡ WFO Process Mapper
              </Link>
              <nav className="flex gap-3 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">Processes</Link>
                <Link to="/new" className="hover:text-foreground transition-colors">+ New Process</Link>
              </nav>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </header>
            <Routes>
              <Route path="/" element={<ProcessList />} />
              <Route path="/new" element={<ProcessBuilder />} />
              <Route path="/edit/:id" element={<ProcessBuilder />} />
              <Route path="/analytics" element={<ProcessAnalytics />} />
            </Routes>
          </div>
          <Toaster />
        </ErrorBoundary>
      </HashRouter>
    </ThemeProvider>
  )
}
