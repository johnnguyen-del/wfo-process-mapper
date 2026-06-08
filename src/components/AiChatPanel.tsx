import { useRef, useState } from 'react'
import { Sparkles, Send, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { streamFormFill, type AiMessage, type FormFillPatch } from '@/lib/ai'
import { cn } from '@/lib/utils'

interface AiChatPanelProps {
  onApply: (patch: FormFillPatch) => void
}

export default function AiChatPanel({ onApply }: AiChatPanelProps) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [lastPatch, setLastPatch] = useState<FormFillPatch | null>(null)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: AiMessage = { id: `u${Date.now()}`, role: 'user', text }
    const assistantMsg: AiMessage = { id: `a${Date.now()}`, role: 'assistant', text: '' }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    setLastPatch(null)
    setApplied(false)
    setError(null)

    abortRef.current = new AbortController()

    try {
      const patch = await streamFormFill({
        description: text,
        signal: abortRef.current.signal,
        onChunk: (raw, parsed) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, text: raw } : m))
          )
          if (parsed) setLastPatch(parsed)
        },
      })
      if (patch) setLastPatch(patch)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message ?? 'Something went wrong. Try again.')
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleApply() {
    if (!lastPatch) return
    onApply(lastPatch)
    setApplied(true)
  }

  function handleClear() {
    abortRef.current?.abort()
    setMessages([])
    setLastPatch(null)
    setApplied(false)
    setError(null)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-violet-500" />
          AI Form Fill
        </div>
        {hasMessages && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={streaming} className="h-7 px-2 text-xs">
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Describe a process in plain English and Claude will fill in all the inventory fields for you.</p>
            <p className="text-xs bg-muted/40 rounded-lg p-3 leading-relaxed">
              <strong className="text-foreground">Example:</strong> "Metal card reissuance — client calls in requesting a replacement metal card. CS agent verifies identity and card status in Atlas, then submits a BOPSIT JIRA ticket to back-office ops. Client receives a new card in 7–10 business days. High volume, manual comms only."
            </p>
            <p className="text-xs">Then click <strong>Apply to form</strong> to fill everything in one shot — you can review and adjust before submitting.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={cn('text-sm', m.role === 'user' ? 'text-right' : 'text-left')}>
                {m.role === 'user' ? (
                  <span className="inline-block bg-foreground text-background rounded-2xl rounded-tr-sm px-3 py-2 text-xs max-w-[85%]">
                    {m.text}
                  </span>
                ) : (
                  <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-3 py-2 text-xs font-mono leading-relaxed max-w-full whitespace-pre-wrap break-all">
                    {m.text || <span className="animate-pulse text-muted-foreground">Thinking…</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Apply banner */}
      {lastPatch && !streaming && (
        <div className={cn(
          'mx-4 mb-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2 border',
          applied
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-violet-50 border-violet-200 text-violet-800'
        )}>
          {applied ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Applied — switch to <strong>Form</strong> to review</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">Fields ready to fill in</span>
              <Button size="sm" onClick={handleApply} className="h-6 px-2 text-[11px] bg-violet-600 hover:bg-violet-700">
                Apply to form
              </Button>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mx-4 mb-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
            }}
            placeholder="Describe the process…"
            rows={3}
            className="resize-none text-sm"
            disabled={streaming}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="self-end"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">⌘↵ to send</p>
      </div>
    </div>
  )
}
