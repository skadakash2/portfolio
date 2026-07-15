import assert from 'node:assert/strict';
import { sendMail } from '../send-mail.mjs';

async function run() {
  try {
    await sendMail({ name: 'Test', email: 'not-an-email', message: 'Hello' });
    throw new Error('Expected invalid email to be rejected');
  } catch (error) {
    assert.match(error.message, /invalid email/i);
    console.log('invalid-email-test: passed');
  }

  try {
    await sendMail({ name: 'Test', email: 'person@does-not-exist.invalid', message: 'Hello' });
    throw new Error('Expected unknown domain to be rejected');
  } catch (error) {
    assert.match(error.message, /domain|mx/i);
    console.log('unknown-domain-test: passed');
  }

  try {
    await sendMail({ name: 'Test', email: 'as@as', message: 'Hello' });
    throw new Error('Expected single-label domain to be rejected');
  } catch (error) {
    assert.match(error.message, /domain|invalid/i);
    console.log('single-label-domain-test: passed');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
