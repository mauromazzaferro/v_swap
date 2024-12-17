import { NextResponse } from 'next/server'
import fetch from 'node-fetch'
import { JUPITER_QUOTE_API_URL } from '@/config'

const MAX_RETRIES = 3
const INITIAL_BACKOFF = 1000 // 1 second

async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) {
  try {
    const response = await fetch(url, options)
    
    // If rate limited, wait and retry
    if (response.status === 429) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff))
        return fetchWithRetry(url, options, retries - 1, backoff * 2)
      }
      throw new Error('Rate limit exceeded')
    }
    
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const amount = searchParams.get('amount')
    const inputMint = searchParams.get('inputMint')
    const outputMint = searchParams.get('outputMint')
    
    if (!amount || !inputMint || !outputMint) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameters' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate amount is a positive number
    const amountNum = Number(amount)
    if (isNaN(amountNum)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    try {
      const response = await fetch(
        `${JUPITER_QUOTE_API_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountNum}&slippageBps=50`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          next: {
            revalidate: 30 // Cache for 30 seconds
          }
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Jupiter API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      if (!data?.outAmount) {
        throw new Error('Invalid quote data received')
      }

      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch quote' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Quote fetch error:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to fetch quote',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
} 