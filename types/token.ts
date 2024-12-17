export interface Token {
  address: string
  chainId?: number
  decimals: number
  name: string
  symbol: string
  logoURI?: string
  verified?: boolean
  tags?: string[]
  price?: number
  volume24h?: number
  marketCap?: number
  extensions?: {
    [key: string]: any
  }
}

export interface TokenCache {
  data: Token
  timestamp: number
}

export interface PriceData {
  value: number
  volume24h: number
  marketCap: number
} 