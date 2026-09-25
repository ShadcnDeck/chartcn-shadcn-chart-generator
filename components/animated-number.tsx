"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  /** Tween length in ms. */
  duration?: number
  className?: string
}

/** Counts from the previously shown value to `value` with an ease-out tween.
 * Jumps straight to the value when the user prefers reduced motion. */
export function AnimatedNumber({ value, format, duration = 700, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    const from = shownRef.current
    if (from === value) return
    const length = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration

    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = length > 0 ? Math.min(1, (now - start) / length) : 1
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (value - from) * eased
      shownRef.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span className={className}>{format(shown)}</span>
}
