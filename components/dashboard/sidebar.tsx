'use client'

import { CreditCard, LayoutDashboard, Link2, ListChecks, Scissors } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

export const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: ListChecks },
  { href: '/dashboard/cancel', label: 'Cancel Copilot', icon: Scissors },
  { href: '/dashboard/connections', label: 'Connections', icon: Link2 },
  { href: '/dashboard/settings', label: 'Plan & alerts', icon: CreditCard },
] as const

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

// The pathname is request data on dynamic routes, so the active-state lookup
// streams in behind <Suspense>; the fallback is the same nav without a highlight.

function SideLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex h-12 items-center gap-3 px-4 text-[14px] transition-colors', active ? 'bg-white' : 'hover:bg-panel-2')}
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

function MobileLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px]', active ? 'bg-page' : 'text-dim')}
          >
            <item.icon className="size-5" strokeWidth={1.75} />
            {item.label.split(' ')[0]}
          </Link>
        )
      })}
    </>
  )
}

function ActiveSideLinks() {
  return <SideLinks pathname={usePathname()} />
}

function ActiveMobileLinks() {
  return <MobileLinks pathname={usePathname()} />
}

export function Sidebar({ footer }: { footer: ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-panel lg:flex">
      <div className="flex h-20 items-center px-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="mt-6 flex flex-col gap-px px-3" aria-label="Dashboard">
        <Suspense fallback={<SideLinks pathname={null} />}>
          <ActiveSideLinks />
        </Suspense>
      </nav>
      <div className="mt-auto p-3">{footer}</div>
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-40 flex bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <Suspense fallback={<MobileLinks pathname={null} />}>
        <ActiveMobileLinks />
      </Suspense>
    </nav>
  )
}
