const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.env.VITE_STABLECOIN_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("Error: VITE_STABLECOIN_CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("Initializing ConfidentialStablecoin contract...");
  console.log("Contract address:", contractAddress);

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer address:", signer.address);

  const contract = await hre.ethers.getContractAt("ConfidentialStablecoin", contractAddress);

  console.log("\nCalling initialize()...");
  const tx = await contract.initialize();
  console.log("Transaction hash:", tx.hash);

  console.log("Waiting for confirmation...");
  await tx.wait();

  console.log("\n✅ Contract initialized successfully!");
  console.log("Total supply encrypted value has been set to 0");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
