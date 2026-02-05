#!/usr/bin/env node

/**
 * ClawdInvoice CLI 🦞💰
 * 
 * Usage:
 *   clawdinvoice create --from AGENT --to AGENT --amount 50 --desc "Task" --escrow
 *   clawdinvoice status --invoice_id CI-XXXX
 *   clawdinvoice release --invoice_id CI-XXXX
 *   clawdinvoice verify --invoice_id CI-XXXX
 *   clawdinvoice balance --address 0x...
 *   clawdinvoice faucet
 *   clawdinvoice network
 */

const { handler } = require('./index');

// Parse command line arguments
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else if (arg === '--escrow' || arg === '--help' || arg === '--version') {
        args[key.replace('no-', '')] = true;
      }
    } else if (!args._) {
      args._ = [];
      args._.push(arg);
    }
  }
  
  return args;
}

// Display help
function showHelp() {
  console.log(`
🦞💰 ClawdInvoice - Automated USDC Invoicing for Agents

USAGE:
  clawdinvoice <command> [options]

INVOICE COMMANDS:
  create      Create a new invoice (USDC on Base Sepolia)
  status      Check invoice status
  release     Release escrow payment
  verify      Mark work as verified
  remind      Send payment reminder
  list        List all invoices

USDC COMMANDS:
  balance     Check USDC balance
  faucet      Get testnet USDC
  network     Show network info

EXAMPLES:
  clawdinvoice create --from Alpha --to Beta --amount 100 --desc "API work"
  clawdinvoice status --invoice_id CI-ABC123
  clawdinvoice release --invoice_id CI-ABC123
  clawdinvoice balance --address 0x1234...
  clawdinvoice network

OPTIONS:
  --help      Show this help
  --version   Show version
`);
}

// Main CLI
async function main() {
  const rawArgs = parseArgs();
  const command = rawArgs._?.[0] || 'help';
  
  // Remove command from args
  delete rawArgs._;
  
  // Handle special flags
  if (command === 'help' || rawArgs.help) {
    showHelp();
    process.exit(0);
  }
  
  if (command === 'version' || rawArgs.version) {
    console.log('ClawdInvoice v0.2.0 - USDC Testnet Edition');
    process.exit(0);
  }
  
  // Execute command
  try {
    const result = await handler(command, rawArgs);
    
    // Pretty print output
    if (result.success) {
      if (result.invoice) {
        console.log('\n📄 Invoice:');
        console.log(`   ID:         ${result.invoice.id}`);
        console.log(`   From:       ${result.invoice.from}`);
        console.log(`   To:         ${result.invoice.to}`);
        console.log(`   Amount:     ${result.invoice.amount} ${result.invoice.currency}`);
        console.log(`   Status:     ${result.invoice.status}`);
        console.log(`   Network:    ${result.invoice.network || 'base-sepolia'}`);
        console.log(`   Description: ${result.invoice.description}`);
        if (result.invoice.txHash) {
          console.log(`   TX:         ${result.invoice.txHash.substring(0, 20)}...`);
        }
      }
      
      if (result.invoices) {
        console.log('\n📋 Invoices:');
        result.invoices.forEach(inv => {
          console.log(`   ${inv.id.padEnd(15)} | ${inv.status.padEnd(8)} | ${inv.amount} USDC | ${inv.description.substring(0, 25)}...`);
        });
        console.log(`\n   Total: ${result.total} invoices on ${result.network || 'base-sepolia'}`);
      }
      
      if (result.balance !== undefined) {
        console.log(`\n💰 Balance: ${result.formatted}`);
        console.log(`   Network: ${result.network}`);
      }
      
      if (result.network) {
        console.log(`\n🌐 Network: ${result.network}`);
        if (result.rpcUrl) console.log(`   RPC:      ${result.rpcUrl}`);
        if (result.explorer) console.log(`   Explorer: ${result.explorer}`);
        if (result.usdcAddress) console.log(`   USDC:     ${result.usdcAddress}`);
      }
      
      if (result.message) {
        console.log(`\n✅ ${result.message}`);
      }
    } else {
      console.log(`\n❌ Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n💥 Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
