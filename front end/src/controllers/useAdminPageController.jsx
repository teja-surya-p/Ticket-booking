import { useEffect, useMemo, useState } from "react";
import { buildAdminIssueReport, getMeaningfulErrorMessage } from "@/services/apiErrorUtils";
import { uploadMovieAssetToStorage } from "@/services/firebaseStorage";
import { cancelAdminShowtime, fetchAllAdminShowtimes, fetchAvailableShowrooms, scheduleShowtime, sendPromotion } from "@/services/adminApi";
import { fetchMovieShowtimes } from "@/services/moviesApi";
import { fetchShowrooms } from "@/services/showroomsApi";
import {
  formatDurationLabel,
  getMovieGenreList,
  getMovieGenres,
  MOVIE_GENRE_OPTIONS
} from "@/models/movie-model";

const initialPromotionForm = { title: "", message: "", promoCode: "", discountPercent: "" };

export const TIME_SLOT_OPTIONS = [
  { label: "10:00 AM", value: "10:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "5:00 PM", value: "17:00" },
  { label: "9:00 PM", value: "21:00" }
];

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
  showroomId: "",
  releaseDate: ""
};

const initialScheduleForm = { movieId: "", date: "", timeSlot: "" };

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

  const [editingMovieShowtimes, setEditingMovieShowtimes] = useState([]);

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [scheduleSelectedRoom, setScheduleSelectedRoom] = useState("");
  const [availableShowrooms, setAvailableShowrooms] = useState([]);
  const [isCheckingRooms, setIsCheckingRooms] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const [allScheduledShows, setAllScheduledShows] = useState([]);
  const [isLoadingAllShows, setIsLoadingAllShows] = useState(false);
  const [selectedHall, setSelectedHall] = useState("");
  const [pendingSlots, setPendingSlots] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    setIsLoadingShowrooms(true);
    fetchShowrooms()
      .then((data) => setShowrooms(Array.isArray(data) ? data : []))
      .catch(() => setShowrooms([]))
      .finally(() => setIsLoadingShowrooms(false));
  }, []);

  // Load all upcoming scheduled shows on mount so the dashboard can show movies missing showtimes
  useEffect(() => {
    setIsLoadingAllShows(true);
    fetchAllAdminShowtimes()
      .then((data) => setAllScheduledShows(Array.isArray(data) ? data : []))
      .catch(() => setAllScheduledShows([]))
      .finally(() => setIsLoadingAllShows(false));
  }, []);

  const currentlyRunning = movies.filter((movie) => movie.status === "currently_running").length;
  const comingSoon = movies.filter((movie) => movie.status === "coming_soon").length;

  const moviesWithoutShowtimes = useMemo(() => {
    const scheduledMovieIds = new Set(allScheduledShows.map((s) => Number(s.movieId)));
    return movies.filter(
      (movie) => movie.status === "currently_running" && !scheduledMovieIds.has(Number(movie.id))
    );
  }, [movies, allScheduledShows]);

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
    setEditingMovieShowtimes([]);
    setShowAddDialog(true);
    fetchMovieShowtimes(movie.id)
      .then((data) => setEditingMovieShowtimes(Array.isArray(data) ? data : []))
      .catch(() => setEditingMovieShowtimes([]));
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
    const { title, message, promoCode, discountPercent } = promotionForm;
    if (!title.trim()) { setPromotionError("Title is required."); return; }
    if (!message.trim()) { setPromotionError("Message is required."); return; }
    if (promoCode.trim()) {
      const pct = Number(discountPercent);
      if (!discountPercent || isNaN(pct) || pct < 1 || pct > 100) {
        setPromotionError("Discount % must be a number between 1 and 100 when a promo code is set.");
        return;
      }
    }

    setIsSendingPromotion(true);
    setPromotionError(null);
    setPromotionSendResult(null);

    try {
      const payload = { title: title.trim(), message: message.trim() };
      if (promoCode.trim()) {
        payload.promoCode = promoCode.trim().toUpperCase();
        payload.discountPercent = Number(discountPercent);
      }
      const result = await sendPromotion(payload);
      setPromotionSendResult(result);
    } catch (error) {
      setPromotionError(getMeaningfulErrorMessage(error, "admin"));
    } finally {
      setIsSendingPromotion(false);
    }
  };

  const loadAllScheduledShows = () => {
    setIsLoadingAllShows(true);
    fetchAllAdminShowtimes()
      .then((data) => setAllScheduledShows(Array.isArray(data) ? data : []))
      .catch(() => setAllScheduledShows([]))
      .finally(() => setIsLoadingAllShows(false));
  };

  const handleCancelShow = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelAdminShowtime(cancelTarget.showtimeId);
      setAllScheduledShows((prev) => prev.filter((s) => s.showtimeId !== cancelTarget.showtimeId));
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err?.message ?? "Failed to cancel. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const openScheduleDialog = (preselectedMovie = null) => {
    setScheduleForm(preselectedMovie
      ? { ...initialScheduleForm, movieId: String(preselectedMovie.id) }
      : initialScheduleForm
    );
    setScheduleSelectedRoom("");
    setAvailableShowrooms([]);
    setScheduleError(null);
    setScheduleSuccess(null);
    setShowScheduleDialog(true);
    loadAllScheduledShows();
  };

  const closeScheduleDialog = () => {
    setShowScheduleDialog(false);
    setPendingSlots([]);
  };

  const buildStartAtFromForm = (date, timeSlot) => {
    if (!date || !timeSlot) return "";
    return `${date}T${timeSlot}`;
  };

  const handleFetchAvailableShowrooms = async (startAt) => {
    if (!startAt) {
      setAvailableShowrooms([]);
      return;
    }
    setIsCheckingRooms(true);
    setScheduleSelectedRoom("");
    try {
      const data = await fetchAvailableShowrooms(startAt);
      setAvailableShowrooms(Array.isArray(data) ? data : []);
    } catch {
      setAvailableShowrooms([]);
    } finally {
      setIsCheckingRooms(false);
    }
  };

  const prefillScheduleForm = (date, timeSlot, hallName = null) => {
    setScheduleForm((prev) => ({ ...prev, date, timeSlot }));
    setAvailableShowrooms([]);
    // Auto-select showroom by hall name
    if (hallName) {
      const room = showrooms.find((r) => r.name === hallName);
      if (room) {
        setScheduleSelectedRoom(room.showroomId);
      }
    }
    if (date && timeSlot) {
      void handleFetchAvailableShowrooms(buildStartAtFromForm(date, timeSlot));
    }
  };

  const togglePendingSlot = (dateKey, slotValue, hallName) => {
    const key = `${dateKey}_${slotValue}`;
    setPendingSlots((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) return prev.filter((s) => s.key !== key);
      return [...prev, { key, dateKey, slotValue, hallName }];
    });
    // Auto-select hall in the form for the most recently clicked slot
    const room = showrooms.find((r) => r.name === hallName);
    if (room) setScheduleSelectedRoom(room.showroomId);
    setScheduleForm((prev) => ({ ...prev, date: dateKey, timeSlot: slotValue }));
    if (dateKey && slotValue) {
      void handleFetchAvailableShowrooms(buildStartAtFromForm(dateKey, slotValue));
    }
  };

  const handleScheduleFormChange = (key, value) => {
    setScheduleForm((prev) => {
      const next = { ...prev, [key]: value };
      const date = key === "date" ? value : next.date;
      const timeSlot = key === "timeSlot" ? value : next.timeSlot;
      if (date && timeSlot) {
        void handleFetchAvailableShowrooms(buildStartAtFromForm(date, timeSlot));
      } else {
        setAvailableShowrooms([]);
        setScheduleSelectedRoom("");
      }
      return next;
    });
  };

  const handleScheduleShow = async () => {
    setScheduleError(null);
    setScheduleSuccess(null);

    if (!scheduleForm.movieId) { setScheduleError("Please select a movie."); return; }
    if (!scheduleSelectedRoom) { setScheduleError("Please select an available showroom."); return; }

    const movieId = Number(scheduleForm.movieId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Multi-slot path
    if (pendingSlots.length > 0) {
      setIsScheduling(true);
      const errors = [];
      let successCount = 0;
      for (const slot of pendingSlots) {
        const startAt = new Date(buildStartAtFromForm(slot.dateKey, slot.slotValue)).toISOString();
        try {
          await scheduleShowtime({ movieId, showroomId: scheduleSelectedRoom, startAt });
          successCount++;
        } catch (err) {
          errors.push(getMeaningfulErrorMessage(err, "admin"));
        }
      }
      setIsScheduling(false);
      setPendingSlots([]);
      loadAllScheduledShows();
      if (errors.length === 0) {
        setScheduleSuccess(`${successCount} show${successCount !== 1 ? "s" : ""} scheduled successfully!`);
      } else if (successCount > 0) {
        setScheduleSuccess(`${successCount} scheduled. ${errors.length} failed: ${errors[0]}`);
      } else {
        setScheduleError(errors[0] ?? "Scheduling failed.");
      }
      return;
    }

    // Single-slot path (manual form)
    if (!scheduleForm.date) { setScheduleError("Please select a date."); return; }
    if (!scheduleForm.timeSlot) { setScheduleError("Please select a time slot."); return; }

    const startAtLocal = buildStartAtFromForm(scheduleForm.date, scheduleForm.timeSlot);
    const startDate = new Date(startAtLocal);
    if (startDate < today) { setScheduleError("Cannot schedule shows for past dates."); return; }

    setIsScheduling(true);
    try {
      await scheduleShowtime({ movieId, showroomId: scheduleSelectedRoom, startAt: startDate.toISOString() });
      setScheduleSuccess("Show scheduled successfully!");
      setScheduleForm(initialScheduleForm);
      setScheduleSelectedRoom("");
      setAvailableShowrooms([]);
      loadAllScheduledShows();
    } catch (error) {
      setScheduleError(getMeaningfulErrorMessage(error, "admin"));
    } finally {
      setIsScheduling(false);
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
    editingMovieShowtimes,
    showScheduleDialog,
    scheduleForm,
    scheduleSelectedRoom,
    setScheduleSelectedRoom,
    availableShowrooms,
    isCheckingRooms,
    isScheduling,
    scheduleError,
    scheduleSuccess,
    openScheduleDialog,
    closeScheduleDialog,
    handleScheduleFormChange,
    prefillScheduleForm,
    handleScheduleShow,
    allScheduledShows,
    moviesWithoutShowtimes,
    selectedHall,
    setSelectedHall,
    pendingSlots,
    togglePendingSlot,
    cancelTarget,
    setCancelTarget,
    isCancelling,
    cancelError,
    setCancelError,
    handleCancelShow,
    isLoadingAllShows,
    buildStartAtFromForm,
    handleChange,
    handleToggleGenre,
    handleFileChange,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSaveMovie,
    copyIssueReport,
    handleDeleteMovie
  };
}
