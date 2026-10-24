import {
  Anime,
  AnimeLibraryItem,
  AnimeCatalogMode,
  AnimeEpisode,
  AnimePage,
} from '../types/anime';

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/anime${path}`, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error || 'Não foi possível carregar os animes. Tente novamente.',
    );
  }
  return response.json();
}

export function fetchAnimes(
  query = '',
  page = 1,
  signal?: AbortSignal,
  mode: AnimeCatalogMode = 'popular',
) {
  return request<AnimePage<Anime>>(
    `?${new URLSearchParams({ q: query, page: String(page), mode })}`,
    signal,
  );
}

export function fetchAnime(id: string, signal?: AbortSignal) {
  return request<Anime>(`/${encodeURIComponent(id)}`, signal);
}

export function fetchAnimeEpisodes(id: string, page = 1, signal?: AbortSignal) {
  return request<AnimePage<AnimeEpisode>>(
    `/${encodeURIComponent(id)}/episodes?page=${page}`,
    signal,
  );
}

const LIBRARY_KEY = 'mangaverse_anime_library_v1';
export const ANIME_LIBRARY_EVENT = 'anime-library-change';

export function getAnimeLibrary(): AnimeLibraryItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    return Array.isArray(data)
      ? data.filter((item) => item?.anime?.id && item?.anime?.title)
      : [];
  } catch {
    return [];
  }
}

export function saveAnimeLibraryItem(item: AnimeLibraryItem) {
  const items = getAnimeLibrary().filter(
    (entry) => entry.anime.id !== item.anime.id,
  );
  localStorage.setItem(LIBRARY_KEY, JSON.stringify([item, ...items]));
  window.dispatchEvent(new Event(ANIME_LIBRARY_EVENT));
}

export function removeAnimeLibraryItem(id: string) {
  localStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify(getAnimeLibrary().filter((item) => item.anime.id !== id)),
  );
  window.dispatchEvent(new Event(ANIME_LIBRARY_EVENT));
}
