import { useMemo, useState } from "react";
import { buildAdminIssueReport, getMeaningfulErrorMessage } from "@/services/apiErrorUtils";
import { uploadMovieAssetToStorage } from "@/services/firebaseStorage";
import { formatDurationLabel, getMovieGenres, MOVIE_GENRE_OPTIONS } from "@/models/movie-model";

const initialFormState = {
  title: "",
  genres: [],
  rating: "PG-13",
  status: "coming_soon",
  description: "",
  durationHours: "",
  durationMinutes: "",
  director: "",
  cast: "",
  showtimes: "2:00 PM, 5:00 PM, 8:00 PM"
};

const initialAssetSelection = {
  poster: null,
  trailer: null,
  trailerThumbnail: null
};

const SUPPORTED_POSTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_POSTER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const SUPPORTED_TRAILER_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-m4v"]);
const SUPPORTED_TRAILER_EXTENSIONS = [".mp4", ".mov", ".m4v"];

const ratingOptions = ["G", "PG", "PG-13", "R"];
const durationHourOptions = Array.from({ length: 6 }, (_, idx) => String(idx));
const durationMinuteOptions = Array.from({ length: 12 }, (_, idx) => String(idx * 5));

function toCommaSeparatedList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileMatchesSupportedFormat(file, mimeTypes, extensions) {
  if (!file) {
    return false;
  }

  const type = String(file.type || "").toLowerCase();
  if (type && mimeTypes.has(type)) {
    return true;
  }

  const fileName = String(file.name || "").toLowerCase();
  return extensions.some((extension) => fileName.endsWith(extension));
}

export function useAdminPageController({ movies, onCreateMovie, onDeleteMovie }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState(initialFormState);
  const [assets, setAssets] = useState(initialAssetSelection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMovieId, setDeletingMovieId] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [adminIssueReport, setAdminIssueReport] = useState(null);
  const [copiedIssueReport, setCopiedIssueReport] = useState(false);

  const currentlyRunning = movies.filter((movie) => movie.status === "currently_running").length;
  const comingSoon = movies.filter((movie) => movie.status === "coming_soon").length;

  const selectedDuration = useMemo(
    () => formatDurationLabel(form.durationHours, form.durationMinutes),
    [form.durationHours, form.durationMinutes]
  );

  const genreOptions = useMemo(
    () => Array.from(new Set([...MOVIE_GENRE_OPTIONS, ...getMovieGenres(movies)])).sort(),
    [movies]
  );

  const filteredMovies = useMemo(
    () => (filterStatus === "all" ? movies : movies.filter((movie) => movie.status === filterStatus)),
    [movies, filterStatus]
  );

  const handleChange = (key) => (value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const handleToggleGenre = (genre) => {
    setForm((previous) => {
      const nextGenres = previous.genres.includes(genre)
        ? previous.genres.filter((value) => value !== genre)
        : [...previous.genres, genre];

      return {
        ...previous,
        genres: nextGenres
      };
    });
  };

  const handleFileChange = (key) => (event) => {
    const file = event.target.files?.[0] ?? null;
    setAssets((previous) => ({
      ...previous,
      [key]: file
    }));
  };

  const resetFormState = () => {
    setForm(initialFormState);
    setAssets(initialAssetSelection);
    setSubmitError(null);
    setAdminIssueReport(null);
    setCopiedIssueReport(false);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    resetFormState();
  };

  const validateBeforeSubmit = () => {
    if (!form.title.trim()) return "Movie title is required.";
    if (form.genres.length === 0) return "Select at least one genre.";
    if (form.status === "currently_running" && !form.rating) return "Rating is required for currently playing movies.";
    if (!form.description.trim()) return "Description is required.";
    if (
      !selectedDuration ||
      (Number(form.durationHours || 0) === 0 && Number(form.durationMinutes || 0) === 0)
    ) {
      return "Duration is required.";
    }
    if (!form.director.trim()) return "Director is required.";
    if (!assets.poster) return "Poster image is required.";
    if (!assets.trailer) return "Trailer video is required.";
    if (!assets.trailerThumbnail) return "Trailer thumbnail image is required.";
    if (!fileMatchesSupportedFormat(assets.poster, SUPPORTED_POSTER_TYPES, SUPPORTED_POSTER_EXTENSIONS)) {
      return "Poster must be a JPG, PNG, or WebP image for Safari compatibility.";
    }
    if (!fileMatchesSupportedFormat(assets.trailer, SUPPORTED_TRAILER_TYPES, SUPPORTED_TRAILER_EXTENSIONS)) {
      return "Trailer must be an MP4, MOV, or M4V video for Safari compatibility.";
    }
    if (
      !fileMatchesSupportedFormat(
        assets.trailerThumbnail,
        SUPPORTED_POSTER_TYPES,
        SUPPORTED_POSTER_EXTENSIONS
      )
    ) {
      return "Trailer thumbnail must be a JPG, PNG, or WebP image for Safari compatibility.";
    }

    const showtimes = toCommaSeparatedList(form.showtimes);
    if (showtimes.length === 0) return "At least one showtime is required.";

    const cast = toCommaSeparatedList(form.cast);
    if (cast.length === 0) return "At least one cast member is required.";

    return null;
  };

  const handleCreateMovie = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setAdminIssueReport(null);

    try {
      const [posterUpload, trailerUpload, trailerThumbnailUpload] = await Promise.all([
        uploadMovieAssetToStorage(assets.poster, "poster", form.title),
        uploadMovieAssetToStorage(assets.trailer, "trailer", form.title),
        uploadMovieAssetToStorage(assets.trailerThumbnail, "trailer-thumbnail", form.title)
      ]);

      const payload = {
        title: form.title.trim(),
        genre: form.genres[0],
        genres: form.genres,
        rating: form.status === "currently_running" ? form.rating : "",
        status: form.status,
        description: form.description.trim(),
        duration: selectedDuration,
        director: form.director.trim(),
        cast: toCommaSeparatedList(form.cast),
        showtimes: toCommaSeparatedList(form.showtimes),
        poster: posterUpload.url,
        trailerUrl: trailerUpload.url,
        trailerThumbnail: trailerThumbnailUpload.url
      };

      await onCreateMovie(payload);
      closeDialog();
    } catch (error) {
      setSubmitError(getMeaningfulErrorMessage(error, "admin"));
      setAdminIssueReport(
        buildAdminIssueReport(error, {
          feature: "Admin - Create Movie",
          title: form.title,
          selectedFiles: {
            poster: assets.poster?.name,
            trailer: assets.trailer?.name,
            trailerThumbnail: assets.trailerThumbnail?.name
          }
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyIssueReport = async () => {
    if (!adminIssueReport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(adminIssueReport);
      setCopiedIssueReport(true);
    } catch {
      setCopiedIssueReport(false);
    }
  };

  const handleDeleteMovie = async (movie) => {
    if (!onDeleteMovie) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${movie.title}"? This will also delete poster, trailer, and thumbnail from storage.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingMovieId(movie.id);
    setSubmitError(null);
    setAdminIssueReport(null);
    setCopiedIssueReport(false);

    try {
      await onDeleteMovie(movie.id);
    } catch (error) {
      setSubmitError(getMeaningfulErrorMessage(error, "admin"));
      setAdminIssueReport(
        buildAdminIssueReport(error, {
          feature: "Admin - Delete Movie",
          movieId: movie.id,
          title: movie.title
        })
      );
    } finally {
      setDeletingMovieId(null);
    }
  };

  return {
    showAddDialog,
    setShowAddDialog,
    filterStatus,
    setFilterStatus,
    form,
    assets,
    isSubmitting,
    deletingMovieId,
    submitError,
    adminIssueReport,
    copiedIssueReport,
    currentlyRunning,
    comingSoon,
    selectedDuration,
    genreOptions,
    filteredMovies,
    ratingOptions,
    durationHourOptions,
    durationMinuteOptions,
    handleChange,
    handleToggleGenre,
    handleFileChange,
    closeDialog,
    handleCreateMovie,
    copyIssueReport,
    handleDeleteMovie
  };
}
