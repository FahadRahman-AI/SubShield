'use client'

import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMotionLevel } from '@/components/motion/motion-provider'
import { cn } from '@/lib/utils'

/**
 * Animated number. Writes straight to the DOM node each frame (no React
 * re-render per frame) and starts when scrolled into view.
 */
export function CountUp({
  value,
  from = 0,
  duration = 1.8,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number
  from?: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  // Imperative animate() bypasses <MotionConfig>, so honour both the OS
  // setting and the in-app Motion: Low switch here explicitly.
  const { level } = useMotionLevel()
  const reduce = useReducedMotion() || level === 'low'

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const fmt = (n: number) =>
      prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
    if (reduce) {
      node.textContent = fmt(value)
      return
    }
    if (!inView) return
    const controls = animate(from, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = fmt(v)
      },
    })
    return () => controls.stop()
  }, [inView, value, from, duration, delay, prefix, suffix, decimals, reduce])

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {from.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
