import { NextResponse } from 'next/server'

// Jupiter's price API endpoint
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenAddress = searchParams.get('token')

  if (!tokenAddress) {
    return NextResponse.json(
      { error: 'Token address is required' },
      { status: 400 }
    )
  }

  try {
    // Use HTTPS fetch with proper configuration
    const url = `${JUPITER_PRICE_API}/price?ids=${tokenAddress}`
    
    const response = await fetch(url, {
      next: {
        revalidate: 30 // Cache for 30 seconds
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch price data: ${response.status}`)
    }

    const jupiterResponse = await response.json()

    // Check if we have data for this token
    if (!jupiterResponse.data || !jupiterResponse.data[tokenAddress]) {
      return new NextResponse(
        JSON.stringify({
          data: {
            [tokenAddress]: {
              price: 0,
              price_24h: 0,
              price_change_24h: 0,
              price_change_percentage_24h: 0
            }
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59'
          }
        }
      )
    }

    // Get price data from Jupiter's response
    const tokenPrice = jupiterResponse.data[tokenAddress]
    
    // Jupiter returns string values, convert them to numbers
    const currentPrice = Number(tokenPrice.price)
    const price24h = Number(tokenPrice.price_24h || tokenPrice.price)

    // Calculate price changes
    const priceChange = currentPrice - price24h
    const priceChangePercentage = price24h ? (priceChange / price24h) * 100 : 0

    const responseData = {
      data: {
        [tokenAddress]: {
          price: currentPrice,
          price_24h: price24h,
          price_change_24h: priceChange,
          price_change_percentage_24h: priceChangePercentage
        }
      }
    }

    return new NextResponse(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59'
        }
      }
    )

  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        data: {
          [tokenAddress]: {
            price: 0,
            price_24h: 0,
            price_change_24h: 0,
            price_change_percentage_24h: 0
          }
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    )
  }
}
