import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Sparkles, FormInput, CheckCircle, ExternalLink, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WizardShell from '@/components/wizard/WizardShell'
import WorthMappingGate from '@/components/wizard/WorthMappingGate'
import CoreIdentityStep from '@/components/wizard/CoreIdentityStep'
import VolumeToolingStep from '@/components/wizard/VolumeToolingStep'
import AutomationStep from '@/components/wizard/AutomationStep'
import CommsStep from '@/components/wizard/CommsStep'
import TaxonomyStep from '@/components/wizard/TaxonomyStep'
import ReviewStep from '@/components/wizard/ReviewStep'
import ProcessCanvas from '@/components/canvas/ProcessCanvas'
import CompareView from '@/components/canvas/CompareView'
import AiChatPanel from '@/components/AiChatPanel'
import DetailsTab from '@/components/wizard/DetailsTab'
import { emptyEntry, type ProcessEntry, type ProcessMap, type CanvasDirection, type LineStyle, type ViewMode, type FolderEntry, type EditLogEntry } from '@/lib/types'
import { generateId, loadEntry, saveEntry, loadFolders } from '@/lib/storage'
import { submitToNotion } from '@/lib/notion'
import { autoLayout } from '@/lib/export'
import type { FormFillPatch } from '@/lib/ai'
import { cn } from '@/lib/utils'

const TRACKED_FIELDS: Record<string, string> = {
  processName: 'Process Name',
  domain: 'Domain',
  description: 'Description',
  teamOwner: 'Team Owner',
  volumeTier: 'Volume Tier',
  userTools: 'User Tools',
  jiraBoards: 'JIRA Boards',
  atlasCopilot: 'Automation',
  decagonL0: 'Automation',
  workato: 'Automation',
  outboundComms: 'Outbound Comms',
  spoofableRisk: 'Spoofable Risk',
  opsDomains: 'Ops Domains',
  cxTicketDriver: 'Ticket Driver',
  processMap: 'Process Map',
}

function diffEntry(prev: ProcessEntry, next: ProcessEntry): string[] {
  const changed = new Set<string>()
  for (const [key, label] of Object.entries(TRACKED_FIELDS)) {
    if (JSON.stringify((prev as any)[key]) !== JSON.stringify((next as any)[key])) {
      changed.add(label)
    }
  }
  return Array.from(changed)
}

function appendLog(
  entry: ProcessEntry,
  action: 'saved' | 'submitted',
  by: string,
  now: string,
  prev: ProcessEntry | null
): Partial<ProcessEntry> {
  const changed = prev ? diffEntry(prev, entry) : []
  const logEntry: EditLogEntry = { by, at: now, action, ...(changed.length > 0 ? { changed } : {}) }
  return {
    author: entry.author || by,
    collaborators: Array.from(new Set([...(entry.collaborators ?? []), by])),
    editLog: [logEntry, ...(entry.editLog ?? [])],
  }
}

export default function ProcessBuilder() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<ProcessEntry>(() => emptyEntry(id ?? generateId()))
  const lastSavedRef = useRef<ProcessEntry | null>(null)
  // Direct getter into CanvasInner's live rfNodes state — bypasses the
  // entry.processMap sync chain which can be stale at save time.
  const getCanvasMapRef = useRef<(() => ProcessMap) | null>(null)
  const historyRef = useRef<ProcessMap[]>([])
  const historyIdxRef = useRef<number>(-1)

  function pushHistory(map: ProcessMap) {
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(structuredClone(map))
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIdxRef.current = historyRef.current.length - 1
  }

  const handleSaveRef = useRef<() => void>(() => {})
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [leftTab, setLeftTab] = useState<'form' | 'ai' | 'details'>('form')
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [canvasDirection, setCanvasDirection] = useState<CanvasDirection>('LR')
  const [lineStyle, setLineStyle] = useState<LineStyle>('default')
  const [layoutKey, setLayoutKey] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('current')

  // Capture once at mount — stable across re-renders
  const defaultLeftWidth = useRef(Math.max(280, Math.round(window.innerWidth * 0.4))).current

  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('wfo-layout-left')
    const n = Number(saved)
    return saved && !isNaN(n) ? n : defaultLeftWidth
  })
  const [compareSplit, setCompareSplit] = useState<number>(() => {
    const saved = localStorage.getItem('wfo-layout-compare')
    const n = Number(saved)
    return saved && !isNaN(n) ? n : 50
  })
  const leftDragCleanupRef = useRef<(() => void) | null>(null)
  const justAutoSavedRef = useRef(false)
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [autoSaving, setAutoSaving] = useState(false)

  useEffect(() => {
    if (id) {
      loadEntry(id).then((loaded) => {
        if (loaded) {
          setEntry(loaded)
          lastSavedRef.current = loaded
          if (loaded.processMap) pushHistory(loaded.processMap)
        }
      })
    }
  }, [id])

  useEffect(() => { loadFolders().then(setFolders) }, [])

  // Keep ref current so stale-closure effects always call the latest handleSave
  handleSaveRef.current = handleSave

  // Auto-save: debounce 30s after any entry change, draft only, named process only
  useEffect(() => {
    if (entry.status === 'submitted' || !entry.processName.trim()) return
    if (justAutoSavedRef.current) {
      justAutoSavedRef.current = false  // reset after one skip
      return
    }
    setAutoSaving(true)
    const timer = setTimeout(() => {
      justAutoSavedRef.current = true
      handleSaveRef.current()
      setAutoSaving(false)
    }, 30_000)
    return () => {
      clearTimeout(timer)
      setAutoSaving(false)
    }
  }, [entry]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const target = e.target as HTMLElement
        const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
        if (!isEditable) {
          e.preventDefault()
          handleSaveRef.current()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable
      if (isEditable) return

      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey
      const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))

      if (isUndo) {
        e.preventDefault()
        if (historyIdxRef.current <= 0) return
        historyIdxRef.current--
        const map = historyRef.current[historyIdxRef.current]
        setEntry(prev => ({ ...prev, processMap: structuredClone(map) }))
        setLayoutKey(k => k + 1)
      }

      if (isRedo) {
        e.preventDefault()
        if (historyIdxRef.current >= historyRef.current.length - 1) return
        historyIdxRef.current++
        const map = historyRef.current[historyIdxRef.current]
        setEntry(prev => ({ ...prev, processMap: structuredClone(map) }))
        setLayoutKey(k => k + 1)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    return () => {
      leftDragCleanupRef.current?.()
    }
  }, [])

  function patch(update: Partial<ProcessEntry>) {
    setEntry((prev) => {
      const next = { ...prev, ...update }
      if (update.processMap) pushHistory(update.processMap)
      return next
    })
  }

  function handleSave() {
    const now = new Date().toISOString()
    const by = (window as any).MagicAuth?.viewer?.()?.email ?? 'unknown'
    // Read fresh positions directly from CanvasInner's rfNodes state.
    // entry.processMap can be one render behind after a drag; the getter always returns current positions.
    const freshProcessMap = getCanvasMapRef.current?.() ?? entry.processMap
    const entryWithFreshMap = { ...entry, processMap: freshProcessMap }
    const trackingPatch = appendLog(entryWithFreshMap, 'saved', by, now, lastSavedRef.current)
    const saved: ProcessEntry = {
      ...entryWithFreshMap,
      ...trackingPatch,
      lastReviewed: entry.lastReviewed || now.split('T')[0],
      status: entry.status === 'submitted' ? 'submitted' as const : 'draft' as const,
    }
    setEntry(saved)
    saveEntry(saved)
    lastSavedRef.current = saved
    toast.success(entry.status === 'submitted' ? 'Changes saved' : 'Draft saved')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const viewer = (window as any).MagicAuth?.viewer?.()
      const by = viewer?.email ?? entry.submittedBy ?? 'unknown'
      const trackingPatch = appendLog(entry, 'submitted', by, now, lastSavedRef.current)
      const toolUrl = `${window.location.origin}${window.location.pathname}#/edit/${entry.id}`
      const submitted: ProcessEntry = {
        ...entry,
        ...trackingPatch,
        submittedBy: by,
        submittedAt: now,
        lastReviewed: now.split('T')[0],
        status: 'submitted',
      }
      const notionUrl = await submitToNotion(submitted, toolUrl)
      const final = { ...submitted, notionPageUrl: notionUrl }
      setEntry(final)
      saveEntry(final)
      lastSavedRef.current = final
      setSubmitSuccess(notionUrl)
    } catch (err: any) {
      console.error(err)
      const msg = err?.message ?? err?.code ?? String(err)
      toast.error(msg, { duration: 10000 })
      saveEntry({ ...entry, status: 'draft' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleAiApply(fillPatch: FormFillPatch) {
    patch(fillPatch)
    setLeftTab('form')
    setStep(1) // always jump to Core Identity regardless of current step
    const name = (fillPatch as any).processName
    toast.success(name ? `Applied: ${name}` : 'Fields applied — review the form')
  }

  function handleRelayout(direction: CanvasDirection) {
    setCanvasDirection(direction)
    const relaidNodes = autoLayout(entry.processMap.nodes, entry.processMap.edges, direction)
    patch({ processMap: { nodes: relaidNodes, edges: entry.processMap.edges } })
    setLayoutKey(k => k + 1)
  }

  function handleOptimizationRelayout(direction: CanvasDirection) {
    setCanvasDirection(direction)
    setEntry(prev => {
      if (!prev.optimizationMap) return prev
      const relaid = autoLayout(prev.optimizationMap.nodes, prev.optimizationMap.edges, direction)
      return { ...prev, optimizationMap: { nodes: relaid, edges: prev.optimizationMap.edges } }
    })
    setLayoutKey(k => k + 1)
  }

  function handleLeftDragStart(e: React.MouseEvent) {
    e.preventDefault()
    document.body.style.cursor = 'col-resize'
    const startX = e.clientX
    const startWidth = leftWidth

    function onMove(ev: MouseEvent) {
      const newWidth = Math.min(
        Math.max(280, startWidth + (ev.clientX - startX)),
        Math.round(window.innerWidth * 0.65)
      )
      setLeftWidth(newWidth)
    }

    function onUp() {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setLeftWidth(prev => {
        localStorage.setItem('wfo-layout-left', String(prev))
        return prev
      })
      leftDragCleanupRef.current = null
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    leftDragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
  }

  function handleCompareSplitChange(pct: number, persist = false) {
    setCompareSplit(pct)
    if (persist) localStorage.setItem('wfo-layout-compare', String(pct))
  }

  function handleResetLayout() {
    setLeftWidth(defaultLeftWidth)
    setCompareSplit(50)
    localStorage.removeItem('wfo-layout-left')
    localStorage.removeItem('wfo-layout-compare')
  }

  function renderStep() {
    switch (step) {
      case 0: return <WorthMappingGate onYes={() => setStep(1)} onNo={() => navigate('/')} />
      case 1: return <CoreIdentityStep entry={entry} onChange={patch} />
      case 2: return <VolumeToolingStep entry={entry} onChange={patch} />
      case 3: return <AutomationStep entry={entry} onChange={patch} />
      case 4: return <CommsStep entry={entry} onChange={patch} />
      case 5: return <TaxonomyStep entry={entry} onChange={patch} />
      case 6: return <ReviewStep entry={entry} onChange={patch} onSubmit={handleSubmit} submitting={submitting} />
      default: return null
    }
  }

  const isLastStep = step === 6
  const isFirstStep = step === 0

  // Success screen — shown after Notion submission
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-49px)] gap-6 p-8">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Submitted to Notion</h2>
          <p className="text-muted-foreground text-sm">{entry.processName}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button asChild className="gap-2">
            <a href={submitSuccess} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Open in Notion
            </a>
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to process list
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSubmitSuccess(null)}>
            Continue editing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      {/* Top bar */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back</Link>
          </Button>
          <span className="text-sm font-medium truncate max-w-[200px]">
            {entry.processName || 'New Process'}
          </span>
          {/* Mode toggle */}
          <div className="flex border rounded-md overflow-hidden">
            {(['current', 'optimization', 'compare'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-foreground text-background'
                    : 'bg-background text-muted-foreground hover:bg-muted/40'
                )}
              >
                {mode === 'compare' ? '⟺ Compare' : mode === 'optimization' ? '✦ Ideal' : 'Current'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {autoSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">Auto-saving…</span>
          )}
          {folders.length > 0 && (
            <select
              value={entry.folderId ?? ''}
              onChange={e => patch({ folderId: e.target.value || undefined })}
              className="text-xs border rounded px-2 py-1 bg-background text-foreground"
              title="Assign to folder"
            >
              <option value="">No folder</option>
              {folders.filter(f => !f.parentId).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          {(leftWidth !== defaultLeftWidth || compareSplit !== 50) && (
            <button
              onClick={handleResetLayout}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
              title="Reset to default layout"
            >
              ⊞ Reset layout
            </button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave}>
            {entry.status === 'submitted' ? 'Save Changes' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form / AI tabs */}
        <div
          className="border-r flex flex-col overflow-hidden shrink-0"
          style={{ width: leftWidth, minWidth: 280 }}
        >
          {/* Tab bar — same pattern as PlaybookStudio's Visual/DSL/Chat tabs */}
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setLeftTab('form')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                leftTab === 'form'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <FormInput className="w-3.5 h-3.5" />
              Form
            </button>
            <button
              onClick={() => setLeftTab('ai')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                leftTab === 'ai'
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Fill
            </button>
            <button
              onClick={() => setLeftTab('details')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors',
                leftTab === 'details'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <History className="w-3.5 h-3.5" />
              Details
            </button>
          </div>

          {leftTab === 'details' ? (
            <DetailsTab entry={entry} />
          ) : leftTab === 'ai' ? (
            <AiChatPanel onApply={handleAiApply} />
          ) : (
            <>
              <WizardShell step={step} onStepClick={setStep}>
                {renderStep()}
              </WizardShell>

              {/* Step nav */}
              <div className="border-t px-4 py-3 flex justify-between shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={isFirstStep}
                >
                  Back
                </Button>
                {!isLastStep && (
                  <Button size="sm" onClick={() => setStep((s) => Math.min(6, s + 1))}>
                    Continue
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Indigo drag handle — Form ↔ Canvas */}
        <div
          onMouseDown={handleLeftDragStart}
          className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-indigo-400 transition-colors flex items-center justify-center group"
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
        </div>

        {/* Right: Canvas — shows different canvas based on viewMode */}
        <div className="flex-1 flex flex-col overflow-hidden canvas-fullscreen-target">
          <div className="px-4 py-2 border-b text-xs text-muted-foreground shrink-0">
            {viewMode === 'compare'
              ? 'Compare view — Current Flow vs. Ideal Flow (read-only)'
              : 'Process Map — drag to add · double-click to edit · Shift+drag to multi-select · Delete to remove'}
          </div>
          <div className="flex-1 relative">
            {viewMode === 'current' && (
              <ProcessCanvas
                processMap={entry.processMap}
                teamOwner={entry.teamOwner}
                workato={entry.workato}
                decagonL0={entry.decagonL0}
                direction={canvasDirection}
                lineStyle={lineStyle}
                canvasLabel="Current Flow"
                onChange={(map) => patch({ processMap: map })}
                onRelayout={handleRelayout}
                onLineStyleChange={setLineStyle}
                layoutKey={layoutKey}
                onRegisterGetter={(getter) => { getCanvasMapRef.current = getter }}
              />
            )}
            {viewMode === 'optimization' && (
              <>
                <ProcessCanvas
                  processMap={entry.optimizationMap ?? { nodes: [], edges: [] }}
                  teamOwner={entry.teamOwner}
                  workato={entry.workato}
                  decagonL0={entry.decagonL0}
                  direction={canvasDirection}
                  lineStyle={lineStyle}
                  canvasLabel="Ideal Flow"
                  onChange={(map) => patch({ optimizationMap: map })}
                  onRelayout={handleOptimizationRelayout}
                  onLineStyleChange={setLineStyle}
                  layoutKey={layoutKey}
                />
                {entry.optimizationMap === undefined && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-background border rounded-lg p-4 text-center shadow-lg pointer-events-auto">
                      <p className="text-sm text-muted-foreground mb-3">Start with a blank canvas or clone from current</p>
                      <button
                        onClick={() => patch({ optimizationMap: structuredClone(entry.processMap) })}
                        className="px-4 py-2 bg-foreground text-background rounded text-xs font-medium"
                      >
                        Clone Current Flow
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {viewMode === 'compare' && (
              <CompareView
                currentMap={entry.processMap}
                optimizationMap={entry.optimizationMap ?? { nodes: [], edges: [] }}
                direction={canvasDirection}
                lineStyle={lineStyle}
                teamOwner={entry.teamOwner}
                workato={entry.workato}
                decagonL0={entry.decagonL0}
                compareSplit={compareSplit}
                onCompareSplitChange={handleCompareSplitChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
