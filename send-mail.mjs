import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createTransport } from 'nodemailer';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns/promises';

async function validateEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Invalid email: email must be a string');
  }

  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('Invalid email: email is required');
  }

  if (trimmed.includes(' ')) {
    throw new Error('Invalid email: spaces are not allowed');
  }

  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) {
    throw new Error('Invalid email: email must contain exactly one @ symbol');
  }

  const [localPart, domain] = trimmed.split('@');
  if (!localPart || !domain) {
    throw new Error('Invalid email: email is incomplete');
  }

  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    throw new Error('Invalid email: local part is invalid');
  }

  const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  if (!domainPattern.test(domain)) {
    throw new Error('Invalid email: domain must include a valid suffix');
  }

  const normalizedDomain = domain.toLowerCase();
  const reservedDomains = [
    'example.com', 'example.org', 'example.net',
    'test.com', 'test.org', 'test.net',
    'mailinator.com', 'mailinator.org', 'mailinator.net',
    'tempmail.com', 'tempmail.org', 'tempmail.net',
    '10minutemail.com', '10minutemail.org', '10minutemail.net',
    'yopmail.com', 'yopmail.fr', 'yopmail.net',
    'guerrillamail.com', 'guerrillamail.biz', 'guerrillamail.org',
    'trashmail.com', 'trashmail.de', 'trashmail.org',
    'dispostable.com', 'getnada.com', 'maildrop.cc',
    'localhost', 'invalid', 'local'
  ];

  if (reservedDomains.includes(normalizedDomain)) {
    throw new Error('Invalid email: disposable or placeholder domains are not allowed');
  }

  const labels = normalizedDomain.split('.');
  if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) {
    throw new Error('Invalid email: domain labels are invalid');
  }

  try {
    const records = await dns.resolveMx(normalizedDomain);
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Invalid email: domain has no MX records');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOTFOUND') || message.includes('EAI_AGAIN')) {
      throw new Error(`Invalid email: domain does not resolve (${normalizedDomain})`);
    }
    throw new Error(`Invalid email: unable to verify domain (${normalizedDomain})`);
  }

  return trimmed;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');

async function loadEnvFile() {
  if (!existsSync(envPath)) return {};

  const content = await readFile(envPath, 'utf8');
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export async function sendMail({ name, email, message }) {
  const validEmail = await validateEmail(email);
  const fileEnv = await loadEnvFile();
  const mailUser = process.env.MAIL_USER || fileEnv.MAIL_USER;
  const mailPass = process.env.MAIL_PASS || fileEnv.MAIL_PASS;
  const mailTo = process.env.MAIL_TO || fileEnv.MAIL_TO || 'shankar150105@gmail.com';

  if (!mailUser || !mailPass) {
    throw new Error('Missing MAIL_USER or MAIL_PASS');
  }

  const transporter = createTransport({
    service: 'gmail',
    auth: {
      user: mailUser,
      pass: mailPass,
    },
  });

  const recipients = (Array.isArray(mailTo) ? mailTo : String(mailTo).split(','))
    .map((address) => address.trim())
    .filter(Boolean);
  const allRecipients = Array.from(new Set([validEmail, ...recipients]));
  const bodyText = `Name: ${name}\nReply-To: ${validEmail}\nSender Email: ${validEmail}\n\n${message}`;

  await transporter.sendMail({
    from: mailUser,
    to: allRecipients,
    replyTo: validEmail,
    subject: `Portfolio contact from ${name}`,
    text: bodyText,
  });
}
