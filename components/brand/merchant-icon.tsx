import { siAudible, siNetflix, siNewyorktimes, siPerplexity } from 'simple-icons'
import type { SimpleIcon } from 'simple-icons'
import { cn } from '@/lib/utils'

// App icons for known merchants, drawn from Simple Icons (CC0 SVGs; the marks
// themselves remain their owners' trademarks — see node_modules/simple-icons/DISCLAIMER.md).
// Keyed by catalog merchant key. Merchants without an icon fall back to a
// pastel initial tile, so never draw a logo by hand here.

interface AppIcon {
  icon: SimpleIcon
  bg: string
  fg: string
}

const ICONS: Record<string, AppIcon> = {
  nytimes: { icon: siNewyorktimes, bg: '#ffffff', fg: `#${siNewyorktimes.hex}` },
  perplexity: { icon: siPerplexity, bg: '#191a1a', fg: `#${siPerplexity.hex}` },
  netflix: { icon: siNetflix, bg: '#000000', fg: `#${siNetflix.hex}` },
  audible: { icon: siAudible, bg: `#${siAudible.hex}`, fg: '#ffffff' },
}

export function hasMerchantIcon(merchantKey: string): boolean {
  return merchantKey in ICONS
}

/**
 * A rounded app-icon tile. Decorative: the merchant name is always shown as
 * text beside it, so the icon is hidden from assistive tech.
 */
export function MerchantIcon({ merchantKey, name, fallbackTone = 'bg-sand', className }: { merchantKey: string; name: string; fallbackTone?: string; className?: string }) {
  const app = ICONS[merchantKey]
  if (!app) {
    return (
      <span aria-hidden className={cn('grid size-7 shrink-0 place-items-center rounded-[24%] text-[11px] font-semibold', fallbackTone, className)}>
        {name.replace(/^The /, '')[0]}
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn('grid size-7 shrink-0 place-items-center rounded-[24%] p-[5px] shadow-[inset_0_0_0_0.5px_rgb(60_60_60/0.18)]', className)}
      style={{ backgroundColor: app.bg }}
    >
      <svg viewBox="0 0 24 24" className="size-full" fill={app.fg}>
        <path d={app.icon.path} />
      </svg>
    </span>
  )
}
