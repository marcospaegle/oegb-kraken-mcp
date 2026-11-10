# oegb-kraken-mcp

A read-only [MCP](https://modelcontextprotocol.io) server for the Octopus Energy Kraken REST API (`https://api.oegb-kraken.energy/v1`, [docs](https://developer.oegb-kraken.energy/rest/)).
It lets AI agents look up tariffs, half-hourly prices, account details and smart-meter consumption. It only sends `GET` requests.

## Tools

| Tool | What it does | API key |
|---|---|---|
| `list_products` | List products (Agile, Go, Flexible…) | no |
| `get_product` | Product details and regional tariff codes | no |
| `get_tariff_rates` | Unit rates, day/night rates, standing charges | no |
| `get_account` | Account, meter points (MPAN/MPRN), meter serials, tariff agreements | **yes** |
| `get_consumption` | Electricity/gas consumption, optionally grouped by day/week/month/quarter | **yes** |

## API key and account number

Account and consumption data need your personal API key. Find it in your Octopus account under **Personal details → API access**.
Set it as `OCTOPUS_API_KEY`. The key stays on your machine and is sent only to the Kraken API.

Optionally set `OCTOPUS_ACCOUNT_NUMBER` (e.g. `A-1234ABCD`, shown on your bills and the Octopus dashboard). Then the agent can fetch your account without asking for the number.

## Install

Requires Node.js 18+.

**Claude Code**

```sh
claude mcp add oegb-kraken -e OCTOPUS_API_KEY=sk_live_xxx -e OCTOPUS_ACCOUNT_NUMBER=A-1234ABCD -- npx -y oegb-kraken-mcp
```

**Claude Desktop** (`claude_desktop_config.json`) and other MCP clients:

```json
{
  "mcpServers": {
    "oegb-kraken": {
      "command": "npx",
      "args": ["-y", "oegb-kraken-mcp"],
      "env": {
        "OCTOPUS_API_KEY": "sk_live_xxx",
        "OCTOPUS_ACCOUNT_NUMBER": "A-1234ABCD"
      }
    }
  }
}
```

The products and prices tools work without a key. Leave `env` out if you only need those.

Optional: `OCTOPUS_API_BASE_URL` overrides the API base URL (default `https://api.oegb-kraken.energy/v1`).

## Example prompts

- "What are the Agile prices for region C tonight?"
- "How much electricity did I use per day last week?"

## Development

```sh
npm install
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

This repo's `.mcp.json` runs the local build in Claude Code, using `OCTOPUS_API_KEY` from your shell.

Publish with `npm publish`. `prepublishOnly` builds first, and only `dist/` is shipped.
