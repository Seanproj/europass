/**
 * e2e용 모의 클라우드 서버: src/cloud/memoryCloud.ts(서버 동작 흉내)를 HTTP로 감싼다.
 *   tsx scripts/mock-cloud.ts [port]   (기본 5199)
 * 앱은 VITE_CLOUD_MOCK_URL=http://localhost:5199로 띄우면 이 서버를 쓴다 (playwright.config.ts의 cloud 프로젝트)
 */
import { createServer, type IncomingMessage } from 'node:http';
import { createHash } from 'node:crypto';
import { MemoryCloud } from '../src/cloud/memoryCloud.ts';
import { HandleTakenError } from '../src/cloud/types.ts';

const port = Number(process.argv[2] ?? 5199);
let cloud = new MemoryCloud();

async function body(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', req.headers.origin ?? '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  const url = new URL(req.url ?? '/', 'http://x');
  const json = (data: unknown) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(data ?? null));
  };
  try {
    if (url.pathname === '/photo') {
      const path = url.searchParams.get('path') ?? '';
      if (req.method === 'PUT') {
        cloud.upload(path, new Uint8Array(await body(req)), String(req.headers['content-type'] ?? ''));
        return json({ ok: true });
      }
      const p = cloud.download(path);
      res.setHeader('content-type', p.type);
      return res.end(Buffer.from(p.bytes));
    }
    if (url.pathname.startsWith('/public/')) {
      return json(cloud.publicProfile(decodeURIComponent(url.pathname.slice('/public/'.length))));
    }
    if (url.pathname === '/health') return json({ ok: true });
    if (url.pathname === '/reset') {
      cloud = new MemoryCloud();
      return json({ ok: true });
    }
    const b = JSON.parse((await body(req)).toString() || '{}');
    switch (url.pathname) {
      case '/login': {
        const id = `user-${createHash('sha1').update(String(b.email)).digest('hex').slice(0, 12)}`;
        return json({ id, email: b.email });
      }
      case '/pull':
        return json(cloud.pull(b.userId, b.cursor));
      case '/push':
        cloud.push(b.userId, b.rows);
        return json({ ok: true });
      case '/profile/get':
        return json(cloud.getProfile(b.userId));
      case '/profile/put':
        cloud.putProfile(b.userId, b.profile);
        return json({ ok: true });
      case '/public-settings/get':
        return json(cloud.getPublicSettings(b.userId));
      case '/public-settings/put':
        cloud.setPublicSettings(b.userId, b.settings);
        return json({ ok: true });
    }
    res.statusCode = 404;
    res.end();
  } catch (err) {
    res.statusCode = err instanceof HandleTakenError ? 409 : 500;
    res.end(String(err));
  }
});

server.listen(port, () => console.log(`mock cloud: http://localhost:${port}`));
