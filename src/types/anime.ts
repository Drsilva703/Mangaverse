export interface AnimeEpisode {
  number: number;
  title: string;
  aired: string | null;
}

export interface Anime {
  id: string;
  title: string;
  image: string;
  synopsis: string;
  score: number | null;
  genres: string[];
  studios: string[];
  year: number | null;
  season: string;
  status: string;
  episodeCount: number | null;
  trailerId: string | null;
}

export type AnimeStatus = 'plan_to_watch' | 'watching' | 'completed' | 'paused';

export interface AnimeLibraryItem {
  anime: Anime;
  status: AnimeStatus;
  favorite: boolean;
  watchedEpisodes: number;
}

export const ANIME_STATUSES: Record<AnimeStatus, string> = {
  plan_to_watch: 'Quero assistir',
  watching: 'Assistindo',
  completed: 'Concluído',
  paused: 'Pausado',
};

export type AnimeCatalogMode = 'popular' | 'seasonal' | 'ranked';

export interface AnimePage<T> {
  items: T[];
  hasNextPage: boolean;
}
