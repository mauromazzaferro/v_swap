import { NextResponse } from 'next/server'
import { JUPITER_QUOTE_API_URL } from '@/config'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { quoteResponse, userPublicKey } = body

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get swap transaction from Jupiter
    const response = await fetch(`${JUPITER_QUOTE_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Jupiter API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    if (!data?.swapTransaction) {
      throw new Error('Invalid swap transaction data received from Jupiter')
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create swap transaction',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
} 