const STYLES: Record<string, string> = {
  live: "border-primary/30 bg-primary/10 text-primary",
  sold_out: "border-border bg-secondary text-muted-foreground",
  paused: "border-chart-4/30 bg-chart-4/10 text-chart-4",
  oversold: "border-destructive/30 bg-destructive/10 text-destructive",
}

const LABELS: Record<string, string> = {
  live: "Live",
  sold_out: "Sold out",
  paused: "Paused",
  oversold: "Oversold",
}

export function StatusPill({ status }: { status: string }) {
  const dot =
    status === "live"
      ? "bg-primary"
      : status === "oversold"
        ? "bg-destructive"
        : status === "paused"
          ? "bg-chart-4"
          : "bg-muted-foreground"
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        STYLES[status] ?? STYLES.sold_out
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${status === "live" ? "animate-pulse" : ""}`} />
      {LABELS[status] ?? status}
    </span>
  )
}
