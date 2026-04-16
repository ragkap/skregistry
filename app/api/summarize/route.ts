import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Redis } from '@upstash/redis';
import pool from '@/lib/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function fetchTopShareholders(entityId: number, cutoff: string | null) {
  const cutoffClause = cutoff ? `and fifh.latest_report_date >= '${cutoff}'` : '';
  const query = `
    with entity_fsym as (
      select fsd.fsym_id from entities e
      join factset_security_details fsd on e.isin = fsd.isin
      where e.id = $1
    ),
    agg as (
      select
        fi."name" as insti_name,
        esr.total_holding,
        fifh.latest_holding,
        fifh.latest_holding / nullif(fifh.previous_holding, 0) - 1 as change_pct,
        fifh.latest_report_date
      from factset_institution_fund_holdings fifh
      join factset_institution_funds fif on fif.factset_fund_id = fifh.factset_fund_id
      join factset_institutions fi on fi.factset_entity_id = fif.factset_entity_id
      join entity_share_registries esr
        on esr.factset_entity_id = fif.factset_entity_id
        and esr.fsym_id = (select fsym_id from entity_fsym)
      where fifh.fsym_id = (select fsym_id from entity_fsym)
      ${cutoffClause}
      group by 1,2,3,4,5
      order by esr.total_holding desc
      limit 15
    )
    select insti_name, total_holding, latest_holding, change_pct, latest_report_date from agg
  `;
  try {
    const result = await pool.query(query, [entityId]);
    return result.rows;
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, shareholders, peerEntities, staleCutoff: cutoff } = body as {
      entity: { id?: number; pretty_name?: string; short_name?: string; bloomberg_ticker?: string; sector?: string; country?: string };
      shareholders: {
        insti_name: string; type: string;
        total_holding: number; change_in_percentage: number;
        fund_name?: string;
        person_names?: string[] | null; person_emails?: string[] | null;
      }[];
      peerEntities: { id: number; pretty_name: string; bloomberg_ticker: string }[];
      staleCutoff: string | null;
    };

    // Fetch top shareholders for up to 4 peers from DB
    const peerData: { entity: { pretty_name: string; bloomberg_ticker: string }; topHolders: unknown[] }[] = [];
    for (const peer of (peerEntities || []).slice(0, 4)) {
      if (!peer.id) continue;
      const holders = await fetchTopShareholders(peer.id, cutoff ?? null);
      peerData.push({ entity: peer, topHolders: holders });
    }

    // Build institution-level summary for the main entity
    const instis = new Map<string, { total: number; change: number; contacts: { name: string; email: string | null; fund: string }[] }>();
    for (const r of (shareholders || [])) {
      const k = r.insti_name;
      if (!instis.has(k)) instis.set(k, { total: 0, change: 0, contacts: [] });
      const e = instis.get(k)!;
      e.total = Math.max(e.total, Number(r.total_holding) || 0);
      e.change = Number(r.change_in_percentage) || 0;
      // Collect fund manager contacts from Fund rows
      if (r.type === 'Fund' && r.person_names?.length) {
        for (let i = 0; i < r.person_names.length; i++) {
          const name = r.person_names[i];
          const email = r.person_emails?.[i] || null;
          if (name && !e.contacts.find(c => c.name === name)) {
            e.contacts.push({ name, email, fund: r.fund_name || '' });
          }
        }
      }
    }
    const topInstis = [...instis.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([name, v]) => ({
        name,
        total: v.total,
        change: (v.change * 100).toFixed(2) + '%',
        key_contacts: v.contacts.slice(0, 3).map(c => ({
          name: c.name,
          email: c.email || 'n/a',
          fund: c.fund,
        })),
      }));

    // Find holders in peers but NOT in this entity
    const myHolders = new Set(topInstis.map(i => i.name.toLowerCase()));
    const peerOnlyHolders: { holder: string; peers: string[] }[] = [];
    const holderPeerMap = new Map<string, string[]>();
    for (const pd of peerData) {
      for (const h of pd.topHolders as { insti_name: string }[]) {
        if (!myHolders.has(h.insti_name?.toLowerCase())) {
          if (!holderPeerMap.has(h.insti_name)) holderPeerMap.set(h.insti_name, []);
          holderPeerMap.get(h.insti_name)!.push(pd.entity.pretty_name);
        }
      }
    }
    for (const [holder, peers] of holderPeerMap) {
      peerOnlyHolders.push({ holder, peers });
    }

    // Build cache key from entity id + stale cutoff
    const cacheKey = `summary:v2:${entity.id ?? 'unknown'}:${cutoff ?? 'all'}`;
    const cached = await redis.get<string>(cacheKey).catch(() => null);
    if (cached) return NextResponse.json({ html: cached });

    const entityName = entity?.pretty_name || entity?.short_name || 'the company';
    const ticker = entity?.bloomberg_ticker || '';
    const country = entity?.country || 'N/A';
    const sector = entity?.sector || 'N/A';

    const prompt = `You are a senior Investor Relations analyst at Smartkarma. Produce a structured HTML report based on the shareholding data below.

Return ONLY valid HTML (no markdown, no \`\`\`html fences) using this structure:
- Use <h3> for section headings
- Use <ul><li> for bullet points
- Use <strong> for emphasis
- Use <span class="positive"> for positive signals and <span class="negative"> for risks
- Use <p> for paragraphs
- Keep it concise — max 600 words total

Start the report with this exact header block:
<p><strong>Smartkarma Shareholder Registry Analysis</strong></p>
<p><strong>${entityName}</strong>${ticker ? ` &nbsp;·&nbsp; <span style="font-family:monospace">${ticker}</span>` : ''} &nbsp;·&nbsp; ${country} &nbsp;·&nbsp; ${sector}</p>

Then include these sections:
1. <h3>Ownership Overview</h3> — brief snapshot of ownership concentration and structure
2. <h3>Notable Changes</h3> — who increased/decreased and what it signals
3. <h3>Peer Comparison</h3> — which institutions own peers but not ${entityName}, and why that matters
4. <h3>IR Opportunities</h3> — bulleted list of specific institutions to target, ranked by priority. For each bullet include:
   - Institution name and why they are a priority
   - If key_contacts are available: list the specific people to reach out to, formatted as: <strong>[Name]</strong> (<a href="mailto:[email]">[email]</a>) — [fund name]. If email is "n/a", omit the mailto link.
   - One-line outreach rationale
5. <h3>Recommended Next Steps</h3> — concrete IR actions (roadshows, outreach, messaging)

DATA:

ENTITY: ${entityName} | Ticker: ${ticker} | Sector: ${sector} | Country: ${country}

TOP 10 INSTITUTIONAL HOLDERS OF ${entityName.toUpperCase()} (includes key fund manager contacts where available):
${JSON.stringify(topInstis, null, 2)}

PEER COMPANIES AND THEIR TOP SHAREHOLDERS:
${peerData.map(p => `\n${p.entity.pretty_name} (${p.entity.bloomberg_ticker}):\n${JSON.stringify(p.topHolders.slice(0, 8), null, 2)}`).join('\n')}

INSTITUTIONS HOLDING PEERS BUT NOT ${entityName.toUpperCase()}:
${JSON.stringify(peerOnlyHolders.slice(0, 15), null, 2)}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const html = result.response.text()
      .replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

    await redis.set(cacheKey, html, { ex: CACHE_TTL }).catch(() => {});

    return NextResponse.json({ html });
  } catch (err) {
    console.error('Summarize error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
