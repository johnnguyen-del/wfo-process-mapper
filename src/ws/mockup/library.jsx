/* global React, window, Icon */
// Library screen — list of playbooks with filter chips + featured hero card.

function Library({ dark }) {
  const playbooks = window.PLAYBOOKS;
  const domains = window.DOMAINS;
  const [activeDomain, setActiveDomain] = React.useState("all");
  const [view, setView] = React.useState("grid");
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [sort, setSort] = React.useState("popular");

  const counts = React.useMemo(() => {
    const c = { all: playbooks.length };
    for (const k of Object.keys(domains)) {
      c[k] = playbooks.filter((p) => p.domain === k).length;
    }
    return c;
  }, []);

  let filtered = playbooks.filter((p) =>
    (activeDomain === "all" || p.domain === activeDomain) &&
    (!verifiedOnly || p.verified)
  );
  if (sort === "popular") filtered = [...filtered].sort((a, b) => b.runs7d - a.runs7d);
  if (sort === "recent") filtered = [...filtered].sort((a, b) => (a.updated === "Today" ? -1 : 1));
  if (sort === "success") filtered = [...filtered].sort((a, b) => b.successRate - a.successRate);

  const hero = playbooks.find((p) => p.hero);
  const rest = filtered.filter((p) => p.id !== hero.id);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Playbooks</h1>
          <p className="page__subtitle">
            Step-by-step branching scripts for client support.
            Pick one to run, fork one to edit, or start from scratch.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--outline btn--sm"><Icon.Library size={14} /> My drafts <span className="nav__count" style={{ marginLeft: 4 }}>2</span></button>
          <button className="btn btn--primary btn--sm"><Icon.Plus size={14} /> New playbook</button>
        </div>
      </div>

      <div className="library-shell">
        <div>
          {/* Filter chips */}
          <div className="filterbar">
            <button
              className="chip"
              data-active={activeDomain === "all"}
              onClick={() => setActiveDomain("all")}
            >All <span className="chip__count">{counts.all}</span></button>
            {Object.entries(domains).map(([k, d]) => {
              const Ic = Icon[d.icon];
              return (
                <button
                  key={k}
                  className="chip"
                  data-active={activeDomain === k}
                  onClick={() => setActiveDomain(k)}
                >
                  <Ic size={12} />{d.label}
                  <span className="chip__count">{counts[k] || 0}</span>
                </button>
              );
            })}

            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="chip"
                data-active={verifiedOnly}
                onClick={() => setVerifiedOnly((v) => !v)}
              >
                <Icon.Verified size={12} /> Verified only
              </button>
              <div className="seg">
                <button data-active={sort === "popular"} onClick={() => setSort("popular")}>Popular</button>
                <button data-active={sort === "recent"} onClick={() => setSort("recent")}>Recent</button>
                <button data-active={sort === "success"} onClick={() => setSort("success")}>Success</button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="library-grid">
            {/* Hero (only when viewing all) */}
            {activeDomain === "all" && !verifiedOnly && hero ? (
              <HeroCard pb={hero} dark={dark} onRun={() => window.__nav("runner")} />
            ) : null}

            {rest.filter((p) => activeDomain === "all" || p.domain === activeDomain || !verifiedOnly).filter((p) => !verifiedOnly || p.verified).filter((p) => activeDomain === "all" || p.domain === activeDomain).map((p) => (
              <PlaybookCard key={p.id} pb={p} dark={dark} onRun={() => window.__nav("runner")} onEdit={() => window.__nav("builder")} />
            ))}
          </div>
        </div>

        {/* Right rail */}
        <aside className="runs">
          <div className="runs__head">
            <div className="runs__title">Recent runs</div>
            <button className="btn btn--ghost btn--sm">View all</button>
          </div>
          {window.RECENT_RUNS.map((r) => (
            <div key={r.id} className="run" data-status={r.status}>
              <span className="run__dot" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="run__title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                <div className="run__sub">{r.agent} · {r.sub}</div>
              </div>
              <div className="run__time">{r.time}</div>
            </div>
          ))}
          <button className="btn btn--outline btn--sm" style={{ marginTop: 10, alignSelf: "stretch", justifyContent: "center" }}>
            <Icon.Clock size={14} /> Run history
          </button>
        </aside>
      </div>
    </div>
  );
}

function PlaybookCard({ pb, dark, onRun, onEdit }) {
  const d = window.DOMAINS[pb.domain];
  const DIcon = Icon[d.icon];
  const [saved, setSaved] = React.useState(false);
  return (
    <div className="pcard" onClick={onRun} role="button" tabIndex={0}>
      <button
        className="pcard__bookmark"
        data-active={saved}
        onClick={(e) => { e.stopPropagation(); setSaved((v) => !v); }}
      ><Icon.Bookmark size={14} /></button>

      <div className="pcard__head">
        <div className="pcard__mark" style={{
          background: dark ? d.softDark : d.soft,
          color: d.hue,
        }}>
          <DIcon size={18} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="pcard__domain">{d.label}</div>
          <div className="pcard__title">{pb.title}</div>
        </div>
      </div>
      <p className="pcard__desc">{pb.description}</p>
      <div className="pcard__tags">
        {pb.tags.map((t, i) => (
          <window.Tag key={i} scheme={t.scheme}>{t.label}</window.Tag>
        ))}
        <window.Tag>{pb.steps} steps</window.Tag>
        <window.Tag><Icon.Clock size={11} /> ~{pb.avgMinutes}m</window.Tag>
      </div>
      <div className="pcard__stats">
        <span><strong>{pb.runs7d}</strong>runs · 7d</span>
        <span><strong>{pb.successRate}%</strong>complete</span>
        <span style={{ marginLeft: "auto" }}>Updated {pb.updated}</span>
      </div>
    </div>
  );
}

function HeroCard({ pb, dark, onRun }) {
  const d = window.DOMAINS[pb.domain];
  const DIcon = Icon[d.icon];
  return (
    <div className="pcard pcard--hero">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px 4px 4px", borderRadius: 99,
            background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 500,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 6,
              background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center",
            }}><DIcon size={12} /></span>
            {d.label} · Featured
          </span>
          <window.Tag scheme="positive" icon={Icon.Verified}>Verified</window.Tag>
        </div>
        <div className="pcard__title" style={{ marginBottom: 8 }}>{pb.title}</div>
        <p className="pcard__desc">{pb.description}</p>
        <div className="pcard__mini-stats">
          <div><div className="k">7-day runs</div><div className="v ws-tnum">{pb.runs7d}</div></div>
          <div><div className="k">Avg time</div><div className="v ws-tnum">{pb.avgMinutes}m</div></div>
          <div><div className="k">Success</div><div className="v ws-tnum">{pb.successRate}%</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          <button className="btn" style={{ background: "#fff", color: "#000" }} onClick={onRun}>
            <Icon.Play size={14} /> Start a run
          </button>
          <button className="btn" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
            <Icon.Edit size={14} /> Fork & edit
          </button>
        </div>
      </div>
      <HeroArt domain={pb.domain} />
    </div>
  );
}

// Decorative tree-diagram art for hero
function HeroArt({ domain }) {
  // Render a stylised branching flow.
  return (
    <div className="pcard--hero__art">
      <svg viewBox="0 0 360 200" width="100%" height="100%" style={{ maxHeight: 200 }}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>
        {/* Edges */}
        <path d="M180 30 C 180 60, 90 60, 90 90" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" />
        <path d="M180 30 C 180 60, 270 60, 270 90" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" />
        <path d="M90 120 C 90 145, 50 145, 50 170" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
        <path d="M90 120 C 90 145, 130 145, 130 170" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
        <path d="M270 120 C 270 145, 270 145, 270 170" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
        {/* Nodes */}
        <g>
          <rect x="138" y="6" width="84" height="28" rx="8" fill="url(#hg)" stroke="rgba(255,255,255,0.5)" />
          <text x="180" y="24" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="500">Confirm trade</text>
        </g>
        <g>
          <rect x="48" y="90" width="84" height="32" rx="8" fill="rgba(255,255,255,0.95)" />
          <text x="90" y="103" textAnchor="middle" fill="#000" fontSize="10" fontWeight="700">QUESTION</text>
          <text x="90" y="116" textAnchor="middle" fill="#000" fontSize="11">Market vs limit?</text>
        </g>
        <g>
          <rect x="228" y="90" width="84" height="32" rx="8" fill="url(#hg)" stroke="rgba(255,255,255,0.5)" />
          <text x="270" y="103" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">ACTION</text>
          <text x="270" y="116" textAnchor="middle" fill="#fff" fontSize="11">Suitability</text>
        </g>
        <g>
          <rect x="14" y="166" width="72" height="26" rx="7" fill="url(#hg)" stroke="rgba(255,255,255,0.4)" />
          <text x="50" y="183" textAnchor="middle" fill="#fff" fontSize="10">Place market</text>
        </g>
        <g>
          <rect x="94" y="166" width="72" height="26" rx="7" fill="url(#hg)" stroke="rgba(255,255,255,0.4)" />
          <text x="130" y="183" textAnchor="middle" fill="#fff" fontSize="10">Switch · limit</text>
        </g>
        <g>
          <rect x="234" y="166" width="72" height="26" rx="7" fill="url(#hg)" stroke="rgba(255,255,255,0.4)" />
          <text x="270" y="183" textAnchor="middle" fill="#fff" fontSize="10">Place order</text>
        </g>
      </svg>
    </div>
  );
}

window.Library = Library;
