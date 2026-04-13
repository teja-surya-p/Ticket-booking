import { useEffect, useMemo, useState } from "react";
import { buildAdminIssueReport, getMeaningfulErrorMessage } from "@/services/apiErrorUtils";
import { uploadMovieAssetToStorage } from "@/services/firebaseStorage";
import { sendPromotion } from "@/services/adminApi";
import { fetchShowrooms } from "@/services/showroomsApi";
import {
  formatDurationLabel,
  getMovieGenreList,
  getMovieGenres,
  MOVIE_GENRE_OPTIONS
} from "@/models/movie-model";

const MAX_SHOWTIMES_PER_DAY = 4;

const initialPromotionForm = { title: "", message: "", showroomId: "" };

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
  showtimes: ["2:00 PM", "5:00 PM", "8:00 PM"],
  showroomId: "",
  releaseDate: ""
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

function parseDurationParts(value) {
  const normalized = String(value || "").trim();
  const match = normalized.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);

  if (!match) {
    return {
      durationHours: "",
      durationMinutes: ""
    };
  }

  return {
    durationHours: match[1] ?? "",
    durationMinutes: match[2] ?? ""
  };
}

function buildFormStateFromMovie(movie) {
  const { durationHours, durationMinutes } = parseDurationParts(movie?.duration);

  return {
    title: String(movie?.title ?? ""),
    genres: getMovieGenreList(movie),
    rating: String(movie?.rating ?? "PG-13"),
    status: String(movie?.status ?? "coming_soon"),
    description: String(movie?.description ?? ""),
    durationHours,
    durationMinutes,
    director: String(movie?.director ?? ""),
    cast: Array.isArray(movie?.cast) ? movie.cast.join(", ") : "",
    showtimes: Array.isArray(movie?.showtimes) ? movie.showtimes.slice(0, MAX_SHOWTIMES_PER_DAY) : [],
    showroomId: String(movie?.showroomId ?? ""),
    releaseDate: String(movie?.releaseDate ?? "")
  };
}

export function useAdminPageController({ movies, onCreateMovie, onUpdateMovie, onDeleteMovie }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState(initialFormState);
  const [assets, setAssets] = useState(initialAssetSelection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMovieId, setDeletingMovieId] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [adminIssueReport, setAdminIssueReport] = useState(null);
  const [copiedIssueReport, setCopiedIssueReport] = useState(false);

  const [showrooms, setShowrooms] = useState([]);
  const [isLoadingShowrooms, setIsLoadingShowrooms] = useState(false);

  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionForm, setPromotionForm] = useState(initialPromotionForm);
  const [isSendingPromotion, setIsSendingPromotion] = useState(false);
  const [promotionSendResult, setPromotionSendResult] = useState(null);
  const [promotionError, setPromotionError] = useState(null);

  useEffect(() => {
    setIsLoadingShowrooms(true);
    fetchShowrooms()
      .then((data) => setShowrooms(Array.isArray(data) ? data : []))
      .catch(() => setShowrooms([]))
      .finally(() => setIsLoadingShowrooms(false));
  }, []);

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
    setEditingMovie(null);
    setSubmitError(null);
    setAdminIssueReport(null);
    setCopiedIssueReport(false);
  };

  const openCreateDialog = () => {
    resetFormState();
    setShowAddDialog(true);
  };

  const openEditDialog = (movie) => {
    setForm(buildFormStateFromMovie(movie));
    setAssets(initialAssetSelection);
    setEditingMovie(movie);
    setSubmitError(null);
    setAdminIssueReport(null);
    setCopiedIssueReport(false);
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    resetFormState();
  };

  const validateBeforeSubmit = () => {
    const isEditing = Boolean(editingMovie);

    if (!form.title.trim()) return "Movie title is required.";
    if (!form.showroomId) return "Please select a showroom for this movie.";
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
    if (!isEditing && !assets.poster) return "Poster image is required.";
    if (!isEditing && !assets.trailer) return "Trailer video is required.";
    if (!isEditing && !assets.trailerThumbnail) return "Trailer thumbnail image is required.";
    if (
      assets.poster &&
      !fileMatchesSupportedFormat(assets.poster, SUPPORTED_POSTER_TYPES, SUPPORTED_POSTER_EXTENSIONS)
    ) {
      return "Poster must be a JPG, PNG, or WebP image for Safari compatibility.";
    }
    if (
      assets.trailer &&
      !fileMatchesSupportedFormat(assets.trailer, SUPPORTED_TRAILER_TYPES, SUPPORTED_TRAILER_EXTENSIONS)
    ) {
      return "Trailer must be an MP4, MOV, or M4V video for Safari compatibility.";
    }
    if (
      assets.trailerThumbnail &&
      !fileMatchesSupportedFormat(
        assets.trailerThumbnail,
        SUPPORTED_POSTER_TYPES,
        SUPPORTED_POSTER_EXTENSIONS
      )
    ) {
      return "Trailer thumbnail must be a JPG, PNG, or WebP image for Safari compatibility.";
    }

    const showtimes = form.showtimes.map((s) => s.trim()).filter(Boolean);
    if (showtimes.length === 0) return "At least one showtime is required.";
    if (showtimes.length > MAX_SHOWTIMES_PER_DAY) return `A maximum of ${MAX_SHOWTIMES_PER_DAY} showtimes per day is allowed.`;

    const timePattern = /^(1[0-2]|0?[1-9]):[0-5]\d\s?(AM|PM)$/i;
    const invalidTimes = showtimes.filter((t) => !timePattern.test(t));
    if (invalidTimes.length > 0) {
      return `Invalid showtime format: "${invalidTimes[0]}". Use format like "2:00 PM".`;
    }

    if (form.status === "coming_soon" && !form.releaseDate) {
      return "Release date is required for coming soon movies.";
    }

    const cast = toCommaSeparatedList(form.cast);
    if (cast.length === 0) return "At least one cast member is required.";

    return null;
  };

  const handleSaveMovie = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    if (form.showroomId) {
      const conflictMovies = movies.filter(
        (m) => m.showroomId === form.showroomId && (!editingMovie || m.id !== editingMovie.id)
      );
      const takenTimes = new Set(conflictMovies.flatMap((m) => m.showtimes ?? []));
      const newTimes = form.showtimes.map((s) => s.trim()).filter(Boolean);
      const conflicts = newTimes.filter((t) => takenTimes.has(t));
      if (conflicts.length > 0) {
        setSubmitError(
          `Showroom conflict: "${conflicts.join(", ")}" is already used by another movie in this showroom.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setAdminIssueReport(null);

    try {
      const [posterUpload, trailerUpload, trailerThumbnailUpload] = await Promise.all([
        assets.poster ? uploadMovieAssetToStorage(assets.poster, "poster", form.title) : null,
        assets.trailer ? uploadMovieAssetToStorage(assets.trailer, "trailer", form.title) : null,
        assets.trailerThumbnail
          ? uploadMovieAssetToStorage(assets.trailerThumbnail, "trailer-thumbnail", form.title)
          : null
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
        showtimes: form.showtimes.map((s) => s.trim()).filter(Boolean),
        showroomId: form.showroomId || null,
        releaseDate: form.status === "coming_soon" ? (form.releaseDate || null) : null,
        poster: posterUpload?.url ?? editingMovie?.poster ?? "",
        trailerUrl: trailerUpload?.url ?? editingMovie?.trailerUrl ?? "",
        trailerThumbnail: trailerThumbnailUpload?.url ?? editingMovie?.trailerThumbnail ?? ""
      };

      if (editingMovie) {
        await onUpdateMovie?.(editingMovie.id, payload);
      } else {
        await onCreateMovie(payload);
      }
      closeDialog();
    } catch (error) {
      setSubmitError(getMeaningfulErrorMessage(error, "admin"));
      setAdminIssueReport(
        buildAdminIssueReport(error, {
          feature: editingMovie ? "Admin - Update Movie" : "Admin - Create Movie",
          movieId: editingMovie?.id,
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

  const openPromotionDialog = () => {
    setPromotionForm(initialPromotionForm);
    setPromotionSendResult(null);
    setPromotionError(null);
    setShowPromotionDialog(true);
  };

  const closePromotionDialog = () => {
    setShowPromotionDialog(false);
  };

  const handlePromotionChange = (key) => (value) => {
    setPromotionForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSendPromotion = async () => {
    const { title, message, showroomId } = promotionForm;
    if (!title.trim()) { setPromotionError("Title is required."); return; }
    if (!message.trim()) { setPromotionError("Message is required."); return; }
    if (!showroomId) { setPromotionError("Please select a showroom."); return; }

    setIsSendingPromotion(true);
    setPromotionError(null);
    setPromotionSendResult(null);

    try {
      const result = await sendPromotion({ title: title.trim(), message: message.trim(), showroomId });
      setPromotionSendResult(result);
    } catch (error) {
      setPromotionError(getMeaningfulErrorMessage(error, "admin"));
    } finally {
      setIsSendingPromotion(false);
    }
  };

  const handleAddShowtime = () => {
    setForm((previous) => {
      if (previous.showtimes.length >= MAX_SHOWTIMES_PER_DAY) return previous;
      return { ...previous, showtimes: [...previous.showtimes, ""] };
    });
  };

  const handleUpdateShowtime = (index, value) => {
    setForm((previous) => {
      const next = [...previous.showtimes];
      next[index] = value;
      return { ...previous, showtimes: next };
    });
  };

  const handleRemoveShowtime = (index) => {
    setForm((previous) => {
      const next = previous.showtimes.filter((_, idx) => idx !== index);
      return { ...previous, showtimes: next };
    });
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
    editingMovie,
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
    showrooms,
    isLoadingShowrooms,
    showPromotionDialog,
    promotionForm,
    isSendingPromotion,
    promotionSendResult,
    promotionError,
    openPromotionDialog,
    closePromotionDialog,
    handlePromotionChange,
    handleSendPromotion,
    handleChange,
    handleToggleGenre,
    handleFileChange,
    handleAddShowtime,
    handleUpdateShowtime,
    handleRemoveShowtime,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSaveMovie,
    copyIssueReport,
    handleDeleteMovie,
    maxShowtimes: MAX_SHOWTIMES_PER_DAY
  };
}
