import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const res = await fetch(
      `${process.env.SK_API_BASE}/entities/${slug}/smart-peers?`,
      {
        headers: {
          'Authorization': `Token token="${process.env.SK_API_TOKEN}", email="${process.env.SK_API_EMAIL}"`,
          'API-TOKEN': process.env.SK_API_HEADER_TOKEN!,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();

    // Normalize JSON:API format — attributes use hyphenated keys
    const items: unknown[] = Array.isArray(data) ? data : (data?.data || []);
    const normalized = items.map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const attrs = (i.attributes || {}) as Record<string, unknown>;
      return {
        id: i.id,
        pretty_name: attrs['pretty-name'] || attrs['short-name'] || '',
        short_name: attrs['short-name'] || '',
        slug: attrs['slug'] || '',
        bloomberg_ticker: attrs['unique-ticker'] || attrs['security'] || '',
        country: attrs['country'] || '',
        sector: attrs['sector'] || '',
      };
    });

    return NextResponse.json(normalized);
  } catch (err) {
    console.error('Peers fetch error:', err);
    return NextResponse.json([]);
  }
}
