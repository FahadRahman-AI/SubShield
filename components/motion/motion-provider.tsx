'use client'

import { MotionConfig } from 'framer-motion'
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'

// A visitor-facing "Motion: High / Low" switch. Low disables Framer Motion
// animations and CSS animations/transitions (html[data-motion="low"]), on
// top of the OS-level prefers-reduced-motion which is always respected.

export type MotionLevel = 'high' | 'low'

const KEY = 'ss-motion'
const MotionLevelContext = createContext<{ level: MotionLevel; setLevel: (l: MotionLevel) => void }>({
  level: 'high',
  setLevel: () => {},
})

export function useMotionLevel() {
  return use(MotionLevelContext)
}

function readStored(): MotionLevel {
  try {
    return localStorage.getItem(KEY) === 'low' ? 'low' : 'high'
  } catch {
    return 'high'
  }
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<MotionLevel>('high')

  // Read the stored preference after hydration so server and client markup match.
  useEffect(() => {
    const stored = readStored()
    if (stored === 'low') {
      document.documentElement.dataset.motion = 'low'
      setLevelState('low') // eslint-disable-line react-hooks/set-state-in-effect -- syncing from localStorage, an external store
    }
  }, [])

  const setLevel = useCallback((next: MotionLevel) => {
    setLevelState(next)
    document.documentElement.dataset.motion = next
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // storage unavailable (private mode) — the choice still applies to this visit
    }
  }, [])

  return (
    <MotionLevelContext value={{ level, setLevel }}>
      <MotionConfig reducedMotion={level === 'low' ? 'always' : 'user'} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </MotionConfig>
    </MotionLevelContext>
  )
}
