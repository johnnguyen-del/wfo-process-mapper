import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Sparkles, FormInput } from 'lucide-react'
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
import AiChatPanel from '@/components/AiChatPanel'
import { emptyEntry, type ProcessEntry } from '@/lib/types'
import { generateId, loadEntry, saveEntry } from '@/lib/storage'
import { submitToNotion } from '@/lib/notion'
import type { FormFillPatch } from '@/lib/ai'
import { cn } from '@/lib/utils'

export default function ProcessBuilder() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [entry, setEntry] = useState<ProcessEntry>(() => emptyEntry(id ?? generateId()))
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [leftTab, setLeftTab] = useState<'form' | 'ai'>('form')

  useEffect(() => {
    if (id) {
      loadEntry(id).then((loaded) => {
        if (loaded) setEntry(loaded)
      })
    }
  }, [id])

  function patch(update: Partial<ProcessEntry>) {
    setEntry((prev) => {
      const next = { ...prev, ...update }
      return next
    })
  }

  function handleSaveDraft() {
    const now = new Date().toISOString()
    const saved = { ...entry, lastReviewed: entry.lastReviewed || now.split('T')[0], status: 'draft' as const }
    setEntry(saved)
    saveEntry(saved)
    toast.success('Draft saved')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const viewer = (window as any).MagicAuth?.viewer?.()
      const toolUrl = `${window.location.origin}${window.location.pathname}#/edit/${entry.id}`
      const submitted: ProcessEntry = {
        ...entry,
        submittedBy: viewer?.email ?? entry.submittedBy ?? '',
        submittedAt: now,
        lastReviewed: now.split('T')[0],
        status: 'submitted',
      }
      const notionUrl = await submitToNotion(submitted, toolUrl)
      const final = { ...submitted, notionPageUrl: notionUrl }
      setEntry(final)
      saveEntry(final)
      toast.success('Submitted to Notion!')
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error('Notion write failed — draft saved locally. Try again or check MagicTools.')
      saveEntry({ ...entry, status: 'draft' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleAiApply(fillPatch: FormFillPatch) {
    patch(fillPatch)
    setLeftTab('form')
    // Jump to Core Identity so TL can review from the start
    if (step === 0) setStep(1)
    toast.success('Fields applied — review the form')
  }

  function renderStep() {
    switch (step) {
      case 0: return <WorthMappingGate onYes={() => setStep(1)} onNo={() => navigate('/')} />
      case 1: return <CoreIdentityStep entry={entry} onChange={patch} />
      case 2: return <VolumeToolingStep entry={entry} onChange={patch} />
      case 3: return <AutomationStep entry={entry} onChange={patch} />
      case 4: return <CommsStep entry={entry} onChange={patch} />
      case 5: return <TaxonomyStep entry={entry} onChange={patch} />
      case 6: return <ReviewStep entry={entry} onSubmit={handleSubmit} submitting={submitting} />
      default: return null
    }
  }

  const isLastStep = step === 6
  const isFirstStep = step === 0

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
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form / AI tabs */}
        <div className="w-[40%] min-w-[320px] border-r flex flex-col overflow-hidden shrink-0">
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
          </div>

          {leftTab === 'ai' ? (
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

        {/* Right: Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b text-xs text-muted-foreground shrink-0">
            Process Map — drag nodes from the palette, double-click to edit, Delete key to remove
          </div>
          <div className="flex-1 relative">
            <ProcessCanvas
              processMap={entry.processMap}
              teamOwner={entry.teamOwner}
              workato={entry.workato}
              decagonL0={entry.decagonL0}
              onChange={(map) => patch({ processMap: map })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
