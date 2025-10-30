import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Droplet, Clock, Coins } from 'lucide-react';
import { claimFaucet, getFaucetAmount, getTimeUntilNextClaim } from '@/lib/fhe';

export function Faucet() {
  const { address, isConnected } = useAccount();
  const [faucetAmount, setFaucetAmount] = useState<string>('0');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Format time remaining
  const formatTime = (seconds: number) => {
    if (seconds === 0) return 'Ready to claim';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Load faucet info
  useEffect(() => {
    const loadFaucetInfo = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      try {
        const [amount, time] = await Promise.all([
          getFaucetAmount(),
          getTimeUntilNextClaim(address),
        ]);

        setFaucetAmount((Number(amount) / 1_000_000).toFixed(2));
        setTimeRemaining(time);
      } catch (error) {
        console.error('Error loading faucet info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFaucetInfo();
  }, [isConnected, address]);

  // Update countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (timeRemaining > 0) {
      toast.error('Faucet cooldown not elapsed');
      return;
    }

    setIsClaiming(true);
    try {
      await claimFaucet();
      toast.success(`Successfully claimed ${faucetAmount} cUSD!`);

      // Reload faucet info
      const time = await getTimeUntilNextClaim(address);
      setTimeRemaining(time);

      // Reload page to update balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Error claiming from faucet:', error);
      toast.error(error.message || 'Failed to claim tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5" />
            Token Faucet
          </CardTitle>
          <CardDescription>Get free cUSD tokens for testing</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Connect your wallet to use the faucet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="h-5 w-5" />
          Token Faucet
        </CardTitle>
        <CardDescription>Get free cUSD tokens for testing (24h cooldown)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Faucet Amount */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Faucet Amount</span>
          </div>
          <span className="text-2xl font-bold">{faucetAmount} cUSD</span>
        </div>

        {/* Cooldown Timer */}
        {timeRemaining > 0 && (
          <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Next claim in</span>
            </div>
            <span className="text-lg font-semibold text-orange-500">
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {/* Claim Button */}
        <Button
          onClick={handleClaim}
          disabled={isClaiming || isLoading || timeRemaining > 0}
          className="w-full"
          size="lg"
        >
          {isClaiming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Claiming...
            </>
          ) : timeRemaining > 0 ? (
            'Cooldown Active'
          ) : (
            <>
              <Droplet className="mr-2 h-4 w-4" />
              Claim {faucetAmount} cUSD
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Each user can claim once every 24 hours</p>
          <p>• New users are automatically added to the allowlist</p>
          <p>• Tokens are encrypted using FHE technology</p>
        </div>
      </CardContent>
    </Card>
  );
}
