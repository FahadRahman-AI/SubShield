'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/brand/logo'
import { useMotionLevel } from '@/components/motion/motion-provider'
import { Badge } from '@/components/ui/badge'
import { Cascade } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#app', label: 'App' },
  { href: '#pricing', label: 'Price' },
  { href: '#check', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
]

const cell = 'group/btn flex h-12 items-center bg-white px-5 text-[13.5px] text-ink transition-colors hover:bg-panel-2'

function MotionCell({ className }: { className?: string }) {
  const { level, setLevel } = useMotionLevel()
  return (
    <button
      type="button"
      onClick={() => setLevel(level === 'high' ? 'low' : 'high')}
      className={cn(cell, 'gap-2', className)}
      aria-label={`Motion ${level}. Switch to ${level === 'high' ? 'low' : 'high'}.`}
    >
      Motion
      <Badge tone={level === 'high' ? 'leak' : 'save'}>{level === 'high' ? 'High' : 'Low'}</Badge>
      <ChevronDown className="size-3.5 text-dim" />
    </button>
  )
}

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="gutter pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between pt-4 sm:pt-5">
      <div className="pointer-events-auto flex h-12 items-center bg-white px-4 sm:bg-transparent sm:px-0">
        <Logo />
      </div>

      <nav aria-label="Main" className="pointer-events-auto flex items-start gap-px">
        <AnimatePresence initial={false}>
          {open ? (
            <motion.ul
              key="links"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="hidden gap-px md:flex"
            >
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(false)} className={cell}>
                    <Cascade>{l.label}</Cascade>
                  </Link>
                </li>
              ))}
              <li>
                <MotionCell />
              </li>
            </motion.ul>
          ) : null}
        </AnimatePresence>
        <MotionCell className="md:hidden" />
        <Link href="/login" data-track="nav" className={cn(cell, 'hidden bg-ink text-white hover:bg-[#2a2a2a] sm:flex', open && 'md:hidden')}>
          <Cascade>Scan free</Cascade>
        </Link>
        <button type="button" onClick={() => setOpen((o) => !o)} className={cn(cell, 'w-12 justify-center px-0')} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {/* Mobile menu: stacked white rows under the header */}
      <AnimatePresence>
        {open ? (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto absolute inset-x-4 top-[68px] flex flex-col gap-px md:hidden"
          >
            {[...LINKS, { href: '/login', label: 'Scan free' }].map((l) => (
              <li key={l.label}>
                <Link href={l.href} onClick={() => setOpen(false)} className={cn(cell, 'h-14 w-full', l.label === 'Scan free' && 'bg-ink text-white hover:bg-[#2a2a2a]')}>
                  {l.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
