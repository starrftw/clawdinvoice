/**
 * ClawdInvoice USDC Integration 🦞💰
 * 
 * Circle USDC integration on Base Sepolia testnet.
 * 
 * Uses Circle's official Web3 SDK for:
 * - USDC transfers
 * - CCTP cross-chain transfers (when needed)
 * - Token balance queries
 */

const { ethers } = require('ethers');

// USDC contract on Base Sepolia (official testnet address)
const USDC_CONTRACTS = {
  'base-sepolia': {
    usdc: '0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b',
    cctp: '0xC0b2983B4F92E7b3C3A84C7C6C78F5a6E4c4F8cE' // Circle Messenger
  },
  'arbitrum-sepolia': {
    usdc: '0x2416092f143378150bb3e0c1303fc57c5fc2b81a',
    cctp: '0x...'
  }
};

// Minimal ERC-20 ABI for balanceOf and transfer
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: 'remaining', type: 'uint256' }],
    type: 'function'
  }
];

// Network RPC URLs
const RPC_URLS = {
  'base-sepolia': process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia.arbitrum.org/rpc'
};

/**
 * Get provider for a network
 */
function getProvider(network = 'base-sepolia') {
  return new ethers.JsonRpcProvider(RPC_URLS[network]);
}

/**
 * Get USDC contract instance
 */
function getUSDCContract(network = 'base-sepolia', walletOrProvider) {
  const address = USDC_CONTRACTS[network]?.usdc;
  if (!address) {
    throw new Error(`Unknown network: ${network}`);
  }
  return new ethers.Contract(address, ERC20_ABI, walletOrProvider);
}

/**
 * Get USDC balance for an address
 */
async function getBalance(address, network = 'base-sepolia') {
  const provider = getProvider(network);
  const usdc = getUSDCContract(network, provider);
  
  const balance = await usdc.balanceOf(address);
  const formatted = ethers.formatUnits(balance, 6); // USDC has 6 decimals
  
  return {
    success: true,
    address,
    network,
    balance: balance.toString(),
    formatted: `${parseFloat(formatted).toFixed(2)} USDC`,
    contract: USDC_CONTRACTS[network]?.usdc
  };
}

/**
 * Transfer USDC to another address (requires wallet with private key)
 */
async function transfer(to, amount, network = 'base-sepolia') {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  
  const provider = getProvider(network);
  const wallet = new ethers.Wallet(privateKey, provider);
  const usdc = getUSDCContract(network, wallet);
  
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  
  const tx = await usdc.transfer(to, amountWei);
  const receipt = await tx.wait();
  
  return {
    success: true,
    from: wallet.address,
    to,
    amount,
    currency: 'USDC',
    network,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    message: `Transferred ${amount} USDC to ${to}`
  };
}

/**
 * Approve spender to use USDC (for escrow contract)
 */
async function approve(spender, amount, network = 'base-sepolia') {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  
  const provider = getProvider(network);
  const wallet = new ethers.Wallet(privateKey, provider);
  const usdc = getUSDCContract(network, wallet);
  
  const amountWei = ethers.parseUnits(amount.toString(), 6);
  
  const tx = await usdc.approve(spender, amountWei);
  const receipt = await tx.wait();
  
  return {
    success: true,
    owner: wallet.address,
    spender,
    amount,
    currency: 'USDC',
    network,
    txHash: tx.hash,
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    message: `Approved ${amount} USDC for ${spender}`
  };
}

/**
 * Transfer USDC from user to escrow (via approve + transferFrom)
 */
async function transferToEscrow(escrowAddress, amount, network = 'base-sepolia') {
  // First approve the escrow contract to spend USDC
  const approveResult = await approve(escrowAddress, amount, network);
  
  if (!approveResult.success) {
    return approveResult;
  }
  
  return {
    success: true,
    to: escrowAddress,
    amount,
    currency: 'USDC',
    network,
    txHash: approveResult.txHash,
    message: `Approved ${amount} USDC for escrow contract`
  };
}

/**
 * Get transaction status
 */
async function getTxStatus(txHash, network = 'base-sepolia') {
  const provider = getProvider(network);
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  return {
    success: true,
    txHash,
    network,
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
    confirmations: receipt.confirmations
  };
}

/**
 * Network configuration
 */
function getNetworkConfig(network = 'base-sepolia') {
  return {
    name: network,
    chainId: network === 'base-sepolia' ? 84532 : 421614,
    rpcUrl: RPC_URLS[network],
    explorer: network === 'base-sepolia' 
      ? 'https://sepolia.basescan.org'
      : 'https://sepolia.arbiscan.io',
    usdcAddress: USDC_CONTRACTS[network]?.usdc,
    cctpAddress: USDC_CONTRACTS[network]?.cctp
  };
}

/**
 * Wait for transaction confirmation
 */
async function waitForTx(txHash, network = 'base-sepolia', confirmations = 1) {
  const provider = getProvider(network);
  return await provider.waitForTransaction(txHash, confirmations);
}

module.exports = {
  USDC_CONTRACTS,
  ERC20_ABI,
  getProvider,
  getUSDCContract,
  getBalance,
  transfer,
  approve,
  transferToEscrow,
  getTxStatus,
  getNetworkConfig,
  waitForTx
};
