const isDevelopment = process.env.NODE_ENV === 'development'

// Add Helius RPC URL with correct format and fallback
export const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

// Update to v6 endpoints
export const JUPITER_API_BASE_URL = 'https://token.jup.ag/v6'
export const JUPITER_QUOTE_API_URL = 'https://quote-api.jup.ag/v6'

// Add connection config with Helius-specific settings
export const CONNECTION_CONFIG = {
  commitment: 'confirmed' as const,
  confirmTransactionInitialTimeout: 60000, // 60 seconds
  wsEndpoint: process.env.NEXT_PUBLIC_HELIUS_RPC_URL?.replace('https://', 'wss://') || undefined,
}

// Add fallback URLs
export const BACKUP_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'

// Validate environment variables
if (!process.env.NEXT_PUBLIC_HELIUS_RPC_URL) {
  console.warn('NEXT_PUBLIC_HELIUS_RPC_URL is not set, please add your Helius API key to .env.local')
} 