import Link from "next/link";
import { Card, Button } from "pixel-retroui";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a1a] font-minecraft p-6">
      <main className="flex w-full max-w-4xl flex-col gap-8">
        {/* Hero Section */}
        <Card bg="#2d2d2d" className="p-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-amber-400 mb-4">
              📊 PAPERTRADER
            </h1>
            <p className="text-xl text-gray-300">
              Options Paper Trading Platform
            </p>
          </div>
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card bg="#3a3a3a" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">Live Data</h3>
              <p className="text-sm text-gray-300">Real-time options chains and market data</p>
            </div>
          </Card>

          <Card bg="#3a3a3a" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">Greeks Analysis</h3>
              <p className="text-sm text-gray-300">Advanced options analytics and insights</p>
            </div>
          </Card>

          <Card bg="#3a3a3a" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">Risk Free</h3>
              <p className="text-sm text-gray-300">Practice strategies without real money</p>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <Card bg="#2d2d2d" className="p-8">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold text-amber-400 text-center">
              Get Started
            </h2>
            <p className="max-w-2xl text-center text-lg text-gray-300">
              View live options chains, analyze Greeks, and practice trading strategies without risking real money.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <Link href="/options">
                <Button
                  bg="#fbbf24"
                  textColor="#1a1a1a"
                  shadow="#d97706"
                  className="px-8 py-3 text-lg font-bold w-full sm:w-auto"
                >
                  View Options Chain
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button
                  bg="#4a5568"
                  textColor="#f0f0f0"
                  shadow="#2d3748"
                  className="px-8 py-3 text-lg font-bold w-full sm:w-auto"
                >
                  Portfolio
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
