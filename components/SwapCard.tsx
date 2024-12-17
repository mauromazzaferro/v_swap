// components/SwapCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import TokenInput from '@/components/TokenInput'
import { SwapButton } from '@/components/SwapButton'
import { toast } from 'react-hot-toast'
import { API_BASE_URL } from '@/config'
import { formatPrice } from '@/utils/format'

interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export default function SwapCard() {
  const { connected, publicKey, disconnect } = useWallet()
  const { connection } = useConnection()
  const [inputAmount, setInputAmount] = useState('')
  const [outputAmount, setOutputAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5) // 0.5% default slippage
  const [showSlippageSettings, setShowSlippageSettings] = useState(false)
  const [customSlippage, setCustomSlippage] = useState('')
  const [tokenPrices, setTokenPrices] = useState<{[key: string]: {
    price: number
    price_change_24h: number
    price_change_percentage_24h: number
  }}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [inputToken, setInputToken] = useState<Token>({
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  })
  const [outputToken, setOutputToken] = useState<Token>({
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  })

  // Fetch token prices
  useEffect(() => {
    const controller = new AbortController()
    
    const fetchTokenPrices = async () => {
      try {
        setIsLoading(true)
        // Fetch prices for both input and output tokens
        const tokens = [inputToken.address, outputToken.address]
        const prices: {[key: string]: any} = {}

        for (const tokenAddress of tokens) {
          const response = await fetch(`/api/price?token=${tokenAddress}`, {
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          
          if (data?.data?.[tokenAddress]) {
            const tokenData = data.data[tokenAddress]
            prices[tokenAddress] = {
              price: parseFloat(tokenData.price) || 0,
              price_24h: parseFloat(tokenData.price_24h) || 0,
              price_change_24h: parseFloat(tokenData.price_change_24h) || 0,
              price_change_percentage_24h: parseFloat(tokenData.price_change_percentage_24h) || 0
            }
          }
        }

        setTokenPrices(prices)
      } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') {
          return
        }
        toast.error(
          error instanceof Error 
            ? error.message === 'Failed to fetch' 
              ? 'Network error - please check your connection' 
              : error.message
            : 'Failed to fetch token prices'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenPrices()
    const interval = setInterval(fetchTokenPrices, 10000)

    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [inputToken.address, outputToken.address])

  // Handle slippage change
  const handleSlippageChange = (value: number | string) => {
    if (typeof value === 'number') {
      setSlippage(value)
      setCustomSlippage('')
    } else {
      const parsed = parseFloat(value)
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        setSlippage(parsed)
      }
      setCustomSlippage(value)
    }
  }

  // Add back quote fetching with slippage
  useEffect(() => {
    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout

    const fetchQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !inputToken || !outputToken) {
        setOutputAmount('')
        return
      }

      // Immediate price estimation using local price data
      const inputPrice = tokenPrices[inputToken.address]?.price || 0
      const outputPrice = tokenPrices[outputToken.address]?.price || 0
      if (inputPrice && outputPrice) {
        const estimatedOutput = (parseFloat(inputAmount) * inputPrice) / outputPrice
        setOutputAmount(estimatedOutput.toFixed(outputToken.decimals))
      }

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          const amount = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputToken.decimals))
          const slippageBps = Math.floor(slippage * 100) // Convert percentage to basis points
          const response = await fetch(
            `${API_BASE_URL}/api/quote?inputMint=${inputToken.address}&outputMint=${outputToken.address}&amount=${amount}&slippageBps=${slippageBps}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: controller.signal
            }
          )
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          if (data?.outAmount) {
            setOutputAmount((parseFloat(data.outAmount) / Math.pow(10, outputToken.decimals)).toString())
          } else {
            throw new Error('Invalid quote data')
          }
        } catch (error: unknown) {
          if ((error as Error).name === 'AbortError') {
            return
          }
          toast.error(
            error instanceof Error 
              ? error.message === 'Failed to fetch' 
                ? 'Network error - please check your connection' 
                : error.message
              : 'Failed to fetch quote'
          )
          setOutputAmount('')
        }
      }, 200)
    }

    fetchQuote()

    return () => {
      controller.abort()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [inputAmount, inputToken, outputToken, tokenPrices, slippage])

  // Calculate USD value based on token type and current prices
  const getUSDValue = (amount: string, token: Token | null) => {
    if (!amount || !token) {
      return 
    }
    
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount)) {
      return 
    }

    const priceData = tokenPrices[token.address]
    if (!priceData?.price) {
      // If we have an amount but no price data yet, return undefined to show loading
      return parsedAmount > 0 ? undefined : '$0.00'
    }

    const value = parsedAmount * priceData.price
    
    // Format based on value size
    if (value === 0) {
      return '$0.00'
    }
    
    if (value < 0.01 && value > 0) {
      return '< $0.01'
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 4 : 2
    }).format(value)
  }

  // Format price change
  const formatPriceChange = (token: Token) => {
    const priceData = tokenPrices[token.address]
    if (!priceData?.price_change_percentage_24h) {
      return null
    }

    const changePercent = Number(priceData.price_change_percentage_24h)
    if (isNaN(changePercent)) {
      return null
    }

    const isPositive = changePercent > 0
    const color = isPositive ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-gray-500'
    const sign = isPositive ? '+' : ''

    return (
      <span className={color}>
        {sign}{Math.abs(changePercent).toFixed(2)}%
      </span>
    )
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      await disconnect()
      toast.success('Wallet disconnected')
    } catch (error) {
      toast.error('Failed to disconnect wallet')
    }
  }

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Handle token selection to prevent same token selection
  const handleInputTokenSelect = (token: Token) => {
    setInputToken(token)
    // If output token would be the same, set it to SOL
    if (token.address === outputToken.address) {
      setOutputToken({
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      })
    }
  }

  const handleOutputTokenSelect = (token: Token) => {
    setOutputToken(token)
    // If input token would be the same, set it to SOL
    if (token.address === inputToken.address) {
      setInputToken({
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 4,
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
      })
    }
  }

  // Add token swap functionality
  const handleSwapTokens = () => {
    const tempToken = inputToken
    setInputToken(outputToken)
    setOutputToken(tempToken)
    setInputAmount(outputAmount)
    setOutputAmount(inputAmount)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#222831]">
      <div className="bg-[#393E46] rounded-xl p-8 shadow-2xl w-full max-w-2xl">
        <div className="space-y-6">
          {/* Header with Settings */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-[#EEEEEE]">Swap</h2>
              <button
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                className="text-[#00ADB5] hover:text-[#00959D] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            {connected && publicKey ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#EEEEEE]">
                  {formatWalletAddress(publicKey.toString())}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-[#00ADB5] hover:text-red-500 transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <WalletMultiButton className="bg-[#00ADB5] hover:bg-[#00959D] text-white" />
            )}
          </div>

          {/* Slippage Settings */}
          {showSlippageSettings && (
            <div className="bg-[#2C3138] rounded-lg p-4 mb-4">
              <h3 className="text-[#EEEEEE] text-sm font-medium mb-3">Slippage</h3>
              <div className="flex gap-2 mb-2">
                {[0.5, 1.5, 3].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleSlippageChange(value)}
                    className={`px-3 py-1 rounded ${
                      slippage === value
                        ? 'bg-[#00ADB5] text-white'
                        : 'bg-[#393E46] text-[#EEEEEE] hover:bg-[#00959D]'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={customSlippage}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    placeholder=""
                    className="w-20 px-2 py-1 bg-[#393E46] text-[#EEEEEE] rounded focus:outline-none focus:ring-1 focus:ring-[#00ADB5]"
                  />
                  <span className="absolute right-2 text-[#EEEEEE]">%</span>
                </div>
              </div>
              {parseFloat(customSlippage) > 5 && (
                <p className="text-yellow-500 text-xs mt-1">
                  High slippage tolerance. Your transaction may fail.
                </p>
              )}
            </div>
          )}

          {/* Input Token */}
          <TokenInput
            value={inputAmount}
            onChange={setInputAmount}
            label="You pay"
            selectedToken={inputToken}
            onTokenSelect={handleInputTokenSelect}
            usdValue={getUSDValue(inputAmount, inputToken)}
            priceChange={formatPriceChange(inputToken)}
            conversionRate={inputAmount && outputAmount ? 
              `1 ${inputToken.symbol} ≈ ${(parseFloat(outputAmount) / parseFloat(inputAmount)).toFixed(6)} ${outputToken.symbol}` : 
              undefined}
            showConversionRate={true}
          />

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="bg-[#00ADB5] hover:bg-[#00959D] p-2 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </div>

          {/* Output Token */}
          <TokenInput
            value={outputAmount}
            onChange={setOutputAmount}
            label="You receive"
            selectedToken={outputToken}
            onTokenSelect={handleOutputTokenSelect}
            usdValue={getUSDValue(outputAmount, outputToken)}
            priceChange={formatPriceChange(outputToken)}
            conversionRate={inputAmount && outputAmount ? 
              `1 ${outputToken.symbol} ≈ ${(parseFloat(inputAmount) / parseFloat(outputAmount)).toFixed(6)} ${inputToken.symbol}` : 
              undefined}
            showConversionRate={true}
          />

          {/* Swap Button */}
          <SwapButton
            connected={connected}
            inputAmount={inputAmount}
            outputAmount={outputAmount}
            inputToken={inputToken}
            outputToken={outputToken}
            slippage={slippage}
          />
        </div>
      </div>
    </div>
  )
}