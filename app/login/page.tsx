import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { Logo } from '@/components/brand/logo'
import { CalendarObject, DuplicateObject, ReceiptObject, ScissorsObject, Tile } from '@/components/landing/tiles'
import { isDemo } from '@/lib/env'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="gutter flex flex-col py-6">
        <Logo />
        <div className="my-auto w-full max-w-md py-16">
          <h1 className="type-display">Start your free scan</h1>
          <p className="mt-4 text-dim">Sign in or create an account. No password, no card.</p>
          <Suspense>
            <LoginForm demo={isDemo} />
          </Suspense>
        </div>
        <p className="type-label text-dim">By continuing you agree to read-only access to the accounts you connect. Revoke it any time.</p>
      </div>
      <div aria-hidden className="hidden content-center bg-panel p-[54px] lg:grid">
        <div className="grid grid-cols-3 grid-rows-[repeat(3,190px)] gap-[10px]">
          <Tile tone="bg-butter" label="Promo rate ended" className="col-start-1 row-start-1">
            <ReceiptObject />
          </Tile>
          <Tile tone="bg-coral" label="Cut" className="col-start-2 row-start-2">
            <ScissorsObject />
          </Tile>
          <Tile tone="bg-lavender" label="Renewal warning" className="col-start-3 row-start-1">
            <CalendarObject />
          </Tile>
          <Tile tone="bg-olive" label="Billed twice" className="col-start-1 row-start-3">
            <DuplicateObject />
          </Tile>
        </div>
      </div>
    </div>
  )
}
