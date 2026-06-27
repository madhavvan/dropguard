import type { Outcome, PurchaseAttempt } from "@/lib/types"

const OUTCOME: Record<Outcome, { label: string; dot: string; text: string }> = {
  sold: { label: "SOLD", dot: "bg-primary", text: "text-primary" },
  sold_out: { label: "SOLD OUT", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  error: { label: "ERROR", dot: "bg-destructive", text: "text-destructive" },
}

export function AttemptFeed({ attempts }: { attempts: PurchaseAttempt[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live purchase log</h2>
        <span className="font-mono text-[11px] text-muted-foreground">latest {attempts.length}</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {attempts.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No attempts yet. Launch a stampede to populate the log.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {attempts.map((a) => {
              const o = OUTCOME[a.outcome]
              return (
                <li key={a.id} className="row-in flex items-center gap-3 px-4 py-2.5 font-mono text-xs">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.dot}`} />
                  <span className={`w-20 shrink-0 font-medium ${o.text}`}>{o.label}</span>
                  <span className="w-20 shrink-0 text-muted-foreground">{a.region}</span>
                  <span
                    className={`w-16 shrink-0 ${a.mode === "naive" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {a.mode}
                  </span>
                  <span className="w-16 shrink-0 text-right text-muted-foreground">{a.retries} retries</span>
                  <span className="ml-auto text-right text-muted-foreground">{a.latency_ms}ms</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
