const DEFAULT_POSTER = "/placeholder.jpg";

function readMediaUrl(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

export function getMoviePosterUrl(movie) {
  return readMediaUrl(movie?.poster) || DEFAULT_POSTER;
}

export function getMovieTrailerUrl(movie) {
  return readMediaUrl(movie?.trailerUrl);
}

export function getMovieTrailerPreviewUrl(movie) {
  return readMediaUrl(movie?.trailerThumbnail) || getMoviePosterUrl(movie);
}

export function isEmbeddableTrailerUrl(url) {
  return (
    url.includes("youtube.com/embed") ||
    url.includes("youtube-nocookie.com/embed") ||
    url.includes("player.vimeo.com/video")
  );
}

export function buildAutoplayTrailerUrl(url) {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("autoplay", "1");
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export function getTrailerMimeType(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();

    if (pathname.endsWith(".mp4")) {
      return "video/mp4";
    }
    if (pathname.endsWith(".m4v")) {
      return "video/x-m4v";
    }
    if (pathname.endsWith(".mov")) {
      return "video/quicktime";
    }
    if (pathname.endsWith(".webm")) {
      return "video/webm";
    }
  } catch {
    return undefined;
  }

  return undefined;
}
