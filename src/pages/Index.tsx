import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import { Faucet } from "@/components/Faucet";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <Hero />

        {/* Faucet Section */}
        <section className="py-20 px-4 bg-secondary/30">
          <div className="container max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Get Test Tokens</h2>
              <p className="text-muted-foreground">
                Claim free cUSD tokens to start testing the privacy features
              </p>
            </div>
            <Faucet />
          </div>
        </section>

        <Features />
      </main>
    </div>
  );
};

export default Index;
