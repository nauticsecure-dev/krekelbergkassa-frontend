const deny = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
export const GET = deny;
export const POST = deny;
export const PUT = deny;
export const PATCH = deny;
export const DELETE = deny;
export const OPTIONS = deny;
export const HEAD = deny;
