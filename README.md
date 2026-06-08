# ⚡ WFO Process Mapper

AI-assisted, decision-tree-style process mapping tool for Wealthsimple TLs.

Walks TLs field-by-field through the WFO Master Process Inventory schema — enforcing conditional field logic, providing a built-in swimlane process map canvas (no Figma needed), and submitting directly to the Notion WFO Master Process Inventory database.

**Live:** `https://magic.w10e.com/johnnguyen/wfo-process-mapper`  
**Notion target:** [WFO Master Process Inventory](https://app.notion.com/p/wealthsimple/WFO-Master-Process-Inventory-6d5cbb7a96744e8e82522e532228bad0)

## Features

- **7-step guided wizard** — Core Identity → Volume & Tooling → Automation State (with conditional logic) → Comms & Fraud Risk → Taxonomy → Review
- **Built-in process map canvas** — ReactFlow swimlanes per team (CS / Ops / Fraud Ops / L2-Risk / Automation / Client), drag-drop nodes, double-click to edit
- **5 node types** — Step, Decision, Automation, Comms, Start/End
- **Conditional field enforcement** — Containment Blocker required when L0 Containable ✅ but Decagon ❌; Workato Recipe Link required when Workato ✅; Spoofable Risk auto-sets N/A for None comms
- **Map quality checklist** — auto-checks 5 criteria (swimlanes, time estimates, automation markers, decision points, comms)
- **Direct Notion write** on submit (Figma Map field links back to tool)
- **YAML export** for Claude analysis across all domains
- **Draft autosave** to MagicStorage / localStorage

## Tech Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + @xyflow/react + @wealthsimple/magic

## Dev Setup

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build
magic put       # deploy to magic.w10e.com
```

## V1 Deadline

Build complete: June 15, 2026  
Demo: CXO Onsite June 16–17, 2026
