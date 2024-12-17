// components/WalletConnectionProvider.tsx
'use client'

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'

import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'
import { HELIUS_RPC_URL, CONNECTION_CONFIG } from '../config'

// Import wallet styles in a way that works with Next.js
import '@solana/wallet-adapter-react-ui/styles.css'

interface WalletConnectionProviderProps {
  children: React.ReactNode
}

export function WalletConnectionProvider({ children }: WalletConnectionProviderProps) {
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => HELIUS_RPC_URL || clusterApiUrl(network), [network])
  const wallets = useMemo(
    () => [
    ],
    [network]
  )

  return (
    <ConnectionProvider endpoint={endpoint} config={CONNECTION_CONFIG}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}