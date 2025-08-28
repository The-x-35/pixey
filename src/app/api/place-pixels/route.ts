import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { verifyAuthToken } from '@/lib/jwt';

type IncomingPixel = { x: number; y: number; color: string };

export async function POST(request: NextRequest) {
  try {
    // Verify JWT authentication
    const authResult = await verifyAuthToken(request);
    if (!authResult.isValid) {
      return NextResponse.json({
        success: false,
        error: authResult.error || 'Authentication required',
      }, { status: 401 });
    }

    const { pixels } = await request.json();
    const wallet_address = authResult.wallet_address; // Get wallet_address from verified JWT

    if (!Array.isArray(pixels) || pixels.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    // Fetch board size
    const settingsResult = await db.query(
      'SELECT board_width, board_height FROM pixey_game_settings WHERE id = 1'
    );
    const boardWidth: number = settingsResult.rows?.[0]?.board_width || 200;
    const boardHeight: number = settingsResult.rows?.[0]?.board_height || 200;

    // Normalize, validate, and de-duplicate pixels within bounds
    const unique = new Map<string, IncomingPixel>();
    for (const p of pixels as IncomingPixel[]) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.color !== 'string') continue;
      if (p.x < 0 || p.x >= boardWidth || p.y < 0 || p.y >= boardHeight) continue;
      // Normalize color to uppercase #RRGGBB
      const color = p.color.startsWith('#') ? p.color.toUpperCase() : `#${p.color.toUpperCase()}`;
      if (!/^#[0-9A-F]{6}$/.test(color)) continue;
      const key = `${p.x},${p.y}`;
      unique.set(key, { x: p.x, y: p.y, color });
    }

    const deduped = Array.from(unique.values());
    if (deduped.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid pixels to place' }, { status: 400 });
    }

    // Cap maximum pixels per bulk request for safety
    if (deduped.length > 50000) {
      return NextResponse.json({ success: false, error: 'Too many pixels in one request' }, { status: 413 });
    }

    const client = await db.getClient();
    try {
      console.log('[bulk-place] start', {
        wallet_address,
        incoming_pixels: pixels.length,
        ip: request.headers.get('x-forwarded-for') || 'n/a'
      });
      await client.query('BEGIN');

      // Lock user row and get free pixel balance
      const userRes = await client.query(
        'SELECT free_pixels FROM pixey_users WHERE wallet_address = $1 FOR UPDATE',
        [wallet_address]
      );
      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }
      const userFree = Number(userRes.rows[0].free_pixels || 0);

      const xs = deduped.map(p => p.x);
      const ys = deduped.map(p => p.y);
      const colors = deduped.map(p => p.color);

      // Compute overwrite vs new counts
      const countRes = await client.query(
        `WITH incoming AS (
           SELECT UNNEST($1::int[]) AS x, UNNEST($2::int[]) AS y, UNNEST($3::text[]) AS color
         ), dedup AS (
           SELECT DISTINCT x, y, color FROM incoming
         ), categorized AS (
           SELECT d.x, d.y, d.color,
                  EXISTS (SELECT 1 FROM pixey_pixels p WHERE p.x_coordinate = d.x AND p.y_coordinate = d.y) AS exists
           FROM dedup d
         )
         SELECT 
           SUM(CASE WHEN exists THEN 1 ELSE 0 END)::int AS overwrites,
           SUM(CASE WHEN exists THEN 0 ELSE 1 END)::int AS news,
           (SELECT COUNT(*) FROM dedup)::int AS total
         FROM categorized;`,
        [xs, ys, colors]
      );

      const overwrites: number = countRes.rows[0].overwrites || 0;
      const news: number = countRes.rows[0].news || 0;
      const total: number = countRes.rows[0].total || deduped.length;
      const cost = news + 2 * overwrites;

      if (cost <= 0) {
        return NextResponse.json({ success: false, error: 'Nothing to place' }, { status: 400 });
      }
      if (userFree < cost) {
        console.warn('[bulk-place] insufficient pixels', { wallet_address, cost, userFree });
        return NextResponse.json({ success: false, error: `Not enough pixels. Need ${cost}, have ${userFree}` }, { status: 400 });
      }

      // Upsert pixels
      await client.query(
        `WITH incoming AS (
           SELECT UNNEST($1::int[]) AS x, UNNEST($2::int[]) AS y, UNNEST($3::text[]) AS color
         ), dedup AS (
           SELECT DISTINCT x, y, color FROM incoming
         )
         INSERT INTO pixey_pixels (x_coordinate, y_coordinate, color, wallet_address)
         SELECT x, y, color, $4 FROM dedup
         ON CONFLICT (x_coordinate, y_coordinate)
         DO UPDATE SET color = EXCLUDED.color, wallet_address = EXCLUDED.wallet_address, placed_at = NOW();`,
        [xs, ys, colors, wallet_address]
      );

      // Insert history
      await client.query(
        `WITH incoming AS (
           SELECT UNNEST($1::int[]) AS x, UNNEST($2::int[]) AS y, UNNEST($3::text[]) AS color
         ), dedup AS (
           SELECT DISTINCT x, y, color FROM incoming
         )
         INSERT INTO pixey_pixel_history (x_coordinate, y_coordinate, new_color, wallet_address)
         SELECT x, y, color, $4 FROM dedup;`,
        [xs, ys, colors, wallet_address]
      );

      // Update user stats
      const updatedUserRes = await client.query(
        `UPDATE pixey_users
           SET free_pixels = free_pixels - $1,
               total_pixels_placed = total_pixels_placed + $2,
               updated_at = NOW()
         WHERE wallet_address = $3
         RETURNING free_pixels;`,
        [cost, total, wallet_address]
      );

      await client.query('COMMIT');

      console.log('[bulk-place] success', {
        wallet_address,
        total,
        overwrites,
        news,
        cost,
        remaining: updatedUserRes.rows[0].free_pixels
      });

      return NextResponse.json({
        success: true,
        data: {
          placed: total,
          overwrites,
          news,
          cost,
          user_pixels_remaining: updatedUserRes.rows[0].free_pixels,
        }
      });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      console.error('[bulk-place] error', err);
      return NextResponse.json({ success: false, error: (err as Error).message || 'Bulk placement failed' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[bulk-place] invalid request', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}


