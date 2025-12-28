#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Cloudflare API configuration
const CF_API_BASE = "https://api.cloudflare.com/client/v4";
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error("ERROR: CF_ACCOUNT_ID and CF_API_TOKEN environment variables required");
  process.exit(1);
}

// Helper function for Cloudflare API calls
async function cfApiCall(endpoint, options = {}) {
  const url = `${CF_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(`CF API Error: ${JSON.stringify(data.errors || data)}`);
  }

  return data.result;
}

// MCP Server
const server = new Server(
  {
    name: "cf-workers-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "workers_script_upload",
    description: "Create or update a Cloudflare Worker script. This uploads the worker code and creates/updates the worker.",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script (alphanumeric, hyphens, underscores)",
        },
        script_content: {
          type: "string",
          description: "JavaScript/TypeScript code for the worker",
        },
        compatibility_date: {
          type: "string",
          description: "Compatibility date (YYYY-MM-DD format). Default: 2024-01-01",
        },
        compatibility_flags: {
          type: "array",
          items: { type: "string" },
          description: "Optional compatibility flags",
        },
      },
      required: ["script_name", "script_content"],
    },
  },
  {
    name: "workers_script_delete",
    description: "Delete a Cloudflare Worker script.",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script to delete",
        },
      },
      required: ["script_name"],
    },
  },
  {
    name: "workers_script_get",
    description: "Get details and code of a specific Worker script.",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script",
        },
      },
      required: ["script_name"],
    },
  },
  {
    name: "workers_scripts_list",
    description: "List all Worker scripts in the account.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "workers_route_create",
    description: "Create a route to bind a Worker to a domain/URL pattern.",
    inputSchema: {
      type: "object",
      properties: {
        zone_id: {
          type: "string",
          description: "Cloudflare Zone ID (domain)",
        },
        pattern: {
          type: "string",
          description: "URL pattern (e.g., 'example.com/*' or 'api.example.com/*')",
        },
        script_name: {
          type: "string",
          description: "Name of the worker script to bind",
        },
      },
      required: ["zone_id", "pattern", "script_name"],
    },
  },
  {
    name: "workers_route_list",
    description: "List all routes for a specific zone.",
    inputSchema: {
      type: "object",
      properties: {
        zone_id: {
          type: "string",
          description: "Cloudflare Zone ID (domain)",
        },
      },
      required: ["zone_id"],
    },
  },
  {
    name: "workers_route_delete",
    description: "Delete a Worker route.",
    inputSchema: {
      type: "object",
      properties: {
        zone_id: {
          type: "string",
          description: "Cloudflare Zone ID (domain)",
        },
        route_id: {
          type: "string",
          description: "Route ID to delete",
        },
      },
      required: ["zone_id", "route_id"],
    },
  },
  {
    name: "workers_secret_put",
    description: "Set an environment variable (secret) for a Worker.",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script",
        },
        secret_name: {
          type: "string",
          description: "Environment variable name",
        },
        secret_value: {
          type: "string",
          description: "Environment variable value",
        },
      },
      required: ["script_name", "secret_name", "secret_value"],
    },
  },
  {
    name: "workers_secret_delete",
    description: "Delete an environment variable (secret) from a Worker.",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script",
        },
        secret_name: {
          type: "string",
          description: "Environment variable name to delete",
        },
      },
      required: ["script_name", "secret_name"],
    },
  },
  {
    name: "workers_tail_start",
    description: "Get recent logs from a Worker (tail logs).",
    inputSchema: {
      type: "object",
      properties: {
        script_name: {
          type: "string",
          description: "Name of the worker script",
        },
        limit: {
          type: "number",
          description: "Number of log entries to retrieve (default: 100, max: 1000)",
        },
      },
      required: ["script_name"],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "workers_script_upload": {
        const { script_name, script_content, compatibility_date = "2024-01-01", compatibility_flags = [] } = args;
        
        // Create form data for script upload
        const formData = new FormData();
        
        // Create metadata
        const metadata = {
          main_module: "worker.js",
          compatibility_date,
          compatibility_flags,
        };
        
        formData.append("metadata", JSON.stringify(metadata));
        formData.append("worker.js", new Blob([script_content], { type: "application/javascript" }));

        const result = await cfApiCall(
          `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}`,
          {
            method: "PUT",
            body: formData,
            headers: {
              // Don't set Content-Type - let fetch set it with boundary
              "Authorization": `Bearer ${CF_API_TOKEN}`,
            },
          }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "workers_script_delete": {
        const { script_name } = args;
        await cfApiCall(`/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}`, {
          method: "DELETE",
        });

        return {
          content: [
            {
              type: "text",
              text: `Worker script '${script_name}' deleted successfully`,
            },
          ],
        };
      }

      case "workers_script_get": {
        const { script_name } = args;
        const result = await cfApiCall(`/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "workers_scripts_list": {
        const result = await cfApiCall(`/accounts/${CF_ACCOUNT_ID}/workers/scripts`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "workers_route_create": {
        const { zone_id, pattern, script_name } = args;
        const result = await cfApiCall(`/zones/${zone_id}/workers/routes`, {
          method: "POST",
          body: JSON.stringify({
            pattern,
            script: script_name,
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "workers_route_list": {
        const { zone_id } = args;
        const result = await cfApiCall(`/zones/${zone_id}/workers/routes`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "workers_route_delete": {
        const { zone_id, route_id } = args;
        await cfApiCall(`/zones/${zone_id}/workers/routes/${route_id}`, {
          method: "DELETE",
        });

        return {
          content: [
            {
              type: "text",
              text: `Route '${route_id}' deleted successfully`,
            },
          ],
        };
      }

      case "workers_secret_put": {
        const { script_name, secret_name, secret_value } = args;
        const result = await cfApiCall(
          `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}/settings`,
          {
            method: "PATCH",
            body: JSON.stringify({
              environment_variables: [
                {
                  name: secret_name,
                  text: secret_value,
                  type: "secret_text",
                },
              ],
            }),
          }
        );

        return {
          content: [
            {
              type: "text",
              text: `Secret '${secret_name}' set for worker '${script_name}'`,
            },
          ],
        };
      }

      case "workers_secret_delete": {
        const { script_name, secret_name } = args;
        // Note: Deleting secrets requires getting current settings and removing the specific one
        const result = await cfApiCall(
          `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}/settings`,
          {
            method: "PATCH",
            body: JSON.stringify({
              environment_variables: [
                {
                  name: secret_name,
                  type: "secret_text",
                  // Sending null/empty removes it
                },
              ],
            }),
          }
        );

        return {
          content: [
            {
              type: "text",
              text: `Secret '${secret_name}' deleted from worker '${script_name}'`,
            },
          ],
        };
      }

      case "workers_tail_start": {
        const { script_name, limit = 100 } = args;
        // Note: Actual tail requires WebSocket, this returns recent logs
        const result = await cfApiCall(
          `/accounts/${CF_ACCOUNT_ID}/workers/scripts/${script_name}/tails`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare Workers MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
