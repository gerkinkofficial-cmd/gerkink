/**
 * Utility script to register Printify webhooks.
 * Run this locally using: node scripts/register-printify-webhook.js <YOUR_DEPLOYED_DOMAIN>
 * E.g.: node scripts/register-printify-webhook.js https://gerkink.shop
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Read and parse .env.local manually to avoid external dependencies
const envFile = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envFile)) {
  console.error('Error: .env.local file not found. Make sure you are running this from the project root.');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    // Remove enclosing quotes if present
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const token = env.PRINTIFY_ACCESS_TOKEN;
const shopId = env.PRINTIFY_SHOP_ID;
const secret = env.PRINTIFY_WEBHOOK_SECRET;

if (!token || !shopId || !secret) {
  console.error('Error: Missing required environment variables in .env.local.');
  console.error('Ensure PRINTIFY_ACCESS_TOKEN, PRINTIFY_SHOP_ID, and PRINTIFY_WEBHOOK_SECRET are configured.');
  process.exit(1);
}

// 2. Validate Domain URL Argument
const domain = process.argv[2];
if (!domain || !domain.startsWith('http')) {
  console.error('Error: Provide your deployed HTTPS domain URL.');
  console.error('Usage: node scripts/register-printify-webhook.js https://yourdomain.com');
  process.exit(1);
}

const targetUrl = `${domain.replace(/\/$/, '')}/api/printify/webhook`;

// Topics we need to handle order production and shipping tracking
const topics = [
  'order:created',
  'order:shipment:created',
  'order:shipment:delivered'
];

console.log(`Setting up Printify webhooks for Shop ID: ${shopId}`);
console.log(`Target URL: ${targetUrl}\n`);

function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.printify.com',
        path: `/v1${path}`,
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function registerWebhooks() {
  try {
    // 1. Fetch existing webhooks to clean up duplicates
    console.log('Checking existing webhooks...');
    const existingWebhooks = await makeRequest(`/shops/${shopId}/webhooks.json`, 'GET');
    
    // 2. Delete existing webhooks matching our target URL
    const matches = existingWebhooks.filter(w => w.url === targetUrl);
    if (matches.length > 0) {
      console.log(`Found ${matches.length} matching old webhook(s). Deleting...`);
      for (const webhook of matches) {
        await makeRequest(`/shops/${shopId}/webhooks/${webhook.id}.json`, 'DELETE');
        console.log(`- Deleted webhook ID: ${webhook.id}`);
      }
    }

    // 3. Register fresh webhooks for each topic
    console.log('\nRegistering new webhooks...');
    for (const topic of topics) {
      const payload = {
        topic,
        url: targetUrl,
        secret
      };
      
      const response = await makeRequest(`/shops/${shopId}/webhooks.json`, 'POST', payload);
      console.log(`✅ Subscribed to '${topic}' (Webhook ID: ${response.id})`);
    }

    console.log('\nSuccess! Printify webhooks registered successfully.');
  } catch (err) {
    console.error('\nFailed to register webhooks:', err.message);
  }
}

registerWebhooks();
