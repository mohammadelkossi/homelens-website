import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

function toISODate(d: Date) {
  // strip time to UTC midnight for stable day diffs
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0,10);
}

function parseUkDate(text: string): Date | null {
  // supports: "1 Oct 2025", "01 Oct 2025", "01/10/2025"
  const m1 = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\b/);
  if (m1) {
    const [_, d, monStr, y] = m1;
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mi = months.indexOf(monStr.slice(0,3).toLowerCase());
    if (mi >= 0) return new Date(Date.UTC(Number(y), mi, Number(d)));
  }
  const m2 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/); // dd/mm/yyyy
  if (m2) {
    const [_, d, m, y] = m2;
    const year = Number(y.length === 2 ? `20${y}` : y);
    return new Date(Date.UTC(year, Number(m)-1, Number(d)));
  }
  return null;
}

function daysBetweenUTC(fromISO: string, to = new Date()): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url || !/^https:\/\/www\.rightmove\.co\.uk\/properties\/\d+/.test(url)) {
      return NextResponse.json({ ok: false, error: "Invalid Rightmove URL" }, { status: 400 });
    }

    console.log(`🔍 Fetching listing date from: ${url}`);

    const res = await fetch(url, {
      headers: {
        // Slightly friendlier headers for RM
        "user-agent": "Mozilla/5.0 (compatible; HomeLensBot/1.0; +https://example.com/bot)",
        "accept": "text/html,application/xhtml+xml",
      },
      // Don't cache while testing; you can enable caching later
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Fetch failed: ${res.status}` }, { status: 502 });
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // ---- (A) JSON-LD try: look for datePosted / datePublished ----
    // Rightmove often includes application/ld+json with useful fields.
    let addedISO: string | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).contents().text());
        const maybe = json?.datePosted || json?.datePublished || json?.listingDate;
        if (maybe && !addedISO) {
          const d = new Date(maybe);
          if (!isNaN(d.getTime())) addedISO = toISODate(d);
        }
      } catch {}
    });

    // ---- (B) Preloaded state try: window.__PRELOADED_STATE__ / PAGE_MODEL ----
    if (!addedISO) {
      const scripts = $("script")
        .map((_, el) => $(el).html() || "")
        .get()
        .filter(s => s.includes("__PRELOADED_STATE__") || s.includes("PAGE_MODEL"));
      for (const s of scripts) {
        try {
          // Extract JSON blob heuristically
          const jsonMatch =
            s.match(/__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});/) ||
            s.match(/PAGE_MODEL\s*=\s*(\{[\s\S]*?\});/);
          if (jsonMatch) {
            const blob = JSON.parse(jsonMatch[1]);
            // Search common paths where "added" lives (varies over time)
            const candidates: string[] = [];
            const crawl = (obj: any) => {
              if (!obj || typeof obj !== "object") return;
              for (const [k, v] of Object.entries(obj)) {
                if (typeof v === "string" && /added\s*on/i.test(v)) candidates.push(v);
                if (k.toLowerCase().includes("added") && typeof v === "string") candidates.push(v);
                crawl(v);
              }
            };
            crawl(blob);
            // Try to extract a date from any candidate string
            for (const c of candidates) {
              const d = parseUkDate(c);
              if (d) { addedISO = toISODate(d); break; }
            }
            if (addedISO) break;
          }
        } catch {}
      }
    }

    // ---- (C) Visible text try: e.g., "Added on 1 Oct 2025" or "04/09/2025" ----
    if (!addedISO) {
      const text = $.root().text();
      // Try different patterns
      const patterns = [
        /Added\s+on\s+([A-Za-z0-9\/\-\s]+?)(?:\.|,|\n|$)/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/g,
        /(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/g
      ];
      
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const dateStr = pattern === patterns[0] ? matches[1] : match;
            const d = parseUkDate(dateStr);
            if (d) {
              addedISO = toISODate(d);
              break;
            }
          }
          if (addedISO) break;
        }
      }
    }

    if (!addedISO) {
      console.log(`❌ Could not find 'Added on' date in: ${url}`);
      return NextResponse.json({ ok: false, error: "Could not find 'Added on' date." }, { status: 404 });
    }

    const daysOnMarket = daysBetweenUTC(addedISO, new Date());
    console.log(`✅ Found listing date: ${addedISO} (${daysOnMarket} days on market)`);
    
    return NextResponse.json({ ok: true, addedISO, daysOnMarket });
  } catch (err: any) {
    console.error(`❌ Error fetching listing date:`, err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}