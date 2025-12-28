# Cloudflare Workers MCP Server

MCP server for deploying and managing Cloudflare Workers - the missing deployment tools for GARZA OS.

## Features

- ✅ **Upload/Update Workers** - Deploy worker scripts
- ✅ **Delete Workers** - Remove worker scripts
- ✅ **List Workers** - View all deployed workers
- ✅ **Manage Routes** - Bind workers to domains
- ✅ **Secrets/Environment** - Set environment variables
- ✅ **Logs** - View worker logs

## Installation

### Local Installation

```bash
git clone https://github.com/itsablabla/cf-workers-mcp.git
cd cf-workers-mcp
npm install
```

### Environment Variables

Create a `.env` file or set these in your shell:

```bash
export CF_ACCOUNT_ID="your-cloudflare-account-id"
export CF_API_TOKEN="your-cloudflare-api-token"
```

**Getting Credentials:**
1. **Account ID**: Dashboard → Click your account → Copy Account ID
2. **API Token**: Dashboard → My Profile → API Tokens → Create Token
   - Use "Edit Cloudflare Workers" template
   - Or create custom with `Workers Scripts:Edit` permission

### Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cf-workers": {
      "command": "node",
      "args": ["/path/to/cf-workers-mcp/index.js"],
      "env": {
        "CF_ACCOUNT_ID": "your-account-id",
        "CF_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### 1. workers_script_upload
Create or update a Worker script.

**Parameters:**
- `script_name` (required) - Worker name (alphanumeric, hyphens, underscores)
- `script_content` (required) - JavaScript/TypeScript code
- `compatibility_date` (optional) - Format: YYYY-MM-DD, default: 2024-01-01
- `compatibility_flags` (optional) - Array of compatibility flags

**Example:**
```javascript
{
  "script_name": "my-worker",
  "script_content": "export default { async fetch(request) { return new Response('Hello!'); } }",
  "compatibility_date": "2024-01-01"
}
```

### 2. workers_script_delete
Delete a Worker script.

**Parameters:**
- `script_name` (required) - Worker name to delete

### 3. workers_script_get
Get details and code of a Worker.

**Parameters:**
- `script_name` (required) - Worker name

### 4. workers_scripts_list
List all Workers in your account.

**Parameters:** None

### 5. workers_route_create
Bind a Worker to a domain/URL pattern.

**Parameters:**
- `zone_id` (required) - Cloudflare Zone ID (domain)
- `pattern` (required) - URL pattern (e.g., `example.com/*`)
- `script_name` (required) - Worker to bind

**Example:**
```javascript
{
  "zone_id": "abc123...",
  "pattern": "api.example.com/*",
  "script_name": "my-api-worker"
}
```

### 6. workers_route_list
List all routes for a zone.

**Parameters:**
- `zone_id` (required) - Cloudflare Zone ID

### 7. workers_route_delete
Delete a Worker route.

**Parameters:**
- `zone_id` (required) - Cloudflare Zone ID
- `route_id` (required) - Route ID to delete

### 8. workers_secret_put
Set an environment variable for a Worker.

**Parameters:**
- `script_name` (required) - Worker name
- `secret_name` (required) - Environment variable name
- `secret_value` (required) - Environment variable value

### 9. workers_secret_delete
Delete an environment variable from a Worker.

**Parameters:**
- `script_name` (required) - Worker name
- `secret_name` (required) - Environment variable name

### 10. workers_tail_start
Get recent logs from a Worker.

**Parameters:**
- `script_name` (required) - Worker name
- `limit` (optional) - Number of log entries (default: 100, max: 1000)

## Usage Example

### Deploy VoiceNotes Worker

1. **Upload Script:**
```javascript
// Use workers_script_upload tool
{
  "script_name": "voicenotes-tools",
  "script_content": "<worker code here>",
  "compatibility_date": "2024-01-01"
}
```

2. **Set Environment Variables:**
```javascript
// Use workers_secret_put tool
{
  "script_name": "voicenotes-tools",
  "secret_name": "VOICENOTES_API_KEY",
  "secret_value": "your-api-key"
}
```

3. **Create Route (Optional):**
```javascript
// Use workers_route_create tool
{
  "zone_id": "your-zone-id",
  "pattern": "voicenotes-tools.yourdomain.com/*",
  "script_name": "voicenotes-tools"
}
```

## GARZA OS Integration

This MCP fills the deployment gap in GARZA OS infrastructure:

- **CF MCP** (Mac) - Orchestration/SSH gateway
- **Garza Home MCP** (DO VPS) - Beeper, UniFi, Abode, ProtonMail
- **Last Rock Dev MCP** (DO VPS) - GitHub, Fly.io, n8n, Scout APM
- **CF Workers MCP** (NEW) - Cloudflare Workers deployment 🎉

## Development

```bash
# Install dependencies
npm install

# Run server
CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy node index.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node index.js
```

## License

MIT

## Author

Jaden Garza - GARZA OS
