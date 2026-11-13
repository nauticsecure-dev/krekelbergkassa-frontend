export function GET() {
  const revision = process.env.QUALITY_BUILD_REVISION;
  return Response.json(revision ? { revision } : {}, {
    status: revision ? 200 : 404,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const dynamic = 'force-dynamic';
