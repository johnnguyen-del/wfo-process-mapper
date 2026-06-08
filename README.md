# ⚡ WFO Process Mapper

AI-assisted process mapping tool for Wealthsimple TLs. Walks through the WFO Master Process Inventory schema field-by-field, builds a visual process map, and submits directly to Notion.

**Live:** https://magic.w10e.com/johnnguyen/wfo-process-mapper  
**Project page:** https://app.notion.com/p/37641167bd9681169c6ff97120917eb7  
**Notion target:** [WFO Master Process Inventory](https://app.notion.com/p/6d5cbb7a96744e8e82522e532228bad0)  
**Process Mapping Assistant (YAML generator):** https://llm.w10e.com/?model=process-mapping-assistant-

## Status — V1 Complete (June 8, 2026)

✅ Deployed to Magic  
✅ Demo-ready for CXO Onsite June 16–17  
🔴 Notion write blocked — MCPLocker bot needs `create page` permission on the WFO Master Process Inventory database (workspace admin action required)

## Features

- **7-step guided wizard** — Core Identity → Volume & Tooling → Automation State (conditional logic) → Comms & Fraud Risk → Taxonomy → Review & Submit
- **AI Fill** — paste YAML from the [Process Mapping Assistant](https://llm.w10e.com/?model=process-mapping-assistant-) to auto-populate all fields + process map in one shot
- **Built-in process map canvas** — color-coded nodes by team (CS/Ops/L2-Risk/etc), dagre auto-layout, bezier edges with Yes/No color coding (green/red), multi-select + move, double-click to edit
- **6 node types** — Start (orange), Step, Decision, Automation, Comms, End (green) — each with team badge
- **YAML DSL** — same format in and out; canvas auto-layouts from imported YAML; Download YAML for Claude analysis
- **Conditional field enforcement** — Containment Blocker required when L0 Containable ✅ but Decagon ❌; Workato Recipe Link required when Workato ✅; Spoofable Risk auto-sets N/A
- **Map quality checklist** — 5-point auto-validation (swimlanes, time estimates, automation markers, decision points, comms)
- **Direct Notion write** on submit — pending MCPLocker permissions fix
- **Post-submit success screen** with direct "Open in Notion" link
- **Owner-only delete** — MagicAuth.isOwner gates destructive actions
- **Draft autosave** to MagicStorage / localStorage

## Tech Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + @xyflow/react + dagre + @wealthsimple/magic

## Dev Setup

```bash
# pnpm is required (used by the Magic platform)
pnpm install
pnpm dev          # http://localhost:5173 (MagicAI not available locally)
pnpm build
node_modules/.bin/magic put   # deploy to magic.w10e.com
```

## Architecture

```
src/
├── lib/
│   ├── types.ts        # ProcessEntry schema (all 27 WFO inventory fields)
│   ├── validate.ts     # Required field + conditional logic validation
│   ├── export.ts       # toYaml(), fromYaml() + dagre autoLayout()
│   ├── storage.ts      # MagicStorage + localStorage persistence
│   ├── notion.ts       # MagicTools.call('notion__notion-create-pages', ...)
│   └── ai.ts           # MagicAI.stream() with WFO schema system prompt
├── components/
│   ├── wizard/         # 7 wizard step components
│   ├── canvas/         # ReactFlow canvas + node types + quality checklist
│   └── AiChatPanel.tsx # AI Fill (Auto-fill + Paste YAML tabs)
└── pages/
    ├── ProcessList.tsx  # Submissions list grouped by domain
    └── ProcessBuilder.tsx  # Split-panel: wizard left, canvas right
```

## Notion Write — Permissions Fix Required

The tool calls `MagicTools.call('notion__notion-create-pages', ...)` which uses the MCPLocker Notion bot. The bot needs explicit write access to the WFO Master Process Inventory:

1. Open the [WFO Master Process Inventory](https://app.notion.com/p/6d5cbb7a96744e8e82522e532228bad0) in Notion
2. Click **···** → **Connections** → add the **MCPLocker** integration
3. Submissions will then write directly to the database

## Process Mapping Assistant

The gateway LLM at `https://llm.w10e.com/?model=process-mapping-assistant-` is configured with a system prompt that generates YAML in the WFO DSL format. The current system prompt is in [`Process Mapping Assistant.md`](Process%20Mapping%20Assistant.md).

Paste a Guru card or process description → get YAML → paste into the tool's **AI Fill → Paste YAML** tab → Apply.
