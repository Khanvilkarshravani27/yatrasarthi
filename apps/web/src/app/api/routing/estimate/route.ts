import { NextResponse } from 'next/server';

// GET /api/routing/estimate?from=&to=
// Primary: Google Maps Routes API. Fallback: static heuristic.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'from and to are required' } }, { status: 422 });
  }

  // Try Google Maps Routes API if key is available
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleKey,
          'X-Goog-FieldMask': 'routes.duration',
        },
        body: JSON.stringify({
          origin: { address: from },
          destination: { address: to },
          travelMode: 'DRIVE',
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const durationSec = parseInt(data.routes?.[0]?.duration ?? '0', 10);
        if (durationSec > 0) {
          return NextResponse.json({
            data: { estimatedMin: Math.ceil(durationSec / 60), provider: 'google_routes', fallbackUsed: false },
          });
        }
      }
    } catch {
      // fall through to heuristic
    }
  }

  // Static heuristic fallback: 45 min, flagged as lower confidence
  return NextResponse.json({
    data: { estimatedMin: 45, provider: 'heuristic', fallbackUsed: true },
  });
}
