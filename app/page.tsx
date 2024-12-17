import SwapCard from '@/components/SwapCard'
import ErrorBoundary from 'next/dist/client/components/error-boundary'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#222831] p-4">
      <div className="w-full max-w-md">
        <SwapCard />
      </div>
    </main>
  )
}