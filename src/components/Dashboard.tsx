import { useState, useEffect } from "react";
import { Send, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "wagmi";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useToast } from "@/hooks/use-toast";
import { Faucet } from "@/components/Faucet";
import {
  initFHE,
  getEncryptedBalance,
  decryptBalance,
  transferEncrypted,
  checkAllowlist,
} from "@/lib/fhe";

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [encryptedBalance, setEncryptedBalance] = useState<string>("");
  const [decryptedBalance, setDecryptedBalance] = useState<string>("");
  const [isAllowed, setIsAllowed] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && address) {
      loadBalance();
      checkUserAllowlist();
    }
  }, [isConnected, address]);

  const loadBalance = async () => {
    if (!address) return;

    try {
      setRefreshing(true);
      await initFHE();

      const balance = await getEncryptedBalance(address);
      const balanceHex = `0x${balance.toString(16)}`;
      setEncryptedBalance(balanceHex);

      const decrypted = await decryptBalance(address, balance);
      const formatted = (Number(decrypted) / 1_000_000).toFixed(2);
      setDecryptedBalance(formatted);

      toast({
        title: "Balance loaded",
        description: "Your encrypted balance has been fetched",
      });
    } catch (error: any) {
      console.error("Error loading balance:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load balance",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const checkUserAllowlist = async () => {
    if (!address) return;

    try {
      const allowed = await checkAllowlist(address);
      setIsAllowed(allowed);
    } catch (error) {
      console.error("Error checking allowlist:", error);
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !amount || !address) return;

    try {
      setLoading(true);

      const recipientAllowed = await checkAllowlist(recipient);
      if (!recipientAllowed) {
        toast({
          title: "Error",
          description: "Recipient is not on the allowlist",
          variant: "destructive",
        });
        return;
      }

      const amountInMicroUnits = Math.floor(parseFloat(amount) * 1_000_000);

      await transferEncrypted(recipient, amountInMicroUnits);

      toast({
        title: "Transfer successful",
        description: `Sent ${amount} cUSD to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
      });

      setRecipient("");
      setAmount("");

      await loadBalance();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer tokens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-12 rounded-3xl text-center max-w-md space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Eye className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Connect Your Wallet
          </h2>
          <p className="text-muted-foreground">
            Connect your wallet to access your encrypted balance and start making private transfers.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <ConnectButton />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Balance Card */}
          <div className="glass-card p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Your Balance</h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadBalance}
                  disabled={refreshing}
                  className="hover:bg-primary/10"
                >
                  <RefreshCw className={`w-5 h-5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="hover:bg-primary/10"
                >
                  {showBalance ? (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="py-8">
              {showBalance ? (
                <div className="space-y-2">
                  <div className="text-5xl font-bold text-foreground">
                    ${decryptedBalance}
                  </div>
                  <div className="text-sm text-muted-foreground">CUSD</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-mono text-muted-foreground break-all">
                    {encryptedBalance}
                  </div>
                  <div className="text-sm text-muted-foreground">Encrypted Balance</div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-sm font-mono text-foreground bg-secondary px-3 py-2 rounded-lg flex-1 truncate">
                    {address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="hover:bg-primary/10"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Allowlist Status</Label>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${isAllowed ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm font-medium text-foreground">
                    {isAllowed ? "Approved" : "Not Approved"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Card */}
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-xl font-semibold text-foreground mb-6">Send CUSD</h2>
            
            <form onSubmit={handleTransfer} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-foreground">
                  Recipient Address
                </Label>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="bg-secondary/50 border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Address must be on the allowlist
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-foreground">
                  Amount (CUSD)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-secondary/50 border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Transfer amount will be encrypted
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl"
                disabled={!recipient || !amount || loading || !isAllowed}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Private Transfer
                  </>
                )}
              </Button>

              <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>FHE encryption protects transfer amounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Allowlist validation on-chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span>Auto-fail on insufficient balance</span>
                </div>
              </div>
            </form>
          </div>

          {/* Faucet Card */}
          <div className="lg:col-span-3">
            <Faucet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
