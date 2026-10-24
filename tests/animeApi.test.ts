import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import { animeRouter, youtubeId } from '../src/server/animeApi';

const nativeFetch = globalThis.fetch;
const calls: string[] = [];
const anime = {
  mal_id: 1,
  title: 'Cowboy Bebop',
  episodes: 26,
  score: null,
  images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/cover.jpg' } },
  trailer: { youtube_id: 'gY5nDXOtv_o' },
  genres: [],
  studios: [],
};
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith('https://api.tenrai.org/'))
    return nativeFetch(input, init);
  calls.push(url);
  if (url.includes('/anime/404')) return Response.json({}, { status: 404 });
  if (url.includes('/anime/500')) return Response.json({ data: null });
  if (url.includes('/anime/429'))
    return Response.json({}, { status: 429, headers: { 'Retry-After': '2' } });
  if (url.includes('/episodes'))
    return Response.json({
      data: [{ mal_id: 1, title: 'Asteroid Blues', aired: null }],
      pagination: { has_next_page: true },
    });
  if (/\/anime\/\d+$/.test(url)) return Response.json({ data: anime });
  return Response.json({ data: [anime], pagination: { has_next_page: true } });
};
const app = express();
app.use('/api/anime', animeRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const address = server.address() as import('node:net').AddressInfo;
const get = (path: string) =>
  nativeFetch(`http://127.0.0.1:${address.port}/api/anime${path}`);
after(() => {
  globalThis.fetch = nativeFetch;
  server.close();
});

test('catalogue routes select documented popular, seasonal, ranked and encoded search endpoints', async () => {
  for (const [query, expected] of [
    ['?mode=popular', '/top/anime?page=1&limit=24&filter=bypopularity'],
    ['?mode=seasonal&page=2', '/seasons/now?page=2&limit=24'],
    ['?mode=ranked', '/top/anime?page=1&limit=24'],
    ['?q=One%20%26%20Piece', '/anime?page=1&limit=24&q=One+%26+Piece'],
  ]) {
    const response = await get(query);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.items[0].id, '1');
    assert.equal(data.items[0].score, null);
    assert.equal(data.hasNextPage, true);
    assert.ok(calls.at(-1)?.endsWith(expected));
  }
});

test('invalid resource IDs and query values never reach the provider', async () => {
  const count = calls.length;
  for (const path of [
    '/no-id',
    '/0',
    '?page=-1',
    '?page=1.5',
    '?page=20001',
    '?mode=invalid',
    '?q=a&q=b',
    '/1/episodes?page=0',
  ]) {
    assert.equal((await get(path)).status, 400);
  }
  assert.equal(calls.length, count);
});

test('details normalize nullable fields and repeated requests use cache', async () => {
  const response = await get('/1');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.title, 'Cowboy Bebop');
  assert.equal(data.trailerId, 'gY5nDXOtv_o');
  assert.equal(data.year, null);
  const count = calls.length;
  await get('/1');
  assert.equal(calls.length, count);
});

test('episodes are fetched separately and retain pagination', async () => {
  const response = await get('/1/episodes?page=2');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.items, [
    { number: 1, title: 'Asteroid Blues', aired: null },
  ]);
  assert.equal(data.hasNextPage, true);
  assert.ok(calls.at(-1)?.endsWith('/anime/1/episodes?page=2'));
});

test('not found and malformed provider data return actionable errors', async () => {
  assert.equal((await get('/404')).status, 404);
  const response = await get('/500');
  assert.equal(response.status, 502);
  assert.equal(typeof (await response.json()).error, 'string');
});

test('trailer URLs cannot point an iframe to arbitrary hosts or scripts', () => {
  assert.equal(youtubeId('https://youtu.be/gY5nDXOtv_o'), 'gY5nDXOtv_o');
  assert.equal(
    youtubeId('https://www.youtube.com/watch?v=gY5nDXOtv_o'),
    'gY5nDXOtv_o',
  );
  assert.equal(
    youtubeId('https://youtube.com.evil.test/watch?v=gY5nDXOtv_o'),
    null,
  );
  assert.equal(youtubeId('javascript:alert(1)'), null);
});

test('rate limiting propagates Retry-After and suppresses calls during cooldown', async () => {
  const response = await get('/429');
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '2');
  const count = calls.length;
  assert.equal((await get('/999')).status, 429);
  assert.equal(calls.length, count);
});
