# Cloudflare Workers MCP

MCP server for Cloudflare Workers deployment - adds missing Workers tools to GARZA OS.

## Quick Deploy VoiceNotes Worker (2 min)

```bash
# Clone repo
git clone https://github.com/itsablabla/cf-workers-mcp.git
cd cf-workers-mcp

# Deploy using node script
CF_ACCOUNT_ID=14adde85f76060c6edef6f3239d36e6a \
CF_API_TOKEN=30e198cf037ffd6accc4aa739e6d9b448e23aa67cd4070503eb06c0acb5235be \
node examples/deploy-voicenotes.js

# Test
curl https://voicenotes-tools.14adde85f76060c6edef6f3239d36e6a.workers.dev/health
```

## What This Does

Fills the **critical gap** in CF Workers tooling:
- ✅ CF Developer Platform MCP: Can **read** workers (get, list, code)
- ❌ CF Developer Platform MCP: Cannot **deploy** workers  
- ✅ This MCP: Can **create/update/delete** workers + routes + secrets

## Tools (10 total)

### Workers
1. `workers_script_upload` - Create/update worker code
2. `workers_script_delete` - Remove workers
3. `workers_script_get` - Get worker details
4. `workers_scripts_list` - List all workers

### Routes
5. `workers_route_create` - Bind worker to domain
6. `workers_route_list` - List routes
7. `workers_route_delete` - Remove routes

### Secrets
8. `workers_secret_put` - Set env variables
9. `workers_secret_delete` - Remove env variables

### Logs
10. `workers_tail_start` - Get worker logs

## Installation

### Option A: Local (Recommended)

```bash
git clone https://github.com/itsablabla/cf-workers-mcp.git
cd cf-workers-mcp
npm install

# Add to Claude Desktop config
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Linux: ~/.config/Claude/claude_desktop_config.json  
# Windows: %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "cf-workers-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/cf-workers-mcp/index.js"],
      "env": {
        "CF_ACCOUNT_ID": "14adde85f76060c6edef6f3239d36e6a",
        "CF_API_TOKEN": "30e198cf037ffd6accc4aa739e6d9b448e23aa67cd4070503eb06c0acb5235be"
      }
    }
  }
}

# Restart Claude Desktop
```

### Option B: Fly.io

```bash
# Add fly.toml and package.json to repo
fly deploy

# Set secrets
fly secrets set CF_ACCOUNT_ID=14adde85f76060c6edef6f3239d36e6a
fly secrets set CF_API_TOKEN=30e198cf037ffd6accc4aa739e6d9b448e23aa67cd4070503eb06c0acb5235be

# Add SSE endpoint to Claude config
{
  "mcpServers": {
    "cf-workers-mcp": {
      "url": "https://cf-workers-mcp.fly.dev/sse"
    }
  }
}
```

## VoiceNotes Worker Example

Complete working example in `/examples`:
- `voicenotes-worker.js` - Worker with 5 VoiceNotes tools
- `deploy-voicenotes.js` - Deployment script
- `.github/workflows/deploy-voicenotes.yml` - GitHub Actions

### Deploy Methods

**1. Node Script (Easiest)**
```bash
node examples/deploy-voicenotes.js
```

**2. Direct curl**
```bash
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/14adde85f76060c6edef6f3239d36e6a/workers/scripts/voicenotes-tools" \
  -H "Authorization: Bearer 30e198cf037ffd6accc4aa739e6d9b448e23aa67cd4070503eb06c0acb5235be" \
  -H "Content-Type: application/javascript" \
  --data-binary @examples/voicenotes-worker.js
```

**3. Via MCP (once server running)**
Use `workers_script_upload` tool in Claude Desktop.

### Test VoiceNotes
```bash
# Health check
curl https://voicenotes-tools.14adde85f76060c6edef6f3239d36e6a.workers.dev/health

# List tools
curl https://voicenotes-tools.14adde85f76060c6edef6f3239d36e6a.workers.dev/tools

# Get latest transcript
curl -X POST https://voicenotes-tools.14adde85f76060c6edef6f3239d36e6a.workers.dev/execute \
  -H 'Content-Type: application/json' \
  -d '{"tool":"voicenotes_get_latest","arguments":{}}'
```

## API Examples

### Upload Worker
```javascript
const formData = new FormData();
formData.append('metadata', JSON.stringify({
  main_module: 'worker.js',
  compatibility_date: '2024-01-01'
}));
formData.append('worker.js', code, {
  contentType: 'application/javascript',
  filename: 'worker.js'
});

await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${name}`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);
```

### Create Route
```javascript
await fetch(
  `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pattern: 'api.example.com/*',
      script: 'my-worker'
    })
  }
);
```

## Why This Exists

Official CF Developer Platform MCP only has **read** access:
- ✅ List workers
- ✅ Get worker details
- ✅ View worker code

Cannot:
- ❌ Deploy workers
- ❌ Update workers  
- ❌ Manage routes/secrets

This MCP fills that gap.

## GARZA OS Stack

```
Claude
  ↓
CF Workers MCP ← YOU ARE HERE
  ↓
Cloudflare API
  ↓
Workers Runtime
```

Other MCP servers:
- **Craft** - Knowledge base (primary data source)
- **Garza Home** - Beeper, UniFi, Abode, ProtonMail, Bible
- **Last Rock Dev** - GitHub, Fly.io, n8n, Scout APM, CF DNS

## Get Credentials

1. **Account ID**: Dashboard → Workers & Pages → Copy Account ID
2. **API Token**: Dashboard → My Profile → API Tokens → Create Token
   - Template: "Edit Cloudflare Workers"
   - Or custom: `Workers Scripts:Edit`, `Workers Routes:Edit`

**NEVER commit credentials to repo**

## GitHub Actions (Optional)

Auto-deploy on push - requires GitHub secrets:

1. Go to repo Settings → Secrets
2. Add `CF_ACCOUNT_ID` 
3. Add `CF_API_TOKEN`
4. Push to `main` or trigger manually

## Development

```bash
npm install

# Run locally
CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy node index.js

# Test with inspector
npx @modelcontextprotocol/inspector node index.js
```

## License

MIT - Part of GARZA OS

## Links

- GitHub: https://github.com/itsablabla/cf-workers-mcp
- GARZA OS Config: Craft Doc 14219
