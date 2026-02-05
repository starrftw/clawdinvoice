# ClawdInvoice

**Automated invoicing and escrow for agent-to-agent USDC commerce on Base Sepolia.**

🦞💰 Built for the **Circle USDC Agent Hackathon** — Agentic Commerce Track.

## Quick Links

- **Contract (Base Sepolia)**: `0x...` (deploying)
- **USDC Token**: `0x036cbd518a9b53f10a5a46d2f77b6e17b4c0fa8b`
- **Hackathon Submission**: https://www.moltbook.com/m/usdc

## What It Does

Agents can:
- Create invoices with automatic USDC escrow
- Verify work completion
- Release payments trustlessly
- Set deadlines with automatic refunds
- Add trusted agents for arbitration

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              ClawdInvoiceEscrow.sol                  │
│              (Smart Contract)                        │
├─────────────────────────────────────────────────────┤
│  Functions:                                          │
│  - createInvoice()  - Escrow USDC                   │
│  - verifyWork()     - Mark work complete           │
│  - releasePayment() - Transfer to recipient         │
│  - refundInvoice()  - Return if deadline passes     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │  USDC on Base Sepolia  │
         │  0x036cbd518a9b53...  │
         └────────────────────────┘
```

## Deployment

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add PRIVATE_KEY and BASESCAN_API_KEY

# Deploy to Base Sepolia
npm run deploy:base-sepolia
```

## Usage

### CLI

```bash
# Create invoice with escrow
clawdinvoice create --from AgentA --to AgentB --amount 50 --desc "API work"

# Check status
clawdinvoice status --invoice_id CI-XXX

# Release payment
clawdinvoice release --invoice_id CI-XXX
```

### JavaScript API

```javascript
const { handler } = require('./index');

// Create invoice
const result = await handler('create', {
  from: 'AgentAlpha',
  to: 'AgentBeta',
  amount: 100,
  description: 'Built API endpoint',
  escrow: true,
  deadline_hours: 48
});

// Verify and release
await handler('verify', { invoice_id: result.invoice.id });
await handler('release', { invoice_id: result.invoice.id });
```

## Contract Functions

| Function | Description |
|----------|-------------|
| `createInvoice()` | Create invoice, optionally escrow USDC |
| `verifyWork()` | Mark work as verified |
| `releasePayment()` | Release escrowed USDC |
| `refundInvoice()` | Refund if deadline passes |
| `addVerifiedAgent()` | Add trusted arbitrator |

## Project Structure

```
ClawdInvoice/
├── contracts/
│   └── ClawdInvoiceEscrow.sol    # Smart contract
├── scripts/
│   └── deploy.js                  # Deployment script
├── index.js                       # Core Node.js API
├── cli.js                         # CLI interface
├── usdc.js                        # USDC integration
├── moltbook.js                    # Moltbook posting
├── hardhat.config.js              # Hardhat config
├── package.json
└── README.md
```

## License

MIT

---

**ClawdInvoice: When you do the work, you get the bag.** 🦞💰
