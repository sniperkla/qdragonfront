import { Geist, Geist_Mono, Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import ReduxProvider from '../components/ReduxProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

// Thai font with full glyph coverage
const notoThai = Noto_Sans_Thai({
  variable: '--font-noto-thai',
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700']
})

export const metadata = {
  title: 'Q-Dragon Gold Trading Platform',
  description: 'XAU/USD Professional Trading Platform',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  },
  icons: {
    icon: [
      {
        url: '/favicon-icon.svg',
        type: 'image/svg+xml'
      },
      {
        url: '/favicon-16.svg',
        sizes: '16x16',
        type: 'image/svg+xml'
      }
    ]
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} antialiased h-full min-h-screen`}
      >
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  )
}
