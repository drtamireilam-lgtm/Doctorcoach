/** Never leave account or workout responses in HTTP caches on shared devices. */
export function privateJson(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'private, no-store');
  return Response.json(data, { ...init, headers });
}
