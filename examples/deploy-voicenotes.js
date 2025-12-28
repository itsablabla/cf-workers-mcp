#!/usr/bin/env node

/**
 * Deploy VoiceNotes Worker to Cloudflare
 * Usage: node examples/deploy-voicenotes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cloudflare credentials
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '14adde85f76060c6edef6f3239d36e6a';
const CF_API_TOKEN = process.env.CF_API_TOKEN || '30e198cf037ffd6accc4aa739e6d9b448e23aa67cd4070503eb06c0acb5235be';
const WORKER_NAME = 'voicenotes-tools';

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('❌ Error: CF_ACCOUNT_ID and CF_API_TOKEN required');
  process.exit(1);
}

async function deployWorker() {
  console.log('🚀 Deploying VoiceNotes Worker...\n');

  try {
    // Read worker code
    const workerPath = path.join(__dirname, 'voicenotes-worker.js');
    const workerCode = fs.readFileSync(workerPath, 'utf8');
    console.log('✅ Loaded worker code');

    // Create form data
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36);
    
    // Metadata
    const metadata = {
      main_module: 'worker.js',
      compatibility_date: '2024-01-01',
      compatibility_flags: []
    };

    // Build multipart form data manually
    const parts = [];
    
    // Add metadata part
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="metadata"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n`
    );

    // Add worker code part
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n` +
      `Content-Type: application/javascript\r\n\r\n` +
      `${workerCode}\r\n`
    );

    // Close boundary
    parts.push(`--${boundary}--\r\n`);

    const body = parts.join('');

    // Deploy to Cloudflare
    console.log('📤 Uploading to Cloudflare...');
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Deployment failed:');
      console.error(JSON.stringify(result.errors || result, null, 2));
      process.exit(1);
    }

    console.log('✅ Worker deployed successfully!\n');
    console.log('📋 Details:');
    console.log(`   Name: ${WORKER_NAME}`);
    console.log(`   URL: https://${WORKER_NAME}.${CF_ACCOUNT_ID}.workers.dev`);
    console.log(`   Alternative: https://voicenotes-tools.jadengarza.workers.dev\n`);

    // Test deployment
    console.log('🧪 Testing deployment...');
    const testUrl = `https://${WORKER_NAME}.${CF_ACCOUNT_ID}.workers.dev/health`;
    const testResp = await fetch(testUrl);
    const testData = await testResp.json();

    if (testData.status === 'ok') {
      console.log('✅ Health check passed!');
      console.log(`   Tools: ${testData.voicenotes_tools}`);
    } else {
      console.log('⚠️  Health check returned unexpected response');
    }

    console.log('\n🎉 Deployment complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test: curl https://voicenotes-tools.jadengarza.workers.dev/health');
    console.log('   2. Add MCP integration to Claude Desktop');
    console.log('   3. Update GARZA OS Master Config with voice memo triggers');

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    process.exit(1);
  }
}

deployWorker();
