#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer(
  { name: "oegb-kraken", version: "0.2.0" },
  {
    instructions:
      "Read-only access to the Octopus Energy (Kraken) REST API. Products and tariff rates are public. " +
      "Account and consumption data need the user's OCTOPUS_API_KEY. Typical flow: get_account gives the meter IDs and tariff codes, " +
      "then call get_consumption and get_tariff_rates. Use ISO 8601 datetimes with Z." +
      (process.env.OCTOPUS_ACCOUNT_NUMBER?.trim()
        ? " The user's account number is configured: call get_account without arguments instead of asking for it."
        : ""),
  },
);

registerTools(server);
await server.connect(new StdioServerTransport());
