import type { Metadata, Viewport } from 'next'
import { Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import { MotionProvider } from '@/components/motion/motion-provider'
import './globals.css'

// Switzer by Indian Type Foundry (ITF Free Font License, free for commercial
// use), self-hosted so no page waits on a third-party stylesheet.
const switzer = localFont({
  src: [
    { path: './fonts/Switzer-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Switzer-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Switzer-Semibold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-switzer',
  display: 'swap',
})

const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'SubShield — Find, understand, and cut recurring charges',
    template: '%s · SubShield',
  },
  description:
    'SubShield connects to your bank and inbox to expose forgotten subscriptions, hidden price hikes and duplicate services — then cancels them for you.',
  openGraph: {
    title: 'SubShield — Stop the quiet drain',
    description: 'Find, understand, and cut recurring charges before they drain you.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#f1eee9',
  colorScheme: 'light',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${switzer.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: '!rounded-none !border-0 !bg-ink !text-white !shadow-none !font-sans',
              description: '!text-white/70',
            },
          }}
        />
      </body>
    </html>
  )
}
