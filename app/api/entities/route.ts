import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const id = request.nextUrl.searchParams.get('id');

  // Lookup by ID (for URL restore)
  if (id) {
    try {
      const result = await pool.query(
        `SELECT e.id, e.pretty_name, e.short_name, e.country, e.sector, e.bloomberg_ticker
         FROM entities e WHERE e.id = $1`,
        [parseInt(id)]
      );
      return NextResponse.json(result.rows[0] || null);
    } catch (err) {
      console.error('Entity lookup error:', err);
      return NextResponse.json(null);
    }
  }

  // Search by name / ticker
  if (!q || q.length < 2) return NextResponse.json([]);
  try {
    const result = await pool.query(
      `SELECT e.id, e.pretty_name, e.short_name, e.country, e.sector, e.bloomberg_ticker
       FROM entities e
       WHERE e.pretty_name ILIKE $1 OR e.bloomberg_ticker ILIKE $1 OR e.short_name ILIKE $1
       LIMIT 20`,
      [`%${q}%`]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Entity search error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
