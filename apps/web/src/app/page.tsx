// To rollback to RetroUI: Change imports from '@/components/ui/*' to '@/components/retroui/*'
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <main className="flex w-full max-w-4xl flex-col gap-8">
        {/* Hero Section */}
        <Card className="p-8 bg-card">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-primary mb-4">
              📊 PAPERTRADER
            </h1>
            <p className="text-xl text-card-foreground">
              Options Paper Trading Platform
            </p>
          </div>
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card">
            <div className="text-center">
              <div className="text-4xl mb-3">📈</div>
              <h3 className="text-lg font-bold text-primary mb-2">Live Data</h3>
              <p className="text-sm text-card-foreground">Real-time options chains and market data</p>
            </div>
          </Card>

          <Card className="p-6 bg-card">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-primary mb-2">Greeks Analysis</h3>
              <p className="text-sm text-card-foreground">Advanced options analytics and insights</p>
            </div>
          </Card>

          <Card className="p-6 bg-card">
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-bold text-primary mb-2">Risk Free</h3>
              <p className="text-sm text-card-foreground">Practice strategies without real money</p>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="p-8 bg-card">
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold text-primary text-center">
              Get Started
            </h2>
            <p className="max-w-2xl text-center text-lg text-card-foreground">
              View live options chains, analyze Greeks, and practice trading strategies without risking real money.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
              <Link href="/options">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  View Options Chain
                </Button>
              </Link>
              <Link href="/portfolio">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
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
