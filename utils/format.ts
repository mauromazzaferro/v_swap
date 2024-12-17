// Format price with appropriate decimals
export function formatPrice(price?: number) {
  if (!price) return '$0.00'
  if (price < 0.01) return '<$0.01'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

// Format large numbers with abbreviations
export function formatLargeNumber(num?: number) {
  if (!num) return '$0'
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
  return formatPrice(num)
}

// Format token amount based on decimals
export function formatTokenAmount(amount: string, decimals: number = 6) {
  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount)) return '0'
  
  // For very small numbers, show more decimals
  if (parsedAmount < 0.0001) {
    return parsedAmount.toExponential(4)
  }
  
  // For regular numbers, limit to appropriate decimals
  return parsedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 6)
  })
}

// Default token logo fallback
export const DEFAULT_TOKEN_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'

// Handle image error
export function handleTokenLogoError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const img = e.currentTarget
  img.src = DEFAULT_TOKEN_LOGO
} 