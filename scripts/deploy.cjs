const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ConfidentialStablecoin contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const ConfidentialStablecoin = await hre.ethers.getContractFactory("ConfidentialStablecoin");
  const stablecoin = await ConfidentialStablecoin.deploy();

  await stablecoin.waitForDeployment();
  const contractAddress = await stablecoin.getAddress();

  console.log("ConfidentialStablecoin deployed to:", contractAddress);

  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);

  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /VITE_STABLECOIN_CONTRACT_ADDRESS=.*/,
    `VITE_STABLECOIN_CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log(".env updated with contract address");

  console.log("\n✅ Deployment complete!");
  console.log("Contract address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("\nNext steps:");
  console.log("1. Update frontend to use this contract address");
  console.log("2. Add initial users to allowlist via addToAllowlist()");
  console.log("3. Mint initial tokens via mint()");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
