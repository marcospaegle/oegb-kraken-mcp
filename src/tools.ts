import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { KrakenError, krakenGet, seg, summarisePage } from "./client.js";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

const isoDate = z
  .string()
  .describe("ISO 8601 datetime, ideally with a Z or offset, e.g. 2026-01-01T00:00:00Z. Without a timezone, Europe/London is assumed.");
const page = z.number().int().min(1).optional().describe("Page number for paginated results (use next_page from the previous call).");
const pageSize = z.number().int().min(1).max(1500).optional().describe("Results per page (default 100, max 1500).");

async function run(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    const message = err instanceof KrakenError ? err.message : `Unexpected error: ${(err as Error).message}`;
    return { content: [{ type: "text" as const, text: message }], isError: true };
  }
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "list_products",
    {
      title: "List energy products",
      description:
        "List Octopus Energy products (tariff families such as Agile, Go, Flexible). Public, no API key needed. " +
        "Returns product codes to use with get_product.",
      inputSchema: {
        brand: z.string().optional().describe("Brand filter, e.g. OCTOPUS_ENERGY."),
        is_variable: z.boolean().optional(),
        is_green: z.boolean().optional(),
        is_business: z.boolean().optional(),
        is_prepay: z.boolean().optional(),
        available_at: isoDate.optional().describe("Only products available at this datetime (ISO 8601)."),
        page,
      },
      annotations,
    },
    (args) => run(async () => summarisePage(await krakenGet("/products/", args))),
  );

  server.registerTool(
    "get_product",
    {
      title: "Get product details",
      description:
        "Get one product and its tariffs by product code (e.g. AGILE-FLEX-22-11-25). Public. " +
        "The response lists tariff codes per region (single_register_electricity_tariffs, dual_register_electricity_tariffs, " +
        "single_register_gas_tariffs), keyed by GSP region like _A ... _P. Use those tariff codes with get_tariff_rates.",
      inputSchema: {
        product_code: z.string().min(1),
        tariffs_active_at: isoDate.optional().describe("Show the tariffs active at this datetime instead of now."),
      },
      annotations,
    },
    ({ product_code, tariffs_active_at }) =>
      run(() => krakenGet(`/products/${seg(product_code)}/`, { tariffs_active_at })),
  );

  server.registerTool(
    "get_tariff_rates",
    {
      title: "Get tariff rates or standing charges",
      description:
        "Get unit rates or standing charges for a tariff, e.g. half-hourly Agile prices. Public. " +
        "Prices are in pence, with value_exc_vat and value_inc_vat. Use day-unit-rates / night-unit-rates only for Economy 7 (E-2R-...) tariffs. " +
        "Results are newest first. Narrow with period_from / period_to.",
      inputSchema: {
        product_code: z.string().min(1).describe("e.g. AGILE-FLEX-22-11-25"),
        tariff_code: z.string().min(1).describe("e.g. E-1R-AGILE-FLEX-22-11-25-C"),
        fuel: z.enum(["electricity", "gas"]),
        rate_type: z.enum(["standard-unit-rates", "standing-charges", "day-unit-rates", "night-unit-rates"]),
        period_from: isoDate.optional(),
        period_to: isoDate.optional(),
        page,
        page_size: pageSize,
      },
      annotations,
    },
    ({ product_code, tariff_code, fuel, rate_type, ...query }) =>
      run(async () =>
        summarisePage(
          await krakenGet(`/products/${seg(product_code)}/${fuel}-tariffs/${seg(tariff_code)}/${rate_type}/`, query),
        ),
      ),
  );

  server.registerTool(
    "get_account",
    {
      title: "Get account details",
      description:
        "Get an Octopus Energy account by account number (e.g. A-1234ABCD). Needs OCTOPUS_API_KEY. " +
        "Returns properties with electricity meter points (MPAN, meter serial numbers) and gas meter points (MPRN, serials), " +
        "plus tariff agreements (tariff_code, valid_from/valid_to). Use these with get_consumption and get_tariff_rates.",
      inputSchema: {
        account_number: z.string().min(1),
      },
      annotations,
    },
    ({ account_number }) => run(() => krakenGet(`/accounts/${seg(account_number)}/`, {}, { auth: true })),
  );

  server.registerTool(
    "get_consumption",
    {
      title: "Get meter consumption",
      description:
        "Get smart-meter consumption for an electricity meter (MPAN + serial) or gas meter (MPRN + serial). Needs OCTOPUS_API_KEY. " +
        "Half-hourly by default. Electricity is in kWh. Gas is in kWh for SMETS1 and m³ for SMETS2. " +
        "Use group_by to aggregate, and order_by=period for oldest first (default is newest first). Get the identifiers from get_account.",
      inputSchema: {
        fuel: z.enum(["electricity", "gas"]),
        meter_point: z.string().min(1).describe("MPAN for electricity, MPRN for gas."),
        serial_number: z.string().min(1).describe("Meter serial number."),
        period_from: isoDate.optional(),
        period_to: isoDate.optional(),
        group_by: z.enum(["day", "week", "month", "quarter"]).optional(),
        order_by: z.enum(["period", "-period"]).optional(),
        page,
        page_size: pageSize,
      },
      annotations,
    },
    ({ fuel, meter_point, serial_number, ...query }) =>
      run(async () =>
        summarisePage(
          await krakenGet(
            `/${fuel}-meter-points/${seg(meter_point)}/meters/${seg(serial_number)}/consumption/`,
            query,
            { auth: true },
          ),
        ),
      ),
  );
}
