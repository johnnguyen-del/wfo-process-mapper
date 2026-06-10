import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BarChart2, GitBranch, Layers, Map, Sparkles, Send, FolderOpen } from 'lucide-react'

const NOTION_GUIDE_URL = 'https://app.notion.com/p/wealthsimple/WFO-Process-Mapper-How-To-Use-37b41167bd968135a22dfb428cea5e4b'

const FEATURES = [
  {
    icon: <Map className="w-5 h-5" />,
    title: 'Visual Process Maps',
    desc: 'Drag-and-drop canvas with swimlanes, node types, and auto-layout. Add swimlane bands and sticky notes for context.',
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: 'Outcome Analytics',
    desc: 'See every outcome path — which teams it touches, how many steps, and how long. Compare outcomes side-by-side.',
  },
  {
    icon: <GitBranch className="w-5 h-5" />,
    title: 'Current vs Ideal',
    desc: 'Map the current flow and an optimised ideal state. Compare them side-by-side with statistical metrics.',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: 'AI-Assisted Mapping',
    desc: 'Use the Process Mapping Assistant to auto-fill the entire form and map from a plain-language description.',
  },
  {
    icon: <Send className="w-5 h-5" />,
    title: 'Submit to Notion',
    desc: 'One-click submission to the WFO Master Process Inventory. Tracks author, collaborators, and every change.',
  },
  {
    icon: <FolderOpen className="w-5 h-5" />,
    title: 'Organised by Team',
    desc: 'Folders, search, domain filters. Drag processes into folders. Trash bin for archiving old maps.',
  },
]

const STEPS = [
  'Click + New Process Map',
  'Fill in the 6-step form (or paste YAML from the AI assistant)',
  'Build the flow map on the canvas',
  'Submit to Notion ✓',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border-b px-6 py-14 md:py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">
            WFO Banking Pod · Process Documentation
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-foreground mb-4">
            Map your operational processes.<br className="hidden md:block" />
            Understand every outcome.
          </h1>
          <p className="text-base text-muted-foreground max-w-xl leading-relaxed mb-8">
            A guided tool for WFO Team Leads to document processes, build visual flow maps,
            analyse outcomes, and submit directly to the Master Process Inventory in Notion.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link
              to="/new"
              className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              + New Process Map
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/processes"
              className="flex items-center gap-2 bg-background text-foreground border border-border px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              View My Processes
            </Link>
            <a
              href={NOTION_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              How to Use Guide ↗
            </a>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="px-6 py-12 max-w-5xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
          What you can do
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="border rounded-xl p-5 hover:border-foreground/20 transition-colors">
              <div className="text-indigo-500 mb-3">{f.icon}</div>
              <div className="font-semibold text-sm mb-1.5">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick start */}
      <div className="border-t bg-muted/30 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
            Quick start — 4 steps
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/40 font-bold text-lg hidden sm:block">→</span>}
                <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2">
                  <span className="w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium">{step}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <Link
              to="/new"
              className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Get started →
            </Link>
            <a
              href={NOTION_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-border bg-background px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Read the full guide
            </a>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Built for the WFO Banking Pod · Questions? Tag{' '}
          <span className="font-medium text-foreground">@johnnguyen</span> in Slack
        </p>
      </div>
    </div>
  )
}
