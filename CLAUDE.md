# WFO Process Mapper — Claude Context

## What This Is
React 19 + TypeScript canvas-based process mapping tool for Wealthsimple's WFO Banking Pod.
Deployed at: https://magic.w10e.com/johnnguyen/wfo-process-mapper
Deploy command: `./node_modules/.bin/magic put` (from repo root — `magic` not in PATH)

## Tech Stack
- **React 19 + TypeScript + Vite**
- **@xyflow/react v12** — canvas/nodes/edges
- **dagre** — auto-layout (`autoLayout()` in `src/lib/export.ts`)
- **@wealthsimple/magic** — platform: `MagicStorage`, `MagicAuth`, `MagicAI`, `MagicTools`
- **yaml** package — YAML parse/serialize

## Key Commands
```
pnpm dev                        # local dev server
pnpm build                      # production build
pnpm tsc --noEmit               # type-check only
pnpm test                       # run Vitest unit tests
./node_modules/.bin/magic put   # deploy to magic.w10e.com
```

## Magic Platform Notes
- `MagicAI.stream()` — async streaming, returns AsyncIterable (NOT sync)
- `MagicAuth.viewer()` — returns **Promise** (CRITICAL: must await, not sync access)
- `MagicStorage` — key-value storage, used for process entries and folders
- `MagicTools.call(toolName, params)` — invoke MCPLocker tools from the deployed app
- Globals available on `window`: `MagicAI`, `MagicAuth`, `MagicStorage`, `MagicTools`
- Not available in local dev — AI/Guru features require deploy via `magic put`

### MagicTools Response Format
MagicTools wraps all MCP responses as:
```json
{ "content": [{ "text": "{...json string...}", "type": "text" }] }
```
Always unwrap via `unwrapMagicTools()` in `src/lib/guru.ts` before parsing fields.

### MagicTools Tool Naming
- Drop the `mcp__mcplocker__` prefix when calling via `MagicTools.call()`
- Example: `mcp__mcplocker__notion__notion-create-pages` → `MagicTools.call('notion__notion-create-pages', ...)`
- Guru tools: `guru__guru_get_card_by_id`, `guru__guru_search_documents`, `guru__guru_list_knowledge_agents`
- Some tools may be policy-blocked for the Magic client even if listed in `MagicTools.list()` — use `MagicTools.list()` to inspect available tools at runtime

## Architecture Patterns

### canvasKey pattern
Forces `CanvasInner` remount when nodes change externally (e.g. AI apply):
```tsx
const canvasKey = `canvas-${nodes.length}-${nodeIds}-${layoutKey}`
```

### getCanvasMapRef pattern
ProcessBuilder reads live canvas state at save time, bypassing stale React state:
```typescript
onRegisterGetter={(getter) => { getCanvasMapRef.current = getter }}
// At save time:
const liveMap = getCanvasMapRef.current?.() ?? entry.processMap
```

### commit pattern
Every canvas interaction triggers YAML update:
`onNodesChange/onEdgesChange → commit(nodes, edges) → onChange(processMap) → patch({ processMap })`

### AI patch mode
Small edits use `patch:` YAML format (not full `process:` regeneration):
- `parsePatch()` in `src/lib/ai.ts` — parses the `patch:` format
- `applyMapPatch()` in `src/components/AiChatPanel.tsx` — merges patch into existing map
- AI outputs only what changed; client merges + runs autoLayout

## Key Files
```
src/lib/ai.ts                              # AI integration, SYSTEM_PROMPT, streamFormFill, parsePatch
src/lib/guru.ts                            # Guru MCP client (MagicTools wrappers, unwrapMagicTools)
src/lib/types.ts                           # ProcessEntry, ProcessNode, ProcessMap, etc.
src/lib/export.ts                          # fromYaml, toYaml, autoLayout
src/lib/storage.ts                         # MagicStorage wrappers
src/lib/metrics.ts                         # computeMetrics, path analysis
src/pages/ProcessBuilder.tsx               # Main page — form + canvas + AI panel
src/pages/ProcessList.tsx                  # Process list with folders/search
src/pages/ProcessAnalytics.tsx             # Outcome analytics page
src/components/AiChatPanel.tsx             # AI chat UI, applyMapPatch, Guru import wiring
src/components/guru/GuruImportModal.tsx    # Guru import modal (URL/ID fetch + keyword search)
src/components/canvas/ProcessCanvas.tsx    # Core canvas (CanvasInner + ProcessCanvas)
src/components/canvas/CompareView.tsx      # 3-panel compare (Current/Interim/Ideal)
src/components/canvas/NodeEditDialog.tsx   # Node edit overlay
src/components/canvas/OutcomePanel.tsx     # Outcome path highlighting
src/components/canvas/MetricsDashboard.tsx # Metrics + outcome breakdown
src/components/canvas/MapQualityChecklist.tsx # Quality score bar
```

## Guru Import Feature
The AI panel header has a green **Guru** button that opens `GuruImportModal`.

### How it works
1. **Card URL / ID tab** — paste a Guru card URL or bare card ID → fetches via `guru__guru_get_card_by_id` (param: `id`)
2. **Search tab** — keyword search → auto-fetches agentId via `guru__guru_list_knowledge_agents` on first open (cached in localStorage as `guru_agent_id`) → searches via `guru__guru_search_documents` (params: `agentId`, `query`; results under `documents` field)
3. **Import** — card content fed into `streamFormFill` as opening context; AI enters Conversation Mode, asks clarifying questions, generates YAML when user says "generate"

### Guru MCP tool parameters
- `guru__guru_get_card_by_id`: `{ id: string }` → returns `{ id, title, preferredPhrase, content (HTML) }`
- `guru__guru_search_documents`: `{ agentId: string, query: string }` → returns `{ documents: [...] }`
- `guru__guru_list_knowledge_agents`: `{}` → returns `{ agents: [...] }` (picks Banking/WFO/CX agent by name)

## Support Tier Structure
Used by the AI to assign node lanes and agent tier prefixes — **not** used for `team_owner`.

| Tier | Schema Label | Description |
|------|-------------|-------------|
| L1 | CS | Offshore. Initial contact. Tries to contain; triages to L2 if not. |
| L2 | Ops / Fraud Ops / L2 - Risk | In-house front-line. Handles triaged work. Owns client interaction throughout — even when opening JIRA to back-office. |
| L3 | (rare) | Highly trained. Only when source explicitly says escalate to L3. May involve TSA/TL. |

### team_owner selection rule
`team_owner` = the team that **executes and owns** the workflow, not just first-touch:
- L1 triages to L2 immediately → `[Ops]` (not `[CS, Ops]`)
- L2 opens a JIRA but handles the client → `[Ops]` (L2 still owns)
- L1 contains end-to-end → `[CS]`
- Custom values are supported as teams scale

### Node lane + agent tier prefix
Each node gets the lane of the tier performing **that specific step**:
- L1 action → `lane: CS`, label prefix: `"L1: ..."` or `"L1 24/7: ..."`
- L2 action → `lane: Ops`, label prefix: `"L2 Ops: ..."`
- L2 fraud → `lane: Fraud Ops`, label prefix: `"L2 Fraud: ..."`
- L2 risk → `lane: L2 - Risk`, label prefix: `"L2 Risk: ..."`
- L3 → `lane: Ops` unless specified, label prefix: `"L3: ..."`

## ProcessEntry Schema (abbreviated)
```typescript
{
  id, processName, domain, description, teamOwner[], volumeTier,
  userTools[], jiraBoards[], automation{...}, comms{...}, taxonomy{...},
  processMap: { nodes: ProcessNode[], edges: ProcessEdge[] },
  optimizationMap?: ProcessMap,   // Ideal flow
  interimMap?: ProcessMap,        // Interim fixed flow
  submittedBy, collaborators[], editLog[],
  deletedAt?, notionPageUrl?, status
}
```

## Compare Mode
- 3 independent canvases: `current` / `interim` / `ideal`
- Per-panel state in CompareView: `panelDirections`, `panelLineStyles`, `panelLayoutKeys`
- `compareEditHandlersRef` in ProcessBuilder maps panelId → edit handlers
- `hideLegend` prop on ProcessCanvas — hides the shared legend (shown once above all panels)

## Related Tools
- **LLM Gateway** (manual YAML generation): https://llm.w10e.com/?model=process-mapping-assistant-

## Notion Pages
- **How To Use Guide**: https://app.notion.com/p/wealthsimple/WFO-Process-Mapper-How-To-Use-37b41167bd968135a22dfb428cea5e4b
- **WFO Banking Planning**: https://app.notion.com/p/wealthsimple/WFO-BANKING-Planning-ce941167bd96831f84c601d5d0c263e2?p=37641167bd9681169c6ff97120917eb7
- **WFO Master Process Inventory**: https://app.notion.com/p/6d5cbb7a96744e8e82522e532228bad0

## GitHub
Repo: https://github.com/johnnguyen-del/wfo-process-mapper
Branch: main (direct push — no feature branch workflow)

## Known Gotchas
- `MagicAuth.viewer()` is async — always `await` it
- `autoLayout()` returns new node array with computed positions — replaces node positions
- `panOnDrag={[0,1,2]}` — left-click drag pans (Figma-style); Shift+drag = rubber-band select
- When adding AI patch nodes, positions start at `{x:0,y:0}` — always run `autoLayout` after merging
- `yaml` package (not `js-yaml`) — already in deps, use `import { parse } from 'yaml'`
- MagicTools response is always wrapped — use `unwrapMagicTools()` before accessing fields
- `guru_search_cards` / `guru_get_card` (plain Guru tools) are policy-blocked for Magic client — use `guru__guru_*` tools instead
