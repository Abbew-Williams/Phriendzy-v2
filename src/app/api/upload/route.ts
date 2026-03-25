/**
 * app/api/upload/route.ts
 *
 * Proxy that forwards chunked uploads to MediaHost server-side,
 * bypassing CORS completely.
 *
 * Place this file at:  app/api/upload/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

const MEDIAHOST = 'https://app.phriendzy.com/upload/api_upload.php';

export async function POST(req: NextRequest) {
  try {
    // ── Forward the chunk metadata headers PHP reads via $_SERVER ────────────
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

    // ── CRITICAL: forward Content-Type WITH the multipart boundary ───────────
    // Without the boundary string PHP cannot parse $_FILES at all.
    // The boundary looks like: multipart/form-data; boundary=----WebKitFormBoundaryXYZ
    const contentType = req.headers.get('content-type');
    if (contentType) forward['content-type'] = contentType;

    // ── Stream the raw request body straight through ──────────────────────────
    const body = await req.arrayBuffer();

    const mediaHostRes = await fetch(MEDIAHOST, {
      method:  'POST',
      headers: forward,
      body:    body,
    });

    const text = await mediaHostRes.text();

    // ── Always return JSON — wrap PHP crash HTML if needed ───────────────────
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[upload proxy] MediaHost non-JSON response:', text.slice(0, 400));
      return NextResponse.json(
        {
          success: false,
          error:   `MediaHost server error (HTTP ${mediaHostRes.status}). Check server logs.`,
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
      {
        success: false,
        error:   `Proxy could not reach MediaHost: ${msg}`,
      },
      { status: 503 }
    );
  }
}