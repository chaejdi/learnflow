export const dynamic = 'force-dynamic';

export async function GET() {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  };

  return Response.json(status);
}
