# ClawdInvoice 🦞💰

**Automated invoicing and escrow for agent-to-agent USDC commerce on Base Sepolia.**

Built for the **Circle USDC Agent Hackathon** — Agentic Commerce Track.

## Quick Links

- **Contract (Base Sepolia)**: [`0x21E95B92a07B00e7f410Ba170aE17763971D9F60`](https://sepolia.basescan.org/address/0x21E95B92a07B00e7f410Ba170aE17763971D9F60)
- **USDC Token**: [`0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b`](https://sepolia.basescan.org/token/0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b)
- **Hackathon Submission**: https://www.moltbook.com/m/usdc
- **GitHub**: https://github.com/starrftw/clawdinvoice

## What It Does

Agents can:
- ✅ Create invoices with automatic USDC escrow
- ✅ Verify work completion
- ✅ Release payments trustlessly
- ✅ Set deadlines with automatic refunds
- ✅ Add trusted agents for arbitration

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              ClawdInvoiceEscrow.sol                  │
│              (Smart Contract)                       │
├─────────────────────────────────────────────────────┤
│  Functions:                                          │
│  - createInvoice()  - Escrow USDC                   │
│  - verifyWork()     - Mark work complete            │
│  - releasePayment() - Transfer to recipient         │
│  - refundInvoice()  - Return if deadline passes     │
│  - addVerifiedAgent()- Add trusted arbitrator       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │  USDC on Base Sepolia  │
         │  0x036cbd518a9b53...  │
         └────────────────────────┘
```

## Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```env
# Wallet private key (with Base Sepolia ETH and USDC)
PRIVATE_KEY=0x...

# Optional API keys for contract verification
BASESCAN_API_KEY=your_api_key
```

### 3. Deploy Contract

The contract is already deployed! Address: `0x21E95B92a07B00e7f410Ba170aE17763971D9F60`

To redeploy:

```bash
npx hardhat run scripts/deploy.js --network base-sepolia
```

### 4. Run Tests

```bash
npm test
```

## Usage

### CLI Commands

```bash
# Check USDC balance
clawdinvoice balance

# Create invoice with escrow
clawdinvoice create --from AgentA --to AgentB --amount 50 --desc "API work"

# Check invoice status
clawdinvoice status --invoice_id CI-XXX

# Verify work is complete
clawdinvoice verify --invoice_id CI-XXX

# Release payment
clawdinvoice release --invoice_id CI-XXX

# List all invoices
clawdinvoice list --status pending
```

### JavaScript API

```javascript
const { handler } = require('./index');

// Create invoice
const result = await handler('create', {
  from: 'AgentAlpha',
  to: 'AgentBeta',
  amount: 100,
  description: 'Built API endpoint for dashboard',
  escrow: true,
  deadline_hours: 48
});
console.log(result.invoice);
// { id: 'CI-XXX', status: 'escrowed', amount: 100, ... }

// Verify work
await handler('verify', { invoice_id: result.invoice.id });

// Release payment
await handler('release', { invoice_id: result.invoice.id });
```

## Smart Contract

**Network:** Base Sepolia Testnet  
**USDC:** `0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b`  
**Contract:** `0x21E95B92a07B00e7f410Ba170aE17763971D9F60`

### Contract Functions

| Function | Description |
|----------|-------------|
| `createInvoice()` | Create invoice, optionally escrow USDC |
| `verifyWork()` | Mark work as verified |
| `releasePayment()` | Release escrowed USDC |
| `refundInvoice()` | Refund if deadline passes |
| `addVerifiedAgent()` | Add trusted arbitrator |
| `getInvoice(id)` | Get invoice details |
| `emergencyWithdraw()` | Owner can recover funds |

### Events

```solidity
event InvoiceCreated(uint256 indexed invoiceId, address indexed from, address indexed to, uint256 amount);
event InvoiceVerified(uint256 indexed invoiceId);
event InvoiceReleased(uint256 indexed invoiceId, uint256 amount);
event InvoiceRefunded(uint256 indexed invoiceId, uint256 amount);
```

## Project Structure

```
ClawdInvoice/
├── contracts/
│   └── ClawdInvoiceEscrow.sol    # Smart contract (Solidity)
├── scripts/
│   └── deploy.js                  # Deployment script
├── index.js                       # Core Node.js API
├── cli.js                         # CLI interface
├── usdc.js                        # USDC integration (ethers.js)
├── moltbook.js                    # Moltbook posting
├── hardhat.config.js              # Hardhat configuration
├── package.json
├── .env.example                   # Environment template
└── README.md
```

## Getting Testnet Funds

1. **Base Sepolia ETH**: https://sepolia.basescan.org/faucet
2. **USDC**: https://faucet.circle.com (select Base Sepolia)

## Hackathon Submission

Submit your projects: https://www.moltbook.com/m/usdc

Deadline: Sunday, Feb 8 at 12:00 PM PST

## License

MIT

---

**ClawdInvoice: When you do the work, you get the bag.** 🦞💰
