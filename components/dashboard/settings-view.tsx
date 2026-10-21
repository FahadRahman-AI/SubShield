'use client'

import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Switch } from '@/components/ui/form'
import { Bullet, Panel } from '@/components/ui/panel'
import { openBillingPortal } from '@/lib/actions/billing'
import { updateSettings } from '@/lib/actions/settings'
import { REGIONS, type Region, type Viewer } from '@/lib/data/types'
import { PRICING, PRO_FEATURES } from '@/lib/pricing'
import { UpgradeButton, UpgradeProvider } from './upgrade'

export function SettingsView({ viewer, yearlyWaste, leakCount }: { viewer: Viewer; yearlyWaste: number; leakCount: number }) {
  const [region, setRegion] = useState<Region>(viewer.region)
  const [alertEmail, setAlertEmail] = useState(viewer.alertEmail)
  const [alertSms, setAlertSms] = useState(viewer.alertSms)
  const [phone, setPhone] = useState(viewer.phone ?? '')
  const [saving, startSave] = useTransition()
  const [opening, startPortal] = useTransition()

  const save = () =>
    startSave(async () => {
      const res = await updateSettings({ region, alertEmail, alertSms, phone })
      if (res.ok) toast.success('Settings saved')
      else toast.error(res.error)
    })

  const manage = () =>
    startPortal(async () => {
      const res = await openBillingPortal()
      if (!res.ok) toast.error(res.error)
      else if (res.url) window.location.href = res.url
      else toast('Demo mode: subscription cancelled — back on the free plan.')
    })

  return (
    <UpgradeProvider yearlyWaste={yearlyWaste} leakCount={leakCount}>
      <div className="mx-auto max-w-4xl">
        <h1 className="type-display">Plan & alerts</h1>

        <Panel tone={viewer.isPro ? 'sand' : 'panel'} className="mt-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="type-label">{viewer.isPro ? 'SubShield Pro' : 'Free plan'}</p>
              <p className="type-title mt-1 flex items-center gap-3">
                {viewer.isPro ? (viewer.plan === 'monthly' ? `${PRICING.monthly.label}/mo` : `${PRICING.yearly.label}/yr`) : '$0'}
                {viewer.isPro ? <Badge tone="save">Active</Badge> : null}
              </p>
              <p className="type-label mt-2">
                {viewer.isPro
                  ? viewer.currentPeriodEnd
                    ? `Renews ${new Date(viewer.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    : 'All features unlocked'
                  : `${PRICING.monthly.label}/mo or ${PRICING.yearly.label}/yr to unlock everything`}
              </p>
            </div>
            {viewer.isPro ? (
              <Button variant="secondary" onClick={manage} disabled={opening}>
                {opening ? <Loader2 className="animate-spin" /> : null} {viewer.mode === 'demo' ? 'Cancel Pro (demo)' : 'Manage billing'}
              </Button>
            ) : (
              <UpgradeButton>Upgrade</UpgradeButton>
            )}
          </div>
          {!viewer.isPro ? (
            <ul className="mt-6 grid grid-cols-1 gap-1.5 text-[14px] sm:grid-cols-2">
              {PRO_FEATURES.map((f) => (
                <li key={f}>— {f}</li>
              ))}
            </ul>
          ) : (
            <p className="type-label mt-5">Cancel any time from the billing portal. No retention flow — promise.</p>
          )}
        </Panel>

        <Panel className="mt-[10px] p-5 sm:p-6">
          <Bullet>Alerts</Bullet>
          <p className="type-label mt-1 pl-4 text-dim">
            Renewal warnings 3 days before each charge, plus new-subscription and price-hike alerts.{!viewer.isPro ? ' Pro only.' : ''}
          </p>
          <div className="mt-6 space-y-[3px]">
            <label className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
              <span>
                <span className="block text-[14px]">Email alerts</span>
                <span className="type-label text-dim">to {viewer.email}</span>
              </span>
              <Switch checked={alertEmail} onCheckedChange={setAlertEmail} disabled={!viewer.isPro} />
            </label>
            <label className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
              <span>
                <span className="block text-[14px]">SMS alerts</span>
                <span className="type-label text-dim">Renewals and price hikes by text</span>
              </span>
              <Switch checked={alertSms} onCheckedChange={setAlertSms} disabled={!viewer.isPro} />
            </label>
            {alertSms ? (
              <div className="space-y-2 bg-white px-4 py-3.5">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+14155550123" autoComplete="tel" className="bg-page" />
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel className="mt-[10px] p-5 sm:p-6">
          <Bullet>Region</Bullet>
          <p className="type-label mt-1 pl-4 text-dim">Cancellation letters cite the consumer-protection rules for this region.</p>
          <Select className="mt-5 max-w-xs" value={region} onChange={(e) => setRegion(e.target.value as Region)} aria-label="Region">
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Panel>

        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null} Save settings
          </Button>
        </div>
      </div>
    </UpgradeProvider>
  )
}
