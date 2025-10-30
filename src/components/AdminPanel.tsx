import { useState, useEffect } from "react";
import { Shield, UserPlus, UserMinus, Coins, Flame, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import {
  getContractOwner,
  setAllowed,
  batchSetAllowed,
  mintTokens,
  burnTokens,
  getTotalSupply,
  decryptTotalSupply,
  initFHE,
} from "@/lib/fhe";

const AdminPanel = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState<string>("");

  // Single user allowlist
  const [singleAddress, setSingleAddress] = useState("");
  const [allowlistAction, setAllowlistAction] = useState<"add" | "remove">("add");

  // Batch allowlist
  const [batchAddresses, setBatchAddresses] = useState("");

  // Mint
  const [mintAddress, setMintAddress] = useState("");
  const [mintAmount, setMintAmount] = useState("");

  // Burn
  const [burnAddress, setBurnAddress] = useState("");
  const [burnAmount, setBurnAmount] = useState("");

  useEffect(() => {
    if (isConnected && address) {
      checkOwnership();
      loadTotalSupply();
    }
  }, [isConnected, address]);

  const checkOwnership = async () => {
    try {
      const owner = await getContractOwner();
      setIsOwner(owner.toLowerCase() === address?.toLowerCase());
    } catch (error) {
      console.error("Error checking ownership:", error);
    }
  };

  const loadTotalSupply = async () => {
    try {
      await initFHE();
      const encrypted = await getTotalSupply();
      const decrypted = await decryptTotalSupply(encrypted);
      const formatted = (Number(decrypted) / 1_000_000).toFixed(2);
      setTotalSupply(formatted);
    } catch (error) {
      console.error("Error loading total supply:", error);
    }
  };

  const handleSingleAllowlist = async () => {
    if (!singleAddress) return;

    try {
      setLoading(true);
      await setAllowed(singleAddress, allowlistAction === "add");

      toast({
        title: "Success",
        description: `User ${allowlistAction === "add" ? "added to" : "removed from"} allowlist`,
      });

      setSingleAddress("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update allowlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAllowlist = async () => {
    const addresses = batchAddresses.split("\n").filter(addr => addr.trim());
    if (addresses.length === 0) return;

    try {
      setLoading(true);
      await batchSetAllowed(addresses, true);

      toast({
        title: "Success",
        description: `${addresses.length} users added to allowlist`,
      });

      setBatchAddresses("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to batch update allowlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!mintAddress || !mintAmount) return;

    try {
      setLoading(true);
      const amountInMicroUnits = Math.floor(parseFloat(mintAmount) * 1_000_000);
      await mintTokens(mintAddress, amountInMicroUnits);

      toast({
        title: "Tokens minted",
        description: `Minted ${mintAmount} cUSD to ${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}`,
      });

      setMintAddress("");
      setMintAmount("");
      await loadTotalSupply();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mint tokens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!burnAddress || !burnAmount) return;

    try {
      setLoading(true);
      const amountInMicroUnits = Math.floor(parseFloat(burnAmount) * 1_000_000);
      await burnTokens(burnAddress, amountInMicroUnits);

      toast({
        title: "Tokens burned",
        description: `Burned ${burnAmount} cUSD from ${burnAddress.slice(0, 6)}...${burnAddress.slice(-4)}`,
      });

      setBurnAddress("");
      setBurnAmount("");
      await loadTotalSupply();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to burn tokens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Connect your wallet to access admin features</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You are not the contract owner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5" />
              <span>Only the contract owner can access this panel</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage stablecoin operations and user access</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Total Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {totalSupply ? `${totalSupply} cUSD` : "Loading..."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Your Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">Owner</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Operations */}
        <Tabs defaultValue="allowlist" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="allowlist">
              <Users className="w-4 h-4 mr-2" />
              Allowlist
            </TabsTrigger>
            <TabsTrigger value="batch">
              <UserPlus className="w-4 h-4 mr-2" />
              Batch
            </TabsTrigger>
            <TabsTrigger value="mint">
              <Coins className="w-4 h-4 mr-2" />
              Mint
            </TabsTrigger>
            <TabsTrigger value="burn">
              <Flame className="w-4 h-4 mr-2" />
              Burn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allowlist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Single User</CardTitle>
                <CardDescription>Add or remove a user from the allowlist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>User Address</Label>
                  <Input
                    placeholder="0x..."
                    value={singleAddress}
                    onChange={(e) => setSingleAddress(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setAllowlistAction("add");
                      handleSingleAllowlist();
                    }}
                    disabled={loading || !singleAddress}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add to Allowlist
                  </Button>
                  <Button
                    onClick={() => {
                      setAllowlistAction("remove");
                      handleSingleAllowlist();
                    }}
                    disabled={loading || !singleAddress}
                    variant="destructive"
                    className="flex-1"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Batch Add Users</CardTitle>
                <CardDescription>Add multiple users to allowlist (one address per line)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Addresses (one per line)</Label>
                  <textarea
                    className="w-full h-32 px-3 py-2 rounded-md border border-border bg-secondary/50 text-foreground"
                    placeholder="0x123...&#10;0x456...&#10;0x789..."
                    value={batchAddresses}
                    onChange={(e) => setBatchAddresses(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleBatchAllowlist}
                  disabled={loading || !batchAddresses}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add All to Allowlist
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mint" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mint Tokens</CardTitle>
                <CardDescription>Create new tokens for a user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient Address</Label>
                  <Input
                    placeholder="0x..."
                    value={mintAddress}
                    onChange={(e) => setMintAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (cUSD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleMint}
                  disabled={loading || !mintAddress || !mintAmount}
                  className="w-full"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Mint Tokens
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Burn Tokens</CardTitle>
                <CardDescription>Destroy tokens from a user's balance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>User Address</Label>
                  <Input
                    placeholder="0x..."
                    value={burnAddress}
                    onChange={(e) => setBurnAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount (cUSD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleBurn}
                  disabled={loading || !burnAddress || !burnAmount}
                  variant="destructive"
                  className="w-full"
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Burn Tokens
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
