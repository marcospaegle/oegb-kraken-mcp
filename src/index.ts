#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer(
  { name: "oegb-kraken", version: "0.1.0" },
  {
    instructions:
      "Read-only access to the Octopus Energy (Kraken) REST API. Products and tariff rates are public. " +
      "Account and consumption data need the user's OCTOPUS_API_KEY. Typical flow: get_account gives the meter IDs and tariff codes, " +
      "then call get_consumption and get_tariff_rates. Use ISO 8601 datetimes with Z.",
  },
);

registerTools(server);
await server.connect(new StdioServerTransport());
