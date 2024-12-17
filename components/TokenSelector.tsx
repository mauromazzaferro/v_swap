'use client'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config'
import { toast } from 'react-hot-toast'
import { Token } from '@/types/token'
import { formatPrice, formatLargeNumber, handleTokenLogoError, DEFAULT_TOKEN_LOGO } from '@/utils/format'

interface TokenSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  currentToken?: string
  search: string
  onSearchChange: (value: string) => void
}

export default function TokenSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentToken,
  search,
  onSearchChange,
}: TokenSelectorProps) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedToken, setSearchedToken] = useState<Token | null>(null)

  // Fetch token list
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`${API_BASE_URL}/api/tokens`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }))
          throw new Error(typeof errorData === 'object' && 'error' in errorData ? errorData.error : `Failed to fetch tokens: ${response.status}`)
        }
        const data = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('Invalid token data received')
        }
        const sortedTokens = data.sort((a, b) => a.symbol.localeCompare(b.symbol))
        setTokens(sortedTokens)
      } catch (error) {
        console.error('Error fetching tokens:', error)
        setError(error instanceof Error ? error.message : 'Failed to load tokens')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchTokens()
    }
  }, [isOpen])

  // Fetch token info when a valid address is pasted
  useEffect(() => {
    const fetchTokenInfo = async () => {
      // Check if search looks like a token address (base58 string of appropriate length)
      if (search.length >= 32 && search.length <= 44) {
        try {
          setLoading(true)
          setError(null)

          // Add retry logic
          let retries = 2
          let tokenInfo = null
          let lastError = null

          while (retries >= 0 && !tokenInfo) {
            try {
              const response = await fetch(`${API_BASE_URL}/api/token-info?address=${search}`)
              if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Token not found')
              }
              tokenInfo = await response.json()
              break
            } catch (err) {
              lastError = err
              retries--
              if (retries >= 0) {
                await new Promise(resolve => setTimeout(resolve, (2 - retries) * 1000))
              }
            }
          }

          if (tokenInfo) {
            setSearchedToken(tokenInfo)
          } else {
            throw lastError || new Error('Failed to fetch token info')
          }
        } catch (error) {
          console.error('Error fetching token info:', error)
          setSearchedToken(null)
          if (error instanceof Error && error.message === 'Token not found') {
            toast.error('Token not found')
          } else {
            toast.error('Unable to fetch token info. Please try again.')
          }
        } finally {
          setLoading(false)
        }
      } else {
        setSearchedToken(null)
      }
    }

    const timeoutId = setTimeout(fetchTokenInfo, 500)
    return () => clearTimeout(timeoutId)
  }, [search, API_BASE_URL])

  const filteredTokens = tokens.filter(token => {
    const searchLower = search.toLowerCase()
    return token.symbol.toLowerCase().includes(searchLower) ||
           token.name.toLowerCase().includes(searchLower) ||
           token.address.toLowerCase() === searchLower
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#393E46] rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#EEEEEE]">Select Token</h3>
          <button
            onClick={onClose}
            className="text-[#EEEEEE] hover:text-[#00ADB5] p-2"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name or paste address"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#2C3238] text-[#EEEEEE] p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#00ADB5]"
            autoFocus
          />
        </div>

        {/* Searched Token Result */}
        {searchedToken && (
          <div className="mb-4 p-4 bg-[#2C3238] rounded-lg">
            <button
              onClick={() => onSelect(searchedToken)}
              className="w-full"
            >
              <div className="flex items-center gap-3">
                {searchedToken.logoURI ? (
                  <img
                    src={searchedToken.logoURI}
                    alt={searchedToken.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={handleTokenLogoError}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#393E46] flex items-center justify-center text-[#EEEEEE]">
                    {searchedToken.symbol[0]}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[#EEEEEE] font-medium">{searchedToken.symbol}</span>
                    <span className="text-[#EEEEEE]">{formatPrice(searchedToken.price)}</span>
                  </div>
                  <div className="text-sm text-gray-400">{searchedToken.name}</div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <div>
                      <div>Vol: {formatLargeNumber(searchedToken.volume24h)}</div>
                      <div>MCap: {formatLargeNumber(searchedToken.marketCap)}</div>
                    </div>
                    <div className="truncate max-w-[150px]">{searchedToken.address}</div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Token List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="text-center py-4 text-[#EEEEEE]">Loading tokens...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : filteredTokens.length === 0 && !searchedToken ? (
            <div className="text-center py-4 text-[#EEEEEE]">
              {search ? 'No tokens found' : 'Start typing to search tokens'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => onSelect(token)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#2C3238] transition-colors
                    ${token.address === currentToken ? 'bg-[#2C3238]' : ''}`}
                >
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-8 h-8 rounded-full"
                      onError={handleTokenLogoError}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#2C3238] flex items-center justify-center text-[#EEEEEE]">
                      {token.symbol[0]}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="text-[#EEEEEE] font-medium">{token.symbol}</div>
                    <div className="text-sm text-gray-400 truncate">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 