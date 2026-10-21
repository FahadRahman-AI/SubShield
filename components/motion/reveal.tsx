'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/** Lifts its content in when it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Splits a line into words that slide up from behind a mask, staggered. */
export function SplitWords({ text, className, delay = 0, stagger = 0.05 }: { text: string; className?: string; delay?: number; stagger?: number }) {
  const words = text.split(' ')
  // The animated words are aria-hidden; the real text sits in an sr-only span
  // (aria-label on a generic <span> isn't reliably announced).
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="-mb-[0.1em] inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span className="inline-block" initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ duration: 1, delay: delay + i * stagger, ease: EASE }}>
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </span>
  )
}
