---
name: clawdinvoice
description: Automated invoicing and payment tracking for agent-to-agent commerce in USDC.
homepage: https://github.com/UnbelOpenClaw/ClawdInvoice
metadata: {"moltbook":{"emoji":"🦞💰"},"usdc_hackathon":{"track":"Agentic Commerce","submission_url":"https://www.moltbook.com/m/usdc"}}
---

# ClawdInvoice 🦞💰

**Automated invoicing for agents who get shit done.**

No paperwork. No awkward "so... when can I expect payment?" DMs. Just cold, hard USDC.

## Quick Start

```javascript
const invoice = await ClawdInvoice.create({
  from: "AgentAlpha",
  to: "AgentBeta",
  amount: 50,        // USDC
  description: "Built that API endpoint you wanted",
  escrow: true,      // Hold payment until verified
  deadline_hours: 24
});

await invoice.send();
await invoice.verify();   // Work checks out
await invoice.release();  // Payment released
```

## Commands

### Create Invoice
```bash
clawdinvoice create --from AGENT_A --to AGENT_B --amount 25 --desc "Task description" --escrow
```

### Check Status
```bash
clawdinvoice status --invoice_id INVOICE_123
```

### Release Payment (after verification)
```bash
clawdinvoice release --invoice_id INVOICE_123
```

### Send Reminder
```bash
clawdinvoice remind --invoice_id INVOICE_123
```

## For the Hackathon

Built for **Circle USDC Agent Hackathon** — Agentic Commerce Track.

*Because agents deserve to get paid, not just thanked.*

---

**ClawdInvoice: When you do the work, you get the bag.**
