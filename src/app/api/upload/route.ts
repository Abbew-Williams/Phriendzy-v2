/**
 * app/api/upload/route.ts
 *
 * Proxy that forwards chunked uploads to MediaHost server-side,
 * bypassing CORS completely.
 *
 * Place this file at:  app/api/upload/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Correct full path to api_upload.php on your server ───────────────────────
// Your MediaHost files live in the /upload/ subfolder on app.phriendzy.com
const MEDIAHOST = 'https://app.phriendzy.com/upload/api_upload.php';

export async function POST(req: NextRequest) {
  try {
    // ── Forward chunk metadata headers PHP reads via $_SERVER ─────────────────
    const forward: Record<string, string> = {};

    const passthroughHeaders = [
      'x-chunk-index',
      'x-total-chunks',
      'x-file-id',
      'x-file-name',
      'x-file-type',
      'x-api-key',
    ];

    for (const h of passthroughHeaders) {
      const val = req.headers.get(h);
      if (val !== null) forward[h] = val;
    }

    // ── CRITICAL: forward Content-Type WITH the multipart boundary ────────────
    // Without the boundary string PHP cannot parse $_FILES at all.
    const contentType = req.headers.get('content-type');
    if (contentType) forward['content-type'] = contentType;

    // ── Stream the raw request body straight through ───────────────────────────
    const body = await req.arrayBuffer();

    console.log(`[upload proxy] → POST ${MEDIAHOST} (${body.byteLength} bytes)`);

    const mediaHostRes = await fetch(MEDIAHOST, {
      method:  'POST',
      headers: forward,
      body:    body,
    });

    const text = await mediaHostRes.text();
    console.log(`[upload proxy] ← HTTP ${mediaHostRes.status}, body: ${text.slice(0, 120)}`);

    // ── Always return JSON ─────────────────────────────────────────────────────
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[upload proxy] non-JSON from MediaHost:', text.slice(0, 400));
      return NextResponse.json(
        {
          success: false,
          error:   `MediaHost error (HTTP ${mediaHostRes.status}). Check that the file exists at: ${MEDIAHOST}`,
          raw:     text.slice(0, 400),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(json, { status: mediaHostRes.status });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload proxy] fetch failed:', msg);
    return NextResponse.json(
      { success: false, error: `Proxy could not reach MediaHost: ${msg}` },
      { status: 503 }
    );
  }
}