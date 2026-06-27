type Tone = "primary" | "destructive" | "muted"

const TONES: Record<Tone, string> = {
  primary: "text-primary",
  destructive: "text-destructive",
  muted: "text-foreground",
}

export function MetricTile({
  label,
  value,
  tone = "muted",
  icon,
}: {
  label: string
  value: string
  tone?: Tone
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] leading-tight">{label}</span>
      </div>
      <p className={`mt-2 font-mono text-xl tabular ${TONES[tone]}`}>{value}</p>
    </div>
  )
}
