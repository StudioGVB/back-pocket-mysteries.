#!/usr/bin/env node
/**
 * Quick test script — sends the AccountConfirmationEmail template
 * to Hello@backpocketgames.com via Resend.
 * Run with: node scripts/send-test-confirmation-email.js
 */

const { Resend } = require('resend');
const { renderAsync } = require('@react-email/render');
const React = require('react');

// Inline the email template so we don't need to transpile TSX
const { default: AccountConfirmationEmail } = require('../src/emails/AccountConfirmationEmail');

const resend = new Resend(process.env.RESEND_API_KEY || 're_cLjxv47E_N7dyBwjy5DALFfKXLgQupexF');

async function sendTest() {
  const html = await renderAsync(React.createElement(AccountConfirmationEmail));

  const { data, error } = await resend.emails.send({
    from: 'Back Pocket Mysteries <noreply@backpocketgames.com>',
    to: 'Hello@backpocketgames.com',
    subject: '🎭 [Test] Confirm Your Email — Back Pocket Mysteries',
    html,
  });

  if (error) {
    console.error('❌ Failed to send:', error);
    process.exit(1);
  }

  console.log('✅ Test email sent! ID:', data.id);
}

sendTest();
