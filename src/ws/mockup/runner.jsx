/* global React, window */
// Runner — declutter pass: focus on the question + choices, drop chrome.

function Runner({ playbook, dark }) {
  const Icon = window.Icon;
  const D = window.DOMAINS[playbook.domain];
  const DIcon = Icon[D.icon];
  const steps = window.RUNNER_STEPS;
  const cur = window.RUNNER_CURRENT;
  const [picked, setPicked] = React.useState(null);

  return (
    <div className="page page--runner">
      {/* Slim header — just enough context */}
      <div className="run-head">
        <div className="run-head__l">
          <span className="run-head__mark" style={{
            background: dark ? D.softDark : D.soft, color: D.hue,
          }}><DIcon size={13} /></span>
          <span className="run-head__crumbs">
            {D.label}
            <span className="run-head__sep">/</span>
            {playbook.title}
          </span>
        </div>
        <button className="btn btn--ghost btn--sm">
          <Icon.X size={14} /> Exit
        </button>
      </div>

      <div className="runner-shell runner-shell--calm">
        {/* Slim step rail */}
        <aside className="run-rail">
          <div className="run-rail__head">
            <div className="run-rail__sub">Step {steps.findIndex((s) => s.status === "current") + 1} of {steps.length}</div>
            <div className="progress" style={{ marginTop: 8 }}>
              {steps.map((s) => (
                <div
                  key={s.id}
                  className="progress__seg"
                  data-done={s.status === "done"}
                  data-current={s.status === "current"}
                />
              ))}
            </div>
          </div>

          <div className="crumbs crumbs--calm">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className="crumb crumb--calm"
                data-done={s.status === "done"}
                data-current={s.status === "current"}
              >
                <span className="crumb__bullet">
                  {s.status === "done" ? <Icon.Check size={10} /> : i + 1}
                </span>
                <div style={{ minWidth: 0, flex: 1, fontSize: 13 }}>{s.title}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Step body */}
        <div className="run-body">
          <h2 className="run-q">{cur.title}</h2>

          <div className="run-script">
            {cur.body.map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{
                __html: p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              }} />
            ))}
          </div>

          <div className="choices choices--calm">
            {cur.choices.map((c) => (
              <button
                key={c.key}
                className="choice choice--calm"
                data-picked={picked === c.key}
                onClick={() => setPicked(c.key)}
              >
                <span className="choice__key">{c.key}</span>
                <span className="choice__label">{c.label}</span>
                <Icon.ArrowRight className="choice__arrow" size={16} />
              </button>
            ))}
          </div>

          {/* Folded: compliance note becomes a small inline disclosure */}
          <details className="disclosure">
            <summary>
              <Icon.Info size={13} />
              <span>Compliance note for this step</span>
            </summary>
            <p>{cur.banner.body}</p>
          </details>

          <div className="run-actions">
            <button className="btn btn--ghost btn--sm">
              <Icon.ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back
            </button>
            <button className="btn btn--primary" disabled={!picked}>
              Continue <Icon.ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Runner = Runner;
