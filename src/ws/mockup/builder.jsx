/* global React, window, Icon */
// Builder screen — visual canvas of nodes + side inspector.

function Builder({ playbook, dark }) {
  const D = window.DOMAINS[playbook.domain];
  const DIcon = window.Icon[D.icon];
  const nodes = window.BUILDER_NODES;
  const [selectedId, setSelectedId] = React.useState("n3");
  const selected = nodes.find((n) => n.id === selectedId);

  return (
    <div className="page">
      <div className="page__header" style={{ marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="run-side__chip">
              <span className="run-side__chip-mark" style={{ background: dark ? D.softDark : D.soft, color: D.hue }}>
                <DIcon size={12} />
              </span>
              {D.label} · Draft
            </span>
            <window.Tag scheme="warning" icon={Icon.Pencil}>Unsaved · 2m ago</window.Tag>
          </div>
          <h1 className="page__title">{playbook.title}</h1>
          <p className="page__subtitle">{playbook.description}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--outline btn--sm"><Icon.History size={14} /> History</button>
          <button className="btn btn--outline btn--sm"><Icon.Play size={14} /> Preview</button>
          <button className="btn btn--primary btn--sm"><Icon.Check size={14} /> Publish</button>
        </div>
      </div>

      <div className="builder-shell">
        {/* Left: node library */}
        <aside className="builder-side">
          <div className="builder-side__title">Add a step</div>
          {[
            { kind: "question", label: "Question", desc: "Branch on agent choice", icon: "Question" },
            { kind: "checklist", label: "Checklist", desc: "Multi-item gate", icon: "Checklist" },
            { kind: "action", label: "Manual action", desc: "Agent does something", icon: "Hand" },
            { kind: "lookup", label: "Lookup", desc: "Read from system", icon: "Database" },
            { kind: "outcome", label: "Outcome", desc: "End of branch", icon: "Flag" },
          ].map((t) => {
            const I = Icon[t.icon];
            return (
              <button key={t.kind} className="builder-side__item" data-kind={t.kind}>
                <span className="builder-side__item-icon"><I size={14} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "var(--soft-fg)" }}>{t.desc}</div>
                </div>
              </button>
            );
          })}
          <div className="builder-side__title" style={{ marginTop: 8 }}>Linked playbooks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--soft-fg)" }}>
            <div>· Account locked → password reset</div>
            <div>· DRIP enrolment</div>
            <div>· TFSA contribution check</div>
          </div>
        </aside>

        {/* Canvas */}
        <div className="canvas">
         <div className="canvas__inner">
          <div className="canvas__grid" />
          <div className="canvas__toolbar">
            <button className="canvas__tool" title="Zoom in"><Icon.Plus size={14} /></button>
            <button className="canvas__tool" title="Zoom out"><Icon.Minus size={14} /></button>
            <span style={{ fontSize: 11, color: "var(--soft-fg)" }}>100%</span>
            <button className="canvas__tool" title="Fit"><Icon.Fit size={14} /></button>
          </div>
          <div className="canvas__zoom">⌘ + scroll to zoom · drag to pan</div>

          <svg className="canvas__svg" viewBox="0 0 920 760" preserveAspectRatio="none">
            {window.BUILDER_EDGES.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const x1 = a.x + 110, y1 = a.y + 88;
              const x2 = b.x + 110, y2 = b.y;
              const mid = (y1 + y2) / 2;
              const path = `M${x1} ${y1} C${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
              return (
                <g key={i}>
                  <path d={path} stroke="var(--outline)" strokeWidth="1.5" fill="none" />
                  {e.label ? (
                    <g>
                      <rect x={(x1 + x2) / 2 - 26} y={mid - 11} width={52} height={22} rx={11} fill="var(--app-bg)" stroke="var(--outline)" />
                      <text x={(x1 + x2) / 2} y={mid + 4} textAnchor="middle" fontSize="11" fill="var(--soft-fg)" fontWeight="500">{e.label}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {nodes.map((n) => (
            <div
              key={n.id}
              className="bnode"
              data-kind={n.kind}
              data-selected={selectedId === n.id}
              style={{ left: n.x, top: n.y }}
              onClick={() => setSelectedId(n.id)}
            >
              <div className="bnode__head">
                <span className="bnode__icon">
                  {n.kind === "start" ? <Icon.Play size={12} /> : null}
                  {n.kind === "question" ? <Icon.Question size={12} /> : null}
                  {n.kind === "checklist" ? <Icon.Checklist size={12} /> : null}
                  {n.kind === "action" ? <Icon.Hand size={12} /> : null}
                  {n.kind === "outcome" ? <Icon.Flag size={12} /> : null}
                </span>
                <span style={{ textTransform: "capitalize" }}>{n.kind}</span>
              </div>
              <div className="bnode__title">{n.title}</div>
              {n.meta ? <div className="bnode__meta">{n.meta}</div> : null}
            </div>
          ))}
         </div>
        </div>

        {/* Inspector */}
        <aside className="inspector">
          <div className="inspector__eyebrow">
            <Icon.Question size={12} /> Question node · n3
          </div>
          <div className="inspector__title">{selected?.title}</div>

          <div className="inspector__field">
            <label>Prompt to agent</label>
            <textarea defaultValue={"Has the client confirmed they want this trade as a market order at current price?"} />
          </div>

          <div className="inspector__field">
            <label>Choices</label>
            <div className="inspector__choices">
              {[
                { k: "A", l: "Yes, confirmed verbally", out: "Proceed to order entry", scheme: "positive" },
                { k: "B", l: "Wants a limit order instead", out: "Branch: switch order type", scheme: "highlight" },
                { k: "C", l: "Not sure / wants to think", out: "End: schedule callback", scheme: "neutral" },
              ].map((c) => (
                <div key={c.k} className="inspector__choice">
                  <span className="inspector__choice-key">{c.k}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.l}</div>
                    <div style={{ fontSize: 11, color: "var(--soft-fg)", marginTop: 2 }}>
                      → {c.out}
                    </div>
                  </div>
                  <window.Tag scheme={c.scheme}>{c.scheme}</window.Tag>
                </div>
              ))}
              <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start", padding: 0 }}>
                <Icon.Plus size={14} /> Add choice
              </button>
            </div>
          </div>

          <div className="inspector__field">
            <label>Reasoning hint (shown after answer)</label>
            <textarea defaultValue={"Surfaces a compliance reminder once the agent selects an option."} />
          </div>

          <div className="inspector__row-meta">
            <div>
              <div className="inspector__row-meta-k">Used in</div>
              <div className="inspector__row-meta-v">12 runs / 7 days</div>
            </div>
            <div>
              <div className="inspector__row-meta-k">Avg time</div>
              <div className="inspector__row-meta-v">28s</div>
            </div>
            <div>
              <div className="inspector__row-meta-k">Drop-off</div>
              <div className="inspector__row-meta-v">3.1%</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.Builder = Builder;
