/**
 * ClawdInvoice Test Suite
 */

const { handler } = require('./index');

async function runTests() {
  console.log('🧪 Running ClawdInvoice tests...\n');
  
  // Test 1: Create invoice
  console.log('Test 1: Create invoice');
  const createResult = await handler('create', {
    from: 'AgentAlpha',
    to: 'AgentBeta',
    amount: '100',
    description: 'Built API endpoint for user dashboard',
    escrow: 'true',
    deadline_hours: '48'
  });
  console.log(JSON.stringify(createResult, null, 2));
  
  if (!createResult.success) {
    console.log('❌ Test 1 failed');
    process.exit(1);
  }
  console.log('✅ Test 1 passed\n');
  
  const invoiceId = createResult.invoice.id;
  
  // Test 2: Check status
  console.log('Test 2: Check invoice status');
  const statusResult = await handler('status', { invoice_id: invoiceId });
  console.log(JSON.stringify(statusResult, null, 2));
  
  if (!statusResult.success || statusResult.invoice.status !== 'escrowed') {
    console.log('❌ Test 2 failed');
    process.exit(1);
  }
  console.log('✅ Test 2 passed\n');
  
  // Test 3: Verify work
  console.log('Test 3: Verify work completed');
  const verifyResult = await handler('verify', { invoice_id: invoiceId });
  console.log(JSON.stringify(verifyResult, null, 2));
  
  if (!verifyResult.success) {
    console.log('❌ Test 3 failed');
    process.exit(1);
  }
  console.log('✅ Test 3 passed\n');
  
  // Test 4: Release payment
  console.log('Test 4: Release escrow payment');
  const releaseResult = await handler('release', { invoice_id: invoiceId });
  console.log(JSON.stringify(releaseResult, null, 2));
  
  if (!releaseResult.success || releaseResult.invoice.status !== 'paid') {
    console.log('❌ Test 4 failed');
    process.exit(1);
  }
  console.log('✅ Test 4 passed\n');
  
  // Test 5: List invoices
  console.log('Test 5: List all invoices');
  const listResult = await handler('list', { status: 'paid' });
  console.log(JSON.stringify(listResult, null, 2));
  
  if (!listResult.success || listResult.invoices.length < 1) {
    console.log('❌ Test 5 failed');
    process.exit(1);
  }
  console.log('✅ Test 5 passed\n');
  
  console.log('🎉 All tests passed!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
