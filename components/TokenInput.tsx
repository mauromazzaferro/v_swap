// components/TokenInput.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Token } from '@/types/token'

const DEFAULT_TOKEN_ICON = 'https://jup.ag/images/tokens/unknown.png'

const getTokenImage = (token: Token) => {
  return token.logoURI || DEFAULT_TOKEN_ICON
}

interface TokenInputProps {
  value: string
  onChange: (value: string) => void
  onTokenSelect: (token: Token) => void
  selectedToken: Token
  label: string
  usdValue?: string
  priceChange?: React.ReactNode
  conversionRate?: string
  showConversionRate?: boolean
}

export default function TokenInput({
  value,
  onChange,
  onTokenSelect,
  selectedToken,
  label,
  usdValue,
  priceChange,
  conversionRate,
  showConversionRate = false,
}: TokenInputProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/token-info?search=${encodeURIComponent(searchQuery)}`)
        if (!response.ok) throw new Error('Failed to fetch tokens')
        const data = await response.json()
        setSearchResults(data.tokens || [])
      } catch (error) {
        console.error('Error searching tokens:', error)
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounceTimeout = setTimeout(searchTokens, 300)
    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token)
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative bg-[#222831] rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <label className="text-sm text-gray-400">{label}</label>
        <div className="text-right">
          {showConversionRate && conversionRate && (
            <div className="text-xs text-gray-500">{conversionRate}</div>
          )}
          {priceChange && (
            <div className="text-xs">{priceChange}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = e.target.value
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              const num = parseFloat(val)
              if (isNaN(num) || num >= 0) {
                onChange(val)
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === '+') {
              e.preventDefault()
            }
          }}
          min="0"
          step="any"
          placeholder="0.00"
          className="w-full bg-transparent text-2xl text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 bg-[#393E46] hover:bg-[#454b56] rounded-lg px-3 py-2 transition-colors"
        >
          {selectedToken.logoURI && (
            <div className="relative w-6 h-6">
              <Image
                src={getTokenImage(selectedToken)}
                alt={selectedToken.symbol}
                width={24}
                height={24}
                className="rounded-full"
                onError={(e) => {
                  // Fallback to original logoURI if Jupiter CDN fails
                  const img = e.target as HTMLImageElement
                  if (!img.src.includes(selectedToken.logoURI || '')) {
                    img.src = selectedToken.logoURI || DEFAULT_TOKEN_ICON
                  } else if (img.src !== DEFAULT_TOKEN_ICON) {
                    img.src = DEFAULT_TOKEN_ICON
                  }
                }}
              />
            </div>
          )}
          <span className="text-white">{selectedToken.symbol}</span>
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Token Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black bg-opacity-50">
          <div className="bg-[#393E46] rounded-xl w-full max-w-md" ref={modalRef}>
            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by token or paste address"
                  className="w-full bg-[#222831] text-white rounded-lg pl-10 pr-4 py-3 outline-none"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>

              </div>

              {/* Search Results */}
              <div className="max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="text-center text-gray-400 py-4">Loading...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token)}
                      className="w-full flex items-center gap-3 hover:bg-[#454b56] p-3 rounded-lg transition-colors"
                    >
                      <div className="relative w-8 h-8">
                        <Image
                          src={getTokenImage(token)}
                          alt={token.symbol}
                          width={32}
                          height={32}
                          className="rounded-full"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            if (!img.src.includes(token.logoURI || '')) {
                              img.src = token.logoURI || DEFAULT_TOKEN_ICON
                            } else if (img.src !== DEFAULT_TOKEN_ICON) {
                              img.src = DEFAULT_TOKEN_ICON
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{token.symbol}</span>
                          {token.verified && (
                            <svg
                              className="w-4 h-4 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">{token.name}</div>
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[100px]">
                        {token.address.slice(0, 4)}...{token.address.slice(-4)}
                      </div>
                    </button>
                  ))
                ) : searchQuery ? (
                  <div className="text-center text-gray-400 py-4">No tokens found</div>
                ) : (
                  <div className="text-center text-gray-400 py-4">Start typing to search</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}