import { Router } from 'express';
import type { Anime, AnimeEpisode } from '../types/anime';

const BASE_URL = 'https://api.tenrai.org/v1';
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<
  string,
  { expires: number; data: unknown; etag: string | null }
>();
const pending = new Map<string, Promise<any>>();
let queue: Promise<unknown> = Promise.resolve();
let nextRequest = 0;
let retryAfter = 0;

class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const names = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item : text(item?.name)))
        .filter(Boolean)
    : [];

export function youtubeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    let id: string | null = null;
    if (
      ['youtube.com', 'www.youtube.com', 'www.youtube-nocookie.com'].includes(
        url.hostname,
      )
    ) {
      id =
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1] ||
        null;
    } else if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function imageUrl(value: unknown): string {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

/** Tenrai's documented Jikan v4 schema; nullable MAL fields remain nullable. */
export function normalizeAnime(raw: any): Anime {
  if (
    !raw ||
    !Number.isInteger(raw.mal_id) ||
    raw.mal_id <= 0 ||
    !text(raw.title)
  ) {
    throw new Error('Unexpected Tenrai anime format');
  }
  return {
    id: String(raw.mal_id),
    title: raw.title,
    image: imageUrl(
      raw.images?.webp?.large_image_url || raw.images?.jpg?.large_image_url,
    ),
    synopsis: text(raw.synopsis),
    score: number(raw.score),
    genres: names(raw.genres),
    studios: names(raw.studios),
    year: number(raw.year),
    season: text(raw.season),
    status: text(raw.status),
    episodeCount: number(raw.episodes),
    trailerId:
      raw.trailer?.embeddable === false
        ? null
        : youtubeId(raw.trailer?.youtube_id ?? raw.trailer?.url),
  };
}

function normalizeEpisode(raw: any): AnimeEpisode {
  if (!raw || !Number.isInteger(raw.mal_id) || raw.mal_id <= 0)
    throw new Error('Unexpected Tenrai episode format');
  return {
    number: raw.mal_id,
    title: text(raw.title) || `Episódio ${raw.mal_id}`,
    aired: text(raw.aired) || null,
  };
}

async function upstream(path: string): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.data;
  if (pending.has(url)) return pending.get(url);
  if (pending.size >= 30)
    throw new ProviderError(503, 'Tenrai request queue is full');
  const task = queue
    .catch(() => {})
    .then(async () => {
      if (retryAfter > Date.now())
        throw new ProviderError(429, 'Tenrai rate limit cooldown');
      // Serial pacing stays below both public limits (4/sec and 120/min).
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, nextRequest - Date.now())),
      );
      nextRequest = Date.now() + 550;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (cached?.etag) headers['If-None-Match'] = cached.etag;
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 304 && cached) {
        cached.expires = Date.now() + CACHE_TTL;
        return cached.data;
      }
      if (response.status === 429) {
        const seconds = Number(response.headers.get('Retry-After'));
        retryAfter =
          Date.now() +
          (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000;
      }
      if (!response.ok)
        throw new ProviderError(
          response.status,
          `Tenrai returned HTTP ${response.status}`,
        );
      const data = await response.json();
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(url, {
        data,
        expires: Date.now() + CACHE_TTL,
        etag: response.headers.get('ETag'),
      });
      return data;
    });
  queue = task;
  pending.set(url, task);
  try {
    return await task;
  } finally {
    pending.delete(url);
  }
}

function pageNumber(value: unknown): number | null {
  const page =
    value === undefined
      ? 1
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  return Number.isInteger(page) && page >= 1 && page <= 20000 ? page : null;
}

function providerFailure(error: unknown, res: import('express').Response) {
  console.error(
    'Tenrai request failed:',
    error instanceof Error ? error.message : 'unknown error',
  );
  if (error instanceof ProviderError && error.status === 404) {
    return res
      .status(404)
      .json({ error: 'Este anime não foi encontrado no catálogo.' });
  }
  if (error instanceof ProviderError && error.status === 429) {
    const seconds = Math.max(1, Math.ceil((retryAfter - Date.now()) / 1000));
    return res
      .status(429)
      .set('Retry-After', String(seconds))
      .json({
        error: `O catálogo recebeu muitas consultas. Tente novamente em ${seconds} segundos.`,
      });
  }
  return res
    .status(502)
    .json({
      error:
        'O catálogo de animes está indisponível no momento. Tente novamente em instantes.',
    });
}

export const animeRouter = Router();

animeRouter.get('/', async (req, res) => {
  const page = pageNumber(req.query.page);
  const q =
    req.query.q === undefined
      ? ''
      : typeof req.query.q === 'string'
        ? req.query.q.trim()
        : null;
  const mode = req.query.mode ?? 'popular';
  if (
    !page ||
    q === null ||
    q.length > 300 ||
    !['popular', 'seasonal', 'ranked'].includes(String(mode))
  ) {
    return res.status(400).json({ error: 'Busca, filtro ou página inválida.' });
  }
  try {
    const params = new URLSearchParams({ page: String(page), limit: '24' });
    let path = '/top/anime';
    if (q) {
      path = '/anime';
      params.set('q', q);
    } else if (mode === 'seasonal') path = '/seasons/now';
    else if (mode === 'popular') params.set('filter', 'bypopularity');
    const payload = await upstream(`${path}?${params}`);
    if (!Array.isArray(payload.data))
      throw new Error('Unexpected Tenrai list format');
    return res.json({
      items: payload.data.map(normalizeAnime),
      hasNextPage: payload.pagination?.has_next_page === true,
    });
  } catch (error) {
    return providerFailure(error, res);
  }
});

animeRouter.get('/:id/episodes', async (req, res) => {
  const page = pageNumber(req.query.page);
  if (!/^[1-9]\d{0,9}$/.test(req.params.id) || !page)
    return res.status(400).json({ error: 'Anime ou página inválida.' });
  try {
    const payload = await upstream(
      `/anime/${req.params.id}/episodes?page=${page}`,
    );
    if (!Array.isArray(payload.data))
      throw new Error('Unexpected Tenrai episode list');
    return res.json({
      items: payload.data.map(normalizeEpisode),
      hasNextPage: payload.pagination?.has_next_page === true,
    });
  } catch (error) {
    return providerFailure(error, res);
  }
});

animeRouter.get('/:id', async (req, res) => {
  if (!/^[1-9]\d{0,9}$/.test(req.params.id))
    return res.status(400).json({ error: 'Anime inválido.' });
  try {
    const payload = await upstream(`/anime/${req.params.id}`);
    return res.json(normalizeAnime(payload.data));
  } catch (error) {
    return providerFailure(error, res);
  }
});
