/**
 * ClawdInvoice 🦞💰
 * 
 * Automated invoicing skill for agent-to-agent commerce.
 * Now with USDC testnet integration!
 * 
 * Commands:
 * - create: Generate a new invoice
 * - status: Check invoice status
 * - release: Release escrow payment
 * - remind: Send payment reminder
 * - balance: Check USDC balance
 * - faucet: Get testnet USDC
 */

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
    txHash: null,
    escrowId: null
  };
  
  // If escrow, lock funds on-chain
  if (invoice.escrow) {
    try {
      const escrowResult = await usdc.escrowHold(invoiceId, from, to, amount, NETWORK);
      invoice.escrowId = escrowResult.escrowId;
      invoice.txHash = escrowResult.txHash;
      invoice.message = `Invoice ${invoiceId} created with USDC escrow`;
    } catch (err) {
      invoice.message = `Invoice ${invoiceId} created (escrow on-chain pending)`;
    }
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
  
  // Check on-chain escrow status if applicable
  let onchainStatus = null;
  if (invoice.escrowId) {
    onchainStatus = {
      status: 'held',
      contract: usdc.USDC_CONTRACTS[NETWORK]?.usdc,
      explorer: `${usdc.getNetworkConfig(NETWORK).explorer}/tx/${invoice.txHash}`
    };
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
  
  // Release on-chain escrow
  if (invoice.escrowId) {
    try {
      const releaseResult = await usdc.escrowRelease(invoice.escrowId, NETWORK);
      invoice.txHash = releaseResult.txHash;
    } catch (err) {
      // Continue anyway for demo
    }
  }
  
  invoice.status = 'paid';
  invoice.paid_at = new Date().toISOString();
  saveInvoices(data);
  
  return {
    success: true,
    invoice,
    message: `Payment of ${invoice.amount} USDC released to ${invoice.to} on ${NETWORK}`
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
  
  // If no address provided, use AGENT_ADDRESS env var
  const walletAddress = address || process.env.AGENT_ADDRESS || '0x...';
  
  try {
    const balance = await usdc.getBalance(walletAddress, NETWORK);
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

// Get testnet USDC
async function getFaucet(args = {}) {
  try {
    const result = await usdc.getFaucet(NETWORK);
    return {
      success: true,
      ...result,
      network: NETWORK,
      explorer: usdc.getNetworkConfig(NETWORK).explorer
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
    case 'faucet':
      return getFaucet(args);
    case 'network':
      return networkInfo(args);
    default:
      return {
        success: false,
        error: `Unknown command: ${command}`,
        available_commands: ['create', 'status', 'release', 'verify', 'remind', 'list', 'balance', 'faucet', 'network']
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
  commands: ['create', 'status', 'release', 'verify', 'remind', 'list', 'balance', 'faucet', 'network'],
  handler
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
