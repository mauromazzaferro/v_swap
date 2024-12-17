/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
      }
    }
    
    return config
  },
  transpilePackages: [
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-wallets',
  ],
  images: {
    domains: ['jup.ag'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  reactStrictMode: true,
  compress: true,
  experimental: {
    turbo: {
      rules: {
        // Add your Turbopack rules here if needed
      }
    }
  },
}

module.exports = nextConfig 