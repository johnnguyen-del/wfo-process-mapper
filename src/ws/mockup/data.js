/* global window */
// Domains + sample playbook data, runner steps, builder nodes.

window.DOMAINS = {
  trade:    { label: "Trade",    icon: "Trend",  hue: "var(--dv-categorical-01)", soft: "var(--dv-sky-02)",       softDark: "var(--dv-sky-09)" },
  cash:     { label: "Cash",     icon: "Coin",   hue: "var(--positive-fg-strong)", soft: "var(--dv-celery-02)",   softDark: "var(--dv-celery-09)" },
  invest:   { label: "Invest",   icon: "Chart",  hue: "var(--dv-categorical-03)", soft: "var(--dv-aubergine-02)", softDark: "var(--dv-aubergine-09)" },
  crypto:   { label: "Crypto",   icon: "Coin2",  hue: "var(--dv-categorical-04)", soft: "var(--dv-lemon-02)",     softDark: "var(--dv-lemon-09)" },
  tax:      { label: "Tax",      icon: "Doc",    hue: "var(--dv-categorical-06)", soft: "var(--dv-apricot-02)",   softDark: "var(--dv-apricot-09)" },
  account:  { label: "Account",  icon: "User",   hue: "var(--dv-categorical-02)", soft: "var(--dv-lilac-02)",     softDark: "var(--dv-lilac-09)" },
};

window.PLAYBOOKS = [
  {
    id: "pb-trade-confirm",
    title: "Confirm a market trade & flag compliance risks",
    description: "Walks an agent through verbally confirming a market order, capturing intent, and routing edge cases (limit, suitability concerns) to the right next step.",
    domain: "trade",
    hero: true,
    tags: [{ scheme: "positive", label: "Verified" }, { scheme: "highlight", label: "Most used" }],
    verified: true,
    steps: 7,
    avgMinutes: 4,
    runs7d: 312,
    successRate: 94,
    updated: "2d ago",
    owners: ["KS", "JB"],
  },
  {
    id: "pb-cash-locked",
    title: "Cash account locked — identity recovery",
    description: "Five-step recovery: identify lockout reason, verify identity, choose reset path, log incident.",
    domain: "cash",
    verified: true,
    steps: 6, avgMinutes: 6, runs7d: 184, successRate: 88, updated: "1d ago",
    tags: [{ scheme: "positive", label: "Verified" }],
  },
  {
    id: "pb-tax-fhsa",
    title: "FHSA contribution room — qualifying & cap check",
    description: "Determines if the client qualifies for FHSA and what their available room is for this and next tax year.",
    domain: "tax",
    steps: 5, avgMinutes: 3, runs7d: 142, successRate: 91, updated: "5d ago",
    tags: [{ scheme: "highlight", label: "Tax season" }],
  },
  {
    id: "pb-invest-rebalance",
    title: "Quarterly rebalance — managed accounts",
    description: "Confirm target allocation, present drift, capture client preference (auto vs. confirm each trade).",
    domain: "invest",
    verified: true,
    steps: 8, avgMinutes: 7, runs7d: 96, successRate: 89, updated: "1w ago",
    tags: [{ scheme: "positive", label: "Verified" }],
  },
  {
    id: "pb-crypto-withdraw",
    title: "Crypto withdrawal hold — risk review",
    description: "Walks through the holds policy, verifies destination address risk score, and routes to manual approval if needed.",
    domain: "crypto",
    steps: 6, avgMinutes: 5, runs7d: 71, successRate: 76, updated: "3d ago",
    tags: [{ scheme: "warning", label: "Review" }],
  },
  {
    id: "pb-account-close",
    title: "Account closure — retention & confirmation",
    description: "Plain-language confirmation of closure reasons, alternative offers, and the close checklist.",
    domain: "account",
    steps: 7, avgMinutes: 8, runs7d: 54, successRate: 82, updated: "4d ago",
    tags: [],
  },
  {
    id: "pb-trade-limit",
    title: "Set a limit order — pricing guardrails",
    description: "Confirm side, quantity, limit price, time-in-force, and surface a warning if price is far from last trade.",
    domain: "trade",
    steps: 5, avgMinutes: 3, runs7d: 268, successRate: 96, updated: "Today",
    tags: [{ scheme: "positive", label: "Verified" }],
    verified: true,
  },
  {
    id: "pb-cash-direct-deposit",
    title: "Set up direct deposit",
    description: "Generate the right account/institution numbers, walk through the employer form.",
    domain: "cash",
    steps: 4, avgMinutes: 2, runs7d: 221, successRate: 98, updated: "1w ago",
    tags: [],
  },
  {
    id: "pb-tax-t5",
    title: "T5 / T3 slip not received — investigate",
    description: "Diagnose whether the slip was issued, mailed, or held; reissue digitally when eligible.",
    domain: "tax",
    steps: 5, avgMinutes: 4, runs7d: 87, successRate: 84, updated: "Today",
    tags: [{ scheme: "highlight", label: "Tax season" }],
  },
];

// Sample recent runs (right rail on Library)
window.RECENT_RUNS = [
  { id: "r1", title: "Confirm a market trade…", status: "active",    agent: "You",        time: "now", sub: "Step 3 · ticket #84219" },
  { id: "r2", title: "FHSA contribution room…",  status: "completed", agent: "K. Singh",   time: "12m", sub: "Completed · #84117" },
  { id: "r3", title: "Cash account locked…",     status: "completed", agent: "J. Patel",   time: "38m", sub: "Completed · #84092" },
  { id: "r4", title: "Crypto withdrawal hold…",  status: "abandoned", agent: "M. Liu",     time: "1h",  sub: "Abandoned at step 2" },
  { id: "r5", title: "Set a limit order…",       status: "completed", agent: "K. Singh",   time: "2h",  sub: "Completed · #83998" },
];

// Runner content
window.RUNNER_STEPS = [
  { id: "s1", title: "Verify caller identity",          kind: "checklist", status: "done", answer: "Verified · ID, DOB, recent activity" },
  { id: "s2", title: "Confirm trade details",           kind: "question",  status: "done", answer: "AAPL · 100 sh · market" },
  { id: "s3", title: "Confirm intent: market vs limit", kind: "question",  status: "current" },
  { id: "s4", title: "Run suitability flags",           kind: "action",    status: "upcoming" },
  { id: "s5", title: "Place order & confirm",           kind: "action",    status: "upcoming" },
];

window.RUNNER_CURRENT = {
  eyebrow: { step: 3, total: 5, kind: "Choice — branches the flow" },
  title: "Has the client confirmed they want this as a market order at current price?",
  body: [
    "Read this back to the client, verbatim: \"You're buying 100 shares of Apple at the current market price, which may execute at a different price than what you're seeing right now. Do you want me to place this order?\"",
    "If they hesitate, **don't** push them — branch B routes to a limit order, branch C ends the call with a callback scheduled for later today.",
  ],
  banner: {
    scheme: "highlight",
    title: "Compliance note",
    body: "If the client expresses any doubt about market vs. limit, you must offer the limit alternative. This is captured automatically in the run log.",
  },
  choices: [
    { key: "A", label: "Yes — confirmed verbally, place at market",      scheme: "positive" },
    { key: "B", label: "They'd prefer a limit order — switch order type", scheme: "highlight" },
    { key: "C", label: "Client is unsure — schedule a callback",          scheme: "neutral" },
  ],
};

// Builder nodes + edges (positioned in 1000x800 viewBox-ish space)
window.BUILDER_NODES = [
  { id: "n1", kind: "start",     title: "Trade confirmation flow",                     x: 380, y: 30,  meta: "Entry" },
  { id: "n2", kind: "checklist", title: "Verify identity (3 of 3)",                    x: 380, y: 170, meta: "ID · DOB · activity" },
  { id: "n3", kind: "question",  title: "Confirm market order at current price?",      x: 380, y: 310, meta: "3 choices" },
  { id: "n4", kind: "action",    title: "Run suitability flags",                       x: 130, y: 480, meta: "Auto · 2s" },
  { id: "n5", kind: "question",  title: "Switch to limit — confirm price",             x: 380, y: 480, meta: "2 choices" },
  { id: "n6", kind: "outcome",   title: "End: callback scheduled",                     x: 640, y: 480, meta: "Logs reason" },
  { id: "n7", kind: "action",    title: "Place order",                                 x: 130, y: 620, meta: "API · order/create" },
  { id: "n8", kind: "outcome",   title: "End: order placed",                           x: 380, y: 620, meta: "Limit submitted" },
];

window.BUILDER_EDGES = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3", label: "Passed" },
  { from: "n3", to: "n4", label: "Yes" },
  { from: "n3", to: "n5", label: "Limit" },
  { from: "n3", to: "n6", label: "Unsure" },
  { from: "n4", to: "n7" },
  { from: "n5", to: "n8" },
];
