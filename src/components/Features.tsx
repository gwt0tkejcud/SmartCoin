import { Shield, Eye, Lock, Zap, Users, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Encrypted Balances",
    description: "All account balances are stored as encrypted ciphertext on-chain. Only authorized addresses can decrypt their own balance."
  },
  {
    icon: Eye,
    title: "Private Transfers",
    description: "Transfer amounts remain encrypted throughout the entire transaction process, ensuring complete privacy."
  },
  {
    icon: Shield,
    title: "FHE Security",
    description: "Fully Homomorphic Encryption allows computations on encrypted data without ever exposing the plaintext values."
  },
  {
    icon: CheckCircle2,
    title: "Allowlist Control",
    description: "Smart contract enforces an allowlist to control fund flow and prevent unauthorized transactions."
  },
  {
    icon: Zap,
    title: "Auto-Fail Protection",
    description: "Excess transfer attempts automatically fail through FHE comparison without revealing balance information."
  },
  {
    icon: Users,
    title: "Decentralized",
    description: "Fully on-chain verification with no trusted third parties or centralized servers required."
  }
];

const Features = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(185,95%,20%,0.1),transparent_70%)]" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Built for <span className="text-primary glow-text">Privacy</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Revolutionary FHE technology ensures your financial data remains confidential while maintaining full blockchain transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card p-8 rounded-2xl hover:scale-105 transition-transform duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
