export const MOVIE_GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Sports",
  "Thriller",
  "War",
  "Western"
];

export function getMovieGenreList(movie) {
  const rawGenres = Array.isArray(movie?.genres)
    ? movie.genres
    : typeof movie?.genre === "string"
      ? movie.genre.split(",")
      : [];

  return Array.from(
    new Set(
      rawGenres
        .filter((genre) => typeof genre === "string")
        .map((genre) => genre.trim())
        .filter(Boolean)
    )
  );
}

export function getMovieGenreLabel(movie) {
  const genres = getMovieGenreList(movie);
  return genres.join(", ");
}

export function shouldShowMovieRating(movie) {
  return movie?.status === "currently_running" && typeof movie?.rating === "string" && movie.rating.trim().length > 0;
}

export function filterMoviesBySearchAndGenre(movies, searchQuery, selectedGenre) {
  let result = Array.isArray(movies) ? movies : [];

  const normalizedSearch = String(searchQuery ?? "").trim().toLowerCase();
  if (normalizedSearch) {
    result = result.filter((movie) => String(movie?.title ?? "").toLowerCase().includes(normalizedSearch));
  }

  if (selectedGenre && selectedGenre !== "all") {
    result = result.filter((movie) => getMovieGenreList(movie).includes(selectedGenre));
  }

  return result;
}

export function getMovieGenres(movies) {
  return Array.from(
    new Set((Array.isArray(movies) ? movies : []).flatMap((movie) => getMovieGenreList(movie)))
  ).sort();
}

export function splitMoviesByStatus(movies) {
  const source = Array.isArray(movies) ? movies : [];
  return {
    currentlyRunning: source.filter((movie) => movie?.status === "currently_running"),
    comingSoon: source.filter((movie) => movie?.status === "coming_soon")
  };
}

export function formatDurationLabel(hoursValue, minutesValue) {
  if (!hoursValue && !minutesValue) {
    return "";
  }

  const hours = Number(hoursValue || 0);
  const minutes = Number(minutesValue || 0);
  return `${hours}h ${minutes}m`;
}
