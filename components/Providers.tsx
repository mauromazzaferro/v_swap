// components/Providers.tsx
'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from 'react-hot-toast'

// Dynamically import WalletConnectionProvider with ssr disabled
const WalletConnectionProvider = dynamic(
  () => import('./WalletConnectionProvider').then(mod => mod.WalletConnectionProvider),
  { ssr: false }
)

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <>
      <WalletConnectionProvider>
        {children}
      </WalletConnectionProvider>
      <Toaster position="bottom-right" />
    </>
  )
}