import { cn } from "@/lib/utils"

const TICK_COUNT = 44
const SIZE = 128
const CENTER = SIZE / 2
const OUTER_RADIUS = 56
const INNER_RADIUS = 46

interface GrowthGaugeProps {
  /** Signed percent change, e.g. 78 or -12.4. */
  value: number
  label?: string
}

// Fixed precision so server- and client-computed trig values always
// serialize identically (raw floats can differ in the last bit between
// Node's and the browser's math libs, which trips a hydration mismatch).
function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function GrowthGauge({ value, label = "Growth" }: GrowthGaugeProps) {
  // Fill by magnitude so a decline is visible too (in the destructive color),
  // capped at a full ring for changes beyond ±100%.
  const ratio = Math.min(1, Math.abs(value) / 100)
  const filledTicks = Math.round(ratio * TICK_COUNT)
  const rounded = Math.round(value)
  const filledClass = value < 0 ? "stroke-destructive" : "stroke-primary"

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        {Array.from({ length: TICK_COUNT }, (_, i) => {
          const angle = (i / TICK_COUNT) * 2 * Math.PI
          const x1 = round(CENTER + INNER_RADIUS * Math.cos(angle))
          const y1 = round(CENTER + INNER_RADIUS * Math.sin(angle))
          const x2 = round(CENTER + OUTER_RADIUS * Math.cos(angle))
          const y2 = round(CENTER + OUTER_RADIUS * Math.sin(angle))
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={2.5}
              strokeLinecap="round"
              className={cn(
                "transition-colors duration-300 motion-reduce:transition-none",
                i < filledTicks ? filledClass : "stroke-border"
              )}
              style={{ transitionDelay: `${i * 8}ms` }}
            />
          )
        })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={cn(
            "text-xl font-semibold tracking-tight tabular-nums",
            value < 0 && "text-destructive"
          )}
        >
          {rounded >= 0 ? "+" : ""}
          {rounded}%
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
