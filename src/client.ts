const BASE_URL = (process.env.OCTOPUS_API_BASE_URL ?? "https://api.oegb-kraken.energy/v1").replace(/\/+$/, "");

export class KrakenError extends Error {}

type Query = Record<string, string | number | boolean | undefined>;

export function seg(value: string): string {
  return encodeURIComponent(value.trim());
}

export async function krakenGet(path: string, query: Query = {}, opts: { auth?: boolean } = {}): Promise<unknown> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "oegb-kraken-mcp" };
  const apiKey = process.env.OCTOPUS_API_KEY;
  if (opts.auth && !apiKey) {
    throw new KrakenError(
      "This tool needs an Octopus Energy API key. Set the OCTOPUS_API_KEY environment variable in your MCP server config " +
        "(find your key in your Octopus account under Personal details > API access).",
    );
  }
  // Send the key whenever it's available; public endpoints accept it too.
  if (apiKey) headers.Authorization = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    const hint =
      res.status === 401 || res.status === 403
        ? "Authentication failed: check OCTOPUS_API_KEY and that the account belongs to that key."
        : res.status === 404
          ? "Not found: check the identifiers (account number, product/tariff code, MPAN/MPRN, meter serial)."
          : res.status === 429
            ? "Rate limited by the Kraken API: wait and retry."
            : `Request failed with HTTP ${res.status}.`;
    throw new KrakenError(`${hint}\nGET ${url.pathname}${url.search}\n${body}`);
  }
  return res.json();
}

interface Paginated {
  count?: number;
  next?: string | null;
  results?: unknown[];
}

/** Collapse a paginated response to count / next_page / results so agents can page with a simple integer. */
export function summarisePage(data: unknown): unknown {
  const p = data as Paginated;
  if (!p || !Array.isArray(p.results)) return data;
  let nextPage: number | null = null;
  if (p.next) {
    const n = new URL(p.next).searchParams.get("page");
    nextPage = n ? Number(n) : null;
  }
  return { count: p.count, next_page: nextPage, results: p.results };
}
