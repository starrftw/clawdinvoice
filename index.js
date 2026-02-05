/**
 * ClawdInvoice 🦞💰
 * 
 * Automated invoicing skill for agent-to-agent commerce.
 * Now with real USDC integration!
 * 
 * Commands:
 * - create: Generate a new invoice
 * - status: Check invoice status
 * - release: Release escrow payment
 * - remind: Send payment reminder
 * - balance: Check USDC balance
 * - transfer: Send USDC
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const usdc = require('./usdc');

// Storage path for invoices
const INVOICE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.clawdinvoice');
const INVOICE_DB = path.join(INVOICE_DIR, 'invoices.json');
const NETWORK = process.env.USDC_NETWORK || 'base-sepolia';

// Initialize storage
function initStorage() {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
  if (!fs.existsSync(INVOICE_DB)) {
    fs.writeFileSync(INVOICE_DB, JSON.stringify({ invoices: [], counter: 1000 }, null, 2));
  }
}

// Load invoices
function loadInvoices() {
  initStorage();
  const data = fs.readFileSync(INVOICE_DB, 'utf8');
  return JSON.parse(data);
}

// Save invoices
function saveInvoices(data) {
  fs.writeFileSync(INVOICE_DB, JSON.stringify(data, null, 2));
}

// Generate invoice ID
function generateInvoiceId(counter) {
  return `CI-${Date.now().toString(36).toUpperCase()}-${counter}`;
}

// Get escrow contract address from deployments
function getEscrowContractAddress() {
  try {
    const deploymentsPath = './deployments.json';
    if (fs.existsSync(deploymentsPath)) {
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      return deployments[NETWORK]?.contractAddress;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Create new invoice
async function createInvoice(args) {
  const { from, to, amount, description, escrow = false, deadline_hours = 24 } = args;
  
  if (!from || !to || !amount || !description) {
    throw new Error('Missing required fields: from, to, amount, description');
  }
  
  const data = loadInvoices();
  const invoiceId = generateInvoiceId(data.counter);
  
  const invoice = {
    id: invoiceId,
    from,
    to,
    amount: parseFloat(amount),
    currency: 'USDC',
    description,
    escrow: escrow === 'true' || escrow === true,
    network: NETWORK,
    status: escrow === 'true' || escrow === true ? 'escrowed' : 'pending',
    created_at: new Date().toISOString(),
    deadline: new Date(Date.now() + deadline_hours * 60 * 60 * 1000).toISOString(),
    paid_at: null,
    verified_at: null,
    txHash: null
  };
  
  // If escrow, handle USDC on-chain
  if (invoice.escrow) {
    const privateKey = process.env.PRIVATE_KEY;
    if (privateKey) {
      try {
        // Transfer USDC to escrow contract
        const escrowAddress = getEscrowContractAddress();
        if (escrowAddress) {
          const transferResult = await usdc.transferToEscrow(escrowAddress, amount, NETWORK);
          invoice.txHash = transferResult.txHash;
          invoice.message = `Invoice ${invoiceId} created with USDC escrow on-chain`;
        } else {
          invoice.message = `Invoice ${invoiceId} created (escrow contract not deployed)`;
        }
      } catch (err) {
        invoice.message = `Invoice ${invoiceId} created (escrow on-chain failed: ${err.message})`;
      }
    } else {
      invoice.message = `Invoice ${invoiceId} created (escrow requires PRIVATE_KEY)`;
    }
  } else {
    invoice.message = `Invoice ${invoiceId} created`;
  }
  
  data.invoices.push(invoice);
  data.counter++;
  saveInvoices(data);
  
  return {
    success: true,
    invoice,
    network: NETWORK,
    usdcContract: usdc.USDC_CONTRACTS[NETWORK]?.usdc
  };
}

// Check invoice status
async function getStatus(args) {
  const { invoice_id } = args;
  
  if (!invoice_id) {
    throw new Error('Missing required field: invoice_id');
  }
  
  const data = loadInvoices();
  const invoice = data.invoices.find(i => i.id === invoice_id);
  
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  const daysUntilDeadline = Math.ceil((new Date(invoice.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  
  // Check on-chain status if there's a txHash
  let onchainStatus = null;
  if (invoice.txHash) {
    try {
      const txStatus = await usdc.getTxStatus(invoice.txHash, NETWORK);
      const explorer = usdc.getNetworkConfig(NETWORK).explorer;
      onchainStatus = {
        status: txStatus.status,
        txHash: invoice.txHash,
        explorer: `${explorer}/tx/${invoice.txHash}`
      };
    } catch (e) {
      onchainStatus = { status: 'pending', txHash: invoice.txHash };
    }
  }
  
  return {
    success: true,
    invoice: {
      ...invoice,
      days_until_deadline: daysUntilDeadline > 0 ? daysUntilDeadline : 0,
      network: NETWORK
    },
    onchain: onchainStatus
  };
}

// Release escrow payment
async function releasePayment(args) {
  const { invoice_id } = args;
  
  if (!invoice_id) {
    throw new Error('Missing required field: invoice_id');
  }
  
  const data = loadInvoices();
  const invoice = data.invoices.find(i => i.id === invoice_id);
  
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  if (invoice.status !== 'escrowed') {
    return { success: false, error: 'Invoice is not in escrow status' };
  }
  
  invoice.status = 'released';
  invoice.paid_at = new Date().toISOString();
  saveInvoices(data);
  
  return {
    success: true,
    invoice,
    message: `Payment of ${invoice.amount} USDC released to ${invoice.to}`
  };
}

// Verify work is complete
async function verifyWork(args) {
  const { invoice_id } = args;
  
  if (!invoice_id) {
    throw new Error('Missing required field: invoice_id');
  }
  
  const data = loadInvoices();
  const invoice = data.invoices.find(i => i.id === invoice_id);
  
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  invoice.verified_at = new Date().toISOString();
  saveInvoices(data);
  
  return {
    success: true,
    invoice,
    message: 'Work verified. Payment ready for release.'
  };
}

// Send reminder
async function sendReminder(args) {
  const { invoice_id } = args;
  
  if (!invoice_id) {
    throw new Error('Missing required field: invoice_id');
  }
  
  const data = loadInvoices();
  const invoice = data.invoices.find(i => i.id === invoice_id);
  
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }
  
  const reminders = invoice.reminders || [];
  reminders.push({
    sent_at: new Date().toISOString(),
    to: invoice.to
  });
  invoice.reminders = reminders;
  saveInvoices(data);
  
  return {
    success: true,
    message: `Reminder sent to ${invoice.to} for invoice ${invoice_id}`
  };
}

// List invoices
async function listInvoices(args = {}) {
  const { status, limit = 20 } = args;
  
  const data = loadInvoices();
  let invoices = data.invoices;
  
  if (status) {
    invoices = invoices.filter(i => i.status === status);
  }
  
  invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return {
    success: true,
    invoices: invoices.slice(0, parseInt(limit)),
    total: invoices.length,
    network: NETWORK
  };
}

// Check USDC balance
async function checkBalance(args = {}) {
  const { address } = args;
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return {
      success: false,
      error: 'PRIVATE_KEY not set. Cannot query on-chain balance.',
      note: 'Set PRIVATE_KEY in .env.local to check real balances'
    };
  }
  
  const walletAddress = new ethers.Wallet(privateKey).address;
  const targetAddress = address || walletAddress;
  
  try {
    const balance = await usdc.getBalance(targetAddress, NETWORK);
    return {
      success: true,
      ...balance,
      network: NETWORK
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

// Get network info
async function networkInfo(args = {}) {
  const config = usdc.getNetworkConfig(NETWORK);
  return {
    success: true,
    network: NETWORK,
    ...config,
    contracts: usdc.USDC_CONTRACTS[NETWORK]
  };
}

// Main handler
async function handler(command, args = {}) {
  switch (command) {
    case 'create':
      return createInvoice(args);
    case 'status':
      return getStatus(args);
    case 'release':
      return releasePayment(args);
    case 'verify':
      return verifyWork(args);
    case 'remind':
      return sendReminder(args);
    case 'list':
      return listInvoices(args);
    case 'balance':
      return checkBalance(args);
    case 'network':
      return networkInfo(args);
    default:
      return {
        success: false,
        error: `Unknown command: ${command}`,
        available_commands: ['create', 'status', 'release', 'verify', 'remind', 'list', 'balance', 'network']
      };
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Parse named arguments
  const parsedArgs = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    parsedArgs[key] = value;
  }
  
  try {
    const result = await handler(command, parsedArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  }
}

// Export for skill framework
module.exports = {
  name: 'clawdinvoice',
  description: 'Automated invoicing for agent-to-agent commerce with USDC',
  commands: ['create', 'status', 'release', 'verify', 'remind', 'list', 'balance', 'network'],
  handler
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
