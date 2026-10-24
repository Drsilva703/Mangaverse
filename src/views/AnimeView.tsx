import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Film, Heart, Search, Trash2 } from 'lucide-react';
import { AnimeCard } from '../components/AnimeCard';
import {
  fetchAnimes,
  fetchAnime,
  fetchAnimeEpisodes,
  getAnimeLibrary,
  saveAnimeLibraryItem,
  removeAnimeLibraryItem,
  ANIME_LIBRARY_EVENT,
} from '../services/animeService';
import {
  Anime,
  AnimeLibraryItem,
  AnimeStatus,
  AnimeCatalogMode,
  AnimeEpisode,
  ANIME_STATUSES,
} from '../types/anime';

const panel = 'rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5';
const button =
  'rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white disabled:opacity-40';
const input =
  'rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-indigo-500';
const grid =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5';

function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className={`${panel} border-amber-800/60 text-amber-200`}>
      <p>{message}</p>
      {retry && (
        <button className={`${button} mt-3`} onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function AnimeView({ onSelect }: { onSelect: (anime: Anime) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<AnimeCatalogMode>('popular');
  const [seasonal, setSeasonal] = useState<Anime[]>([]);
  const [seasonalError, setSeasonalError] = useState('');
  const [seasonalLoading, setSeasonalLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetchAnimes('', 1, controller.signal, 'seasonal')
      .then((data) => setSeasonal(data.items))
      .catch((error) => {
        if (!controller.signal.aborted) setSeasonalError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSeasonalLoading(false);
      });
    return () => controller.abort();
  }, []);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Anime[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setItems([]);
    fetchAnimes(search, page, controller.signal, mode)
      .then((data) => {
        setItems(data.items);
        setHasNext(data.hasNextPage);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, page, retry, mode]);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-zinc-100">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-zinc-950 border border-indigo-800/40 p-6 sm:p-10 mb-8">
        <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Film className="w-4 h-4" /> Universo Anime
        </span>
        <h1 className="text-3xl sm:text-5xl font-black mt-4">
          Sua próxima história
          <br />
          <span className="text-indigo-300">começa aqui.</span>
        </h1>
        <p className="mt-4 text-zinc-300 max-w-xl">
          Explore animes, descubra novas histórias e acompanhe seus favoritos.
          Informações e trailers oficiais, com catálogo Tenrai.
        </p>
        <p className="mt-3 text-xs text-zinc-400">
          Os episódios completos não são disponibilizados nesta seção.
        </p>
      </div>
      <form
        className="flex gap-2 mb-6"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query.trim());
        }}
      >
        <label className="sr-only" htmlFor="anime-search">
          Buscar animes por nome
        </label>
        <input
          id="anime-search"
          type="search"
          maxLength={300}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Qual anime você procura?"
          className={`${input} flex-1 min-w-0`}
        />
        <button className={`${button} flex items-center gap-2`} type="submit">
          <Search className="w-4 h-4" />
          <span>Buscar</span>
        </button>
      </form>
      <div
        className="flex flex-wrap gap-2 mb-6"
        role="group"
        aria-label="Catálogo de animes"
      >
        {(
          [
            ['popular', 'Mais populares'],
            ['seasonal', 'Temporada atual'],
            ['ranked', 'Ranking geral'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={!search && mode === value}
            className={`${button} ${search || mode !== value ? 'bg-zinc-800 hover:bg-zinc-700' : ''}`}
            onClick={() => {
              setMode(value);
              setQuery('');
              setSearch('');
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {!search && mode === 'popular' && page === 1 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Destaques da temporada</h2>
          {seasonalLoading ? (
            <p role="status" className="text-zinc-400">
              Carregando destaques…
            </p>
          ) : seasonalError ? (
            <p className="text-zinc-400">
              Os destaques estão indisponíveis. Use a aba Temporada atual para
              tentar novamente.
            </p>
          ) : seasonal.length ? (
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
              {seasonal.slice(0, 8).map((anime) => (
                <div
                  key={anime.id}
                  className="w-40 sm:w-48 shrink-0 snap-start"
                >
                  <AnimeCard anime={anime} onSelect={onSelect} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400">
              Nenhum destaque disponível nesta temporada.
            </p>
          )}
        </div>
      )}
      {loading ? (
        <p role="status" className={panel}>
          Carregando animes…
        </p>
      ) : error ? (
        <ErrorNotice
          message={error}
          retry={() => setRetry((value) => value + 1)}
        />
      ) : items.length === 0 ? (
        <p role="status" className={panel}>
          Nenhum anime encontrado. Tente outro nome.
        </p>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">
            {search
              ? `Resultados para “${search}”`
              : {
                  popular: 'Mais populares',
                  seasonal: 'Temporada atual',
                  ranked: 'Ranking geral',
                }[mode]}
          </h2>
          <div className={grid}>
            {items.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onSelect={onSelect} />
            ))}
          </div>
        </>
      )}
      {!loading && !error && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            className={button}
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </button>
          <span className="text-sm">Página {page}</span>
          <button
            className={button}
            disabled={!hasNext}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </button>
        </div>
      )}
      <p className="text-xs text-zinc-500 mt-8">
        Dados do MyAnimeList, fornecidos pela Tenrai. A disponibilidade de
        sinopses, episódios e trailers varia conforme o título.
      </p>
    </section>
  );
}

export function AnimeDetailsView({
  anime: initial,
  onBack,
}: {
  anime: Anime;
  onBack: () => void;
}) {
  const [anime, setAnime] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [stored, setStored] = useState(() =>
    getAnimeLibrary().find((item) => item.anime.id === initial.id),
  );
  const [storageError, setStorageError] = useState('');
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [episodePage, setEpisodePage] = useState(1);
  const [episodesNext, setEpisodesNext] = useState(false);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [episodesError, setEpisodesError] = useState('');
  const [episodesRetry, setEpisodesRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEpisodesLoading(true);
    setEpisodesError('');
    setEpisodes([]);
    fetchAnimeEpisodes(initial.id, episodePage, controller.signal)
      .then((data) => {
        setEpisodes(data.items);
        setEpisodesNext(data.hasNextPage);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setEpisodesError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEpisodesLoading(false);
      });
    return () => controller.abort();
  }, [initial.id, episodePage, episodesRetry]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAnime(initial.id, controller.signal)
      .then(setAnime)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initial.id, retry]);
  const update = (patch: Partial<AnimeLibraryItem>) => {
    const next = {
      status: 'plan_to_watch' as AnimeStatus,
      favorite: false,
      watchedEpisodes: 0,
      ...stored,
      ...patch,
      anime,
    };
    try {
      saveAnimeLibraryItem(next);
      setStored(next);
      setStorageError('');
    } catch {
      setStorageError(
        'Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões de armazenamento.',
      );
    }
  };
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-zinc-100">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        <aside>
          {anime.image ? (
            <img
              src={anime.image}
              alt={`Capa de ${anime.title}`}
              className="w-60 max-w-full rounded-2xl border border-zinc-800"
            />
          ) : (
            <div className="w-60 aspect-[2/3] rounded-2xl bg-zinc-900 flex items-center justify-center">
              <Film className="w-12 h-12 text-zinc-600" />
            </div>
          )}
        </aside>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Anime • Tenrai
          </p>
          <h1 className="text-3xl sm:text-4xl font-black mt-2 mb-3">
            {anime.title}
          </h1>
          <p className="text-zinc-400 text-sm">
            {[
              anime.year,
              anime.status,
              anime.score !== null ? `★ ${anime.score.toFixed(1)}` : null,
              anime.episodeCount ? `${anime.episodeCount} episódios` : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </p>
          <div className="flex flex-wrap gap-2 my-4">
            {anime.genres.map((genre) => (
              <span
                className="text-xs text-indigo-200 bg-indigo-500/15 rounded-full px-3 py-1"
                key={genre}
              >
                {genre}
              </span>
            ))}
          </div>
          {anime.studios.length > 0 && (
            <p className="text-sm text-zinc-400 mb-4">
              Estúdio: {anime.studios.join(', ')}
            </p>
          )}
          <p className="text-zinc-300 whitespace-pre-line leading-relaxed">
            {anime.synopsis ||
              (loading
                ? 'Carregando sinopse…'
                : 'Sinopse não disponível para este título.')}
          </p>
          <div className={`${panel} mt-6 space-y-4`}>
            <div className="flex flex-wrap gap-3">
              <button
                className={`${button} flex items-center gap-2`}
                onClick={() => update({})}
              >
                <Bookmark className="w-4 h-4" />
                {stored ? 'Salvo na biblioteca' : 'Adicionar à biblioteca'}
              </button>
              <button
                aria-pressed={stored?.favorite ?? false}
                className="flex items-center gap-2 border border-zinc-700 rounded-xl px-4 py-2 text-sm"
                onClick={() => update({ favorite: !stored?.favorite })}
              >
                <Heart
                  className={`w-4 h-4 ${stored?.favorite ? 'fill-pink-400 text-pink-400' : ''}`}
                />
                Favorito
              </button>
            </div>
            <label className="flex flex-wrap items-center gap-3 text-sm">
              Acompanhamento
              <select
                className={input}
                value={stored?.status ?? 'plan_to_watch'}
                onChange={(event) =>
                  update({ status: event.target.value as AnimeStatus })
                }
              >
                {Object.entries(ANIME_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-wrap items-center gap-3 text-sm">
              Episódios assistidos
              <input
                aria-label="Episódios assistidos"
                type="number"
                min={0}
                max={anime.episodeCount ?? undefined}
                className={`${input} w-24`}
                value={stored?.watchedEpisodes ?? 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 0)
                    update({
                      watchedEpisodes: Math.min(
                        value,
                        anime.episodeCount ?? value,
                      ),
                    });
                }}
              />
            </label>
            <p className="text-xs text-zinc-500">
              Seu progresso fica salvo apenas neste navegador.
            </p>
            {storageError && (
              <p role="alert" className="text-amber-300 text-sm">
                {storageError}
              </p>
            )}
          </div>
        </div>
      </div>
      {loading && (
        <p role="status" className="my-6 text-zinc-400">
          Carregando detalhes…
        </p>
      )}
      {error && (
        <div className="my-6">
          <ErrorNotice
            message={error}
            retry={() => setRetry((value) => value + 1)}
          />
        </div>
      )}
      {!loading && !error && (
        <>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Trailer oficial</h2>
            {anime.trailerId ? (
              <iframe
                className="w-full aspect-video max-w-4xl rounded-2xl border border-zinc-800"
                src={`https://www.youtube-nocookie.com/embed/${anime.trailerId}`}
                title={`Trailer de ${anime.title}`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <p className="text-zinc-400">
                Trailer não disponível para este título.
              </p>
            )}
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-2">Episódios</h2>
            <p className="text-xs text-zinc-500 mb-4">
              Lista informativa. Não há reprodução de episódios completos.
            </p>
            {episodesLoading ? (
              <p role="status" className="text-zinc-400">
                Carregando episódios…
              </p>
            ) : episodesError ? (
              <ErrorNotice
                message={episodesError}
                retry={() => setEpisodesRetry((value) => value + 1)}
              />
            ) : episodes.length ? (
              <ol className="divide-y divide-zinc-800">
                {episodes.map((episode, index) => (
                  <li
                    key={`${episode.number}-${index}`}
                    className="py-4 flex items-start gap-4"
                  >
                    <span className="text-indigo-400 font-bold w-10 shrink-0">
                      {episode.number}
                    </span>
                    <div>
                      <p>{episode.title}</p>
                      {episode.aired && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {Number.isNaN(Date.parse(episode.aired))
                            ? episode.aired
                            : new Date(episode.aired).toLocaleDateString(
                                'pt-BR',
                                { timeZone: 'UTC' },
                              )}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-zinc-400">
                A lista de episódios não foi disponibilizada para este título.
              </p>
            )}
            {!episodesLoading &&
              !episodesError &&
              (episodePage > 1 || episodesNext) && (
                <div className="flex items-center gap-4 mt-4">
                  <button
                    className={button}
                    disabled={episodePage === 1}
                    onClick={() => setEpisodePage((value) => value - 1)}
                  >
                    Episódios anteriores
                  </button>
                  <span className="text-sm">Página {episodePage}</span>
                  <button
                    className={button}
                    disabled={!episodesNext}
                    onClick={() => setEpisodePage((value) => value + 1)}
                  >
                    Próximos episódios
                  </button>
                </div>
              )}
          </div>
        </>
      )}
    </section>
  );
}

export function AnimeLibraryView({
  onSelect,
  onExplore,
}: {
  onSelect: (anime: Anime) => void;
  onExplore: () => void;
}) {
  const [items, setItems] = useState(getAnimeLibrary);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => setItems(getAnimeLibrary());
    window.addEventListener(ANIME_LIBRARY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ANIME_LIBRARY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const filtered = items.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'favorites' ? item.favorite : item.status === filter),
  );
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 text-zinc-100">
      <h1 className="text-2xl font-bold mb-2">Minha biblioteca de animes</h1>
      <p className="text-zinc-400 text-sm mb-5">
        Favoritos e progresso de episódios salvos neste navegador.
      </p>
      <label className="flex items-center gap-3 mb-6 text-sm">
        Mostrar
        <select
          className={input}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="favorites">Favoritos</option>
          {Object.entries(ANIME_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && <ErrorNotice message={error} />}
      {filtered.length === 0 ? (
        <div className={`${panel} text-center`}>
          <Film className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <p className="mb-4">
            {items.length
              ? 'Nenhum anime neste filtro.'
              : 'Sua próxima história ainda está por descobrir.'}
          </p>
          <button className={button} onClick={onExplore}>
            Explorar animes
          </button>
        </div>
      ) : (
        <div className={grid}>
          {filtered.map((item) => (
            <div key={item.anime.id}>
              <AnimeCard anime={item.anime} onSelect={onSelect} />
              <p className="text-xs text-indigo-300 mt-2">
                {ANIME_STATUSES[item.status]}
                {item.favorite ? ' • ♥' : ''}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {item.watchedEpisodes}
                {item.anime.episodeCount
                  ? ` / ${item.anime.episodeCount}`
                  : ''}{' '}
                episódios assistidos
              </p>
              <button
                aria-label={`Remover ${item.anime.title} da biblioteca`}
                className="text-xs text-zinc-400 hover:text-red-400 flex gap-1 mt-3 items-center"
                onClick={() => {
                  try {
                    removeAnimeLibraryItem(item.anime.id);
                    setError('');
                  } catch {
                    setError(
                      'Não foi possível remover o anime do armazenamento deste navegador.',
                    );
                  }
                }}
              >
                <Trash2 className="w-3 h-3" />
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
