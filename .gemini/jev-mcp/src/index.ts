#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerJevTools } from './tools/register.js';
import { logDiagnostic, config } from './config.js';

async function runServer() {
  logDiagnostic('INFO', 'Initializing Vossie Jev Decision MCP Server...');
  logDiagnostic('INFO', `Configuration: BaseURL=${config.baseUrl}, Model=${config.defaultModel}, API Key configured=${config.apiKey ? 'YES' : 'NO'}`);

  const server = new McpServer(
    {
      name: 'vossie-jev-decision-layer',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerJevTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logDiagnostic('INFO', 'Vossie Jev Decision MCP Server connected and listening on stdio.');

  const shutdown = async () => {
    logDiagnostic('INFO', 'Shutting down Jev MCP Server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

runServer().catch((err: unknown) => {
  logDiagnostic('ERROR', 'Fatal error during Jev MCP Server startup', err);
  process.exit(1);
});
