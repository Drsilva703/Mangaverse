import React from 'react';
import { Film, Star } from 'lucide-react';
import type { Anime } from '../types/anime';

export function AnimeCard({
  anime,
  onSelect,
}: {
  anime: Anime;
  onSelect: (anime: Anime) => void;
}) {
  return (
    <button
      onClick={() => onSelect(anime)}
      className="group block w-full text-left min-w-0 focus-visible:outline-2 focus-visible:outline-indigo-400 rounded-2xl"
    >
      <div className="aspect-[2/3] rounded-2xl overflow-hidden relative bg-zinc-900 border border-zinc-800">
        <Film
          aria-hidden="true"
          className="w-12 h-12 text-zinc-600 absolute inset-0 m-auto"
        />
        {anime.image && (
          <img
            src={anime.image}
            alt={anime.title}
            loading="lazy"
            className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
        {anime.score !== null && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/80 text-amber-300 px-2 py-1 text-xs font-bold">
            <Star className="w-3 h-3" />
            {anime.score.toFixed(1)}
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10 text-xs text-zinc-200">
          {[
            anime.year,
            anime.episodeCount ? `${anime.episodeCount} episódios` : null,
          ]
            .filter(Boolean)
            .join(' • ')}
        </div>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-white line-clamp-2 group-hover:text-indigo-300">
        {anime.title}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 truncate">
        {anime.genres.join(' • ')}
      </p>
    </button>
  );
}
