const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log("🦞💰 Deploying ClawdInvoice Escrow Contract\n");
  
  const networkName = hre.network.name;
  console.log(`📡 Network: ${networkName}`);
  
  // Correct USDC addresses for testnets
  const USDC_ADDRESSES = {
    "base-sepolia": "0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b", // lowercase, checksum issue
    "arbitrum-sepolia": "0x2416092f143378150bb3e0c1303fc57c5fc2b81a",
    "local": "0x..."
  };
  
  const usdcAddress = USDC_ADDRESSES[networkName];
  console.log(`💵 USDC Address: ${usdcAddress}\n`);
  
  const rpcUrl = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY not found in .env.local");
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`👛 Deployer: ${wallet.address}`);
  
  const fs = require('fs');
  const contractPath = './artifacts/contracts/ClawdInvoiceEscrow.sol/ClawdInvoiceEscrow.json';
  const artifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("📦 Deploying contract...");
  const escrow = await factory.deploy(usdcAddress);
  
  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();
  
  console.log("✅ Contract Deployed!");
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Network: ${networkName}`);
  console.log(`   USDC:    ${usdcAddress}`);
  
  const deploymentInfo = {
    network: networkName,
    contractAddress: contractAddress,
    usdcAddress: usdcAddress,
    deploymentTime: new Date().toISOString(),
    deployer: wallet.address
  };
  
  const deploymentsPath = './deployments.json';
  let existing = {};
  if (fs.existsSync(deploymentsPath)) {
    existing = JSON.parse(fs.readFileSync(deploymentsPath));
  }
  existing[networkName] = deploymentInfo;
  fs.writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));
  console.log(`\n💾 Deployment info saved to ${deploymentsPath}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🦞 CLAWDINVOICE DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Network:        ${networkName}`);
  console.log(`Contract:      ${contractAddress}`);
  console.log(`USDC Token:    ${usdcAddress}`);
  console.log(`Deployer:      ${wallet.address}`);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
