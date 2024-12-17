// components/SwapButton.tsx
'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { 
  Transaction, 
  VersionedTransaction, 
  TransactionMessage,
  Connection,
} from '@solana/web3.js'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Token } from '@/types/token'
import { API_BASE_URL, HELIUS_RPC_URL, CONNECTION_CONFIG } from '@/config'

interface SwapButtonProps {
  connected: boolean
  inputAmount: string
  outputAmount: string
  inputToken: Token
  outputToken: Token
  slippage: number
}

export function SwapButton({ 
  connected,
  inputAmount, 
  inputToken,
  outputToken,
  slippage,
}: SwapButtonProps) {
  const { publicKey, signTransaction } = useWallet()
  const [loading, setLoading] = useState(false)

  // Create a new connection with Helius RPC
  const heliusConnection = new Connection(HELIUS_RPC_URL, CONNECTION_CONFIG)

  const handleSwap = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet')
      return
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      // Calculate amount in input token decimals
      const amount = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputToken.decimals))
      
      // Convert slippage percentage to basis points (1% = 100 basis points)
      const slippageBps = Math.floor(slippage * 100)

      // Get quote from Jupiter API with dynamic slippage
      const quoteResponse = await fetch(
        `${API_BASE_URL}/api/quote?inputMint=${inputToken.address}&outputMint=${outputToken.address}&amount=${amount}&slippageBps=${slippageBps}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      
      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to get quote: ${quoteResponse.status}`)
      }
      
      const quoteData = await quoteResponse.json()

      // Get swap transaction
      const swapResponse = await fetch(`${API_BASE_URL}/api/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      })

      if (!swapResponse.ok) {
        const errorData = await swapResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to get swap transaction: ${swapResponse.status}`)
      }

      const swapData = await swapResponse.json()
      
      if (!swapData?.swapTransaction) {
        throw new Error('Invalid swap transaction data received')
      }

      // Deserialize the versioned transaction
      const serializedTransaction = Buffer.from(swapData.swapTransaction, 'base64')
      const transaction = VersionedTransaction.deserialize(serializedTransaction)

      try {
        // Request signature from user
        const signedTransaction = await signTransaction(transaction)
        
        // Send the signed transaction using Helius RPC
        const rawTransaction = signedTransaction.serialize()
        
        // Add preflight checks
        const latestBlockhash = await heliusConnection.getLatestBlockhash('confirmed')
        
        const txid = await heliusConnection.sendRawTransaction(rawTransaction, {
          skipPreflight: false, // Enable preflight checks
          maxRetries: 3,
          preflightCommitment: 'confirmed'
        })

        toast.success('Transaction sent! Waiting for confirmation...')
        
        // Wait for confirmation using Helius RPC with timeout
        const confirmation = await heliusConnection.confirmTransaction({
          signature: txid,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`)
        }
        
        // Add transaction URL to success message
        const explorerUrl = `https://solscan.io/tx/${txid}`
        toast.success(
          <div>
            Swap successful!{' '}
            <a 
              href={explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#00ADB5] hover:underline"
            >
              View on Solscan
            </a>
          </div>
        )
      } catch (error) {
        // Check if the error is a user rejection
        const err = error as { message?: string; name?: string }
        if (err?.message?.includes('User rejected') || 
            err?.name === 'WalletSignTransactionError') {
          toast.error('Transaction was cancelled')
          return
        }

        // Handle RPC connection errors
        if (err?.message?.includes('Failed to fetch') || 
            err?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          toast.error('RPC connection failed. Please try again.')
          return
        }

        // Handle timeout errors
        if (err?.message?.includes('Transaction was not confirmed') || 
            err?.message?.includes('timeout')) {
          toast.error('Transaction timed out. It may still confirm.')
          return
        }

        toast.error(`Transaction failed: ${err?.message || 'Unknown error'}`)
        throw error
      }

    } catch (error) {
      const err = error as { message?: string; name?: string }
      if (!err?.message?.includes('User rejected') && 
          err?.name !== 'WalletSignTransactionError') {
        toast.error(err instanceof Error ? err.message : 'Failed to complete swap')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <button
        onClick={() => toast.error('Please connect your wallet')}
        className="w-full bg-[#00ADB5] text-[#EEEEEE] py-4 rounded-lg text-lg font-bold 
          opacity-50 hover:opacity-75 transition-all cursor-not-allowed
          relative group overflow-hidden"
      >
        <span className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
        <div className="flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Connect Wallet
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleSwap}
      disabled={loading || !inputAmount || parseFloat(inputAmount) <= 0}
      className={`w-full bg-[#00ADB5] text-[#EEEEEE] py-4 rounded-lg text-lg font-bold 
        relative group overflow-hidden
        ${(loading || !inputAmount || parseFloat(inputAmount) <= 0) 
          ? 'opacity-50' 
          : 'hover:bg-opacity-90 hover:shadow-lg'} 
        transition-all duration-200`}
    >
      <span className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Swap
          </>
        )}
      </div>
    </button>
  )
}