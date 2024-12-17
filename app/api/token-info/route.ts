import { NextResponse } from 'next/server'

// Jupiter's new token API endpoint
const JUPITER_TOKENS_API = 'https://tokens.jup.ag'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')?.toLowerCase()

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // If it's a mint address, fetch specific token
    if (searchQuery.length === 44 || searchQuery.length === 43) {
      try {
        const response = await fetch(`${JUPITER_TOKENS_API}/token/${searchQuery}`, {
          headers: {
            'Referer': 'https://v_swap.app',
            'Origin': 'https://v_swap.app'
          }
        })
        
        if (response.ok) {
          const token = await response.json()
          return NextResponse.json({ tokens: [token] })
        }
      } catch (e) {
        console.error('Error fetching specific token:', e)
      }
    }

    // Fetch verified tokens
    const response = await fetch(`${JUPITER_TOKENS_API}/tokens?tags=verified`, {
      headers: {
        'Referer': 'https://v_swap.app',
        'Origin': 'https://v_swap.app'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch token list')
    }

    const tokens = await response.json()

    // Filter tokens based on search query
    const filteredTokens = tokens.filter((token: any) => {
      const symbol = token.symbol.toLowerCase()
      const name = token.name.toLowerCase()
      const address = token.address.toLowerCase()

      return (
        symbol.includes(searchQuery) ||
        name.includes(searchQuery) ||
        address === searchQuery
      )
    })

    // Sort tokens by daily volume
    const sortedTokens = filteredTokens.sort((a: any, b: any) => {
      return (b.daily_volume || 0) - (a.daily_volume || 0)
    })

    // Limit results
    const limitedTokens = sortedTokens.slice(0, 10)

    return NextResponse.json({
      tokens: limitedTokens.map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        verified: true, // All tokens from verified tag are verified
        daily_volume: token.daily_volume,
        tags: token.tags
      }))
    })

  } catch (error) {
    console.error('Token info error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch token info' },
      { status: 500 }
    )
  }
} 