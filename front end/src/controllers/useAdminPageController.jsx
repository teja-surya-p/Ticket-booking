import { useEffect, useMemo, useRef, useState } from "react";
import { buildAdminIssueReport, getMeaningfulErrorMessage } from "@/services/apiErrorUtils";
import { uploadMovieAssetToStorage } from "@/services/firebaseStorage";
import { cancelAdminShowtime, fetchAllAdminShowtimes, scheduleShowtime, sendPromotion } from "@/services/adminApi";
import { fetchMovieShowtimes } from "@/services/moviesApi";
import {
  createShowroom,
  deleteShowroom,
  fetchShowrooms,
  updateShowroom
} from "@/services/showroomsApi";
import {
  formatDurationLabel,
  getMovieGenreList,
  getMovieGenres,
  MOVIE_GENRE_OPTIONS
} from "@/models/movie-model";

const initialPromotionForm = { title: "", message: "", promoCode: "", discountPercent: "", expiresAt: "" };

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
const initialHallForm = { name: "", rows: "", cols: "" };

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

function buildHallFormState(showroom) {
  return {
    name: String(showroom?.name ?? ""),
    rows:
      Number.isInteger(Number(showroom?.layout?.rows)) && Number(showroom?.layout?.rows) > 0
        ? String(showroom.layout.rows)
        : "",
    cols:
      Number.isInteger(Number(showroom?.layout?.cols)) && Number(showroom?.layout?.cols) > 0
        ? String(showroom.layout.cols)
        : ""
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
  const [showHallDialog, setShowHallDialog] = useState(false);
  const [hallForm, setHallForm] = useState(initialHallForm);
  const [editingHall, setEditingHall] = useState(null);
  const [hallSubmitError, setHallSubmitError] = useState(null);
  const [isSavingHall, setIsSavingHall] = useState(false);
  const [deletingHallId, setDeletingHallId] = useState("");

  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionForm, setPromotionForm] = useState(initialPromotionForm);
  const [isSendingPromotion, setIsSendingPromotion] = useState(false);
  const [promotionSendResult, setPromotionSendResult] = useState(null);
  const [promotionError, setPromotionError] = useState(null);

  const [editingMovieShowtimes, setEditingMovieShowtimes] = useState([]);

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [scheduleSelectedRoom, setScheduleSelectedRoom] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const [allScheduledShows, setAllScheduledShows] = useState([]);
  const [isLoadingAllShows, setIsLoadingAllShows] = useState(false);
  const [selectedHall, setSelectedHall] = useState("");
  const [pendingSlots, setPendingSlots] = useState([]);
  const [showScheduleMovieHint, setShowScheduleMovieHint] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const scheduleMovieHintTimeoutRef = useRef(null);

  const loadShowrooms = async () => {
    setIsLoadingShowrooms(true);
    try {
      const data = await fetchShowrooms();
      setShowrooms(Array.isArray(data) ? data : []);
    } catch {
      setShowrooms([]);
    } finally {
      setIsLoadingShowrooms(false);
    }
  };

  useEffect(() => {
    void loadShowrooms();
  }, []);

  // Load all upcoming scheduled shows on mount so the dashboard can show movies missing showtimes
  useEffect(() => {
    setIsLoadingAllShows(true);
    fetchAllAdminShowtimes()
      .then((data) => setAllScheduledShows(Array.isArray(data) ? data : []))
      .catch(() => setAllScheduledShows([]))
      .finally(() => setIsLoadingAllShows(false));
  }, []);

  useEffect(() => () => {
    if (scheduleMovieHintTimeoutRef.current) {
      window.clearTimeout(scheduleMovieHintTimeoutRef.current);
    }
  }, []);

  // When schedule dialog is open and showrooms finish loading, default to first hall
  useEffect(() => {
    if (showScheduleDialog && showrooms.length > 0 && !selectedHall) {
      setSelectedHall(showrooms[0].name);
    }
  }, [showScheduleDialog, showrooms, selectedHall]);

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
  const hallTotalSeats = useMemo(() => {
    const rows = Number(hallForm.rows);
    const cols = Number(hallForm.cols);
    return Number.isInteger(rows) && rows > 0 && Number.isInteger(cols) && cols > 0 ? rows * cols : 0;
  }, [hallForm.rows, hallForm.cols]);

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

  const resetHallFormState = () => {
    setHallForm(initialHallForm);
    setEditingHall(null);
    setHallSubmitError(null);
  };

  const openHallDialog = () => {
    resetHallFormState();
    setShowHallDialog(true);
  };

  const openEditHallDialog = (showroom) => {
    setEditingHall(showroom);
    setHallForm(buildHallFormState(showroom));
    setHallSubmitError(null);
    setShowHallDialog(true);
  };

  const closeHallDialog = () => {
    setShowHallDialog(false);
    resetHallFormState();
  };

  const handleHallChange = (key) => (value) => {
    const nextValue =
      key === "rows" || key === "cols"
        ? String(value ?? "").replace(/\D/g, "").slice(0, 3)
        : String(value ?? "");

    setHallForm((previous) => ({
      ...previous,
      [key]: nextValue
    }));
    setHallSubmitError(null);
  };

  const validateHallForm = () => {
    const name = hallForm.name.trim();
    const rows = Number(hallForm.rows);
    const cols = Number(hallForm.cols);

    if (!name) return "Hall name is required.";
    if (!Number.isInteger(rows) || rows <= 0) return "Rows must be a positive whole number.";
    if (!Number.isInteger(cols) || cols <= 0) return "Seats per row must be a positive whole number.";

    return null;
  };

  const handleSaveHall = async () => {
    const validationError = validateHallForm();
    if (validationError) {
      setHallSubmitError(validationError);
      return;
    }

    setIsSavingHall(true);
    setHallSubmitError(null);

    try {
      const payload = {
        name: hallForm.name.trim(),
        layout: {
          rows: Number(hallForm.rows),
          cols: Number(hallForm.cols)
        }
      };

      if (editingHall) {
        await updateShowroom(editingHall.showroomId, payload);
      } else {
        await createShowroom(payload);
      }

      await Promise.all([loadShowrooms(), fetchAllAdminShowtimes().then((data) => setAllScheduledShows(Array.isArray(data) ? data : [])).catch(() => setAllScheduledShows([]))]);
      setSelectedHall("");
      closeHallDialog();
    } catch (error) {
      setHallSubmitError(getMeaningfulErrorMessage(error, "admin"));
    } finally {
      setIsSavingHall(false);
    }
  };

  const handleDeleteHall = async (showroom) => {
    if (!showroom) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${showroom.name}"? This only works if no movies or showtimes are assigned to it.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingHallId(showroom.showroomId);
    setHallSubmitError(null);

    try {
      await deleteShowroom(showroom.showroomId);
      await Promise.all([loadShowrooms(), fetchAllAdminShowtimes().then((data) => setAllScheduledShows(Array.isArray(data) ? data : [])).catch(() => setAllScheduledShows([]))]);
      setSelectedHall((previous) => (previous === showroom.name ? "" : previous));
      setScheduleSelectedRoom((previous) => (previous === showroom.showroomId ? "" : previous));
      setForm((previous) =>
        previous.showroomId === showroom.showroomId
          ? { ...previous, showroomId: "" }
          : previous
      );

      if (editingHall?.showroomId === showroom.showroomId) {
        closeHallDialog();
      }
    } catch (error) {
      setHallSubmitError(getMeaningfulErrorMessage(error, "admin"));
      setShowHallDialog(true);
    } finally {
      setDeletingHallId("");
    }
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
    const { title, message, promoCode, discountPercent, expiresAt } = promotionForm;
    if (!title.trim()) { setPromotionError("Title is required."); return; }
    if (!message.trim()) { setPromotionError("Message is required."); return; }
    if (promoCode.trim()) {
      const pct = Number(discountPercent);
      if (!discountPercent || isNaN(pct) || pct < 1 || pct > 100) {
        setPromotionError("Discount % must be a number between 1 and 100 when a promo code is set.");
        return;
      }
    }
    if (expiresAt && promoCode.trim()) {
      if (new Date(expiresAt) <= new Date()) {
        setPromotionError("Expiry date/time must be in the future.");
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
        if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
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

  const triggerScheduleMovieHint = () => {
    setShowScheduleMovieHint(true);
    if (scheduleMovieHintTimeoutRef.current) {
      window.clearTimeout(scheduleMovieHintTimeoutRef.current);
    }
    scheduleMovieHintTimeoutRef.current = window.setTimeout(() => {
      setShowScheduleMovieHint(false);
      scheduleMovieHintTimeoutRef.current = null;
    }, 3000);
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
    setSelectedHall(showrooms[0]?.name ?? "");
    setScheduleError(null);
    setScheduleSuccess(null);
    setShowScheduleMovieHint(false);
    setShowScheduleDialog(true);
    loadAllScheduledShows();
  };

  const closeScheduleDialog = () => {
    setShowScheduleDialog(false);
    setPendingSlots([]);
    setShowScheduleMovieHint(false);
    if (scheduleMovieHintTimeoutRef.current) {
      window.clearTimeout(scheduleMovieHintTimeoutRef.current);
      scheduleMovieHintTimeoutRef.current = null;
    }
  };

  const buildStartAtFromForm = (date, timeSlot) => {
    if (!date || !timeSlot) return "";
    // Append seconds + Z so the time is treated as UTC directly, preventing
    // browser timezone offset from shifting the stored value.
    return `${date}T${timeSlot}:00.000Z`;
  };

  const prefillScheduleForm = (date, timeSlot, hallName = null) => {
    setScheduleForm((prev) => ({ ...prev, date, timeSlot }));
    // Auto-select showroom by hall name
    if (hallName) {
      const room = showrooms.find((r) => r.name === hallName);
      if (room) {
        setScheduleSelectedRoom(room.showroomId);
      }
    }
  };

  const togglePendingSlot = (dateKey, slotValue, hallName) => {
    if (!scheduleForm.movieId) {
      triggerScheduleMovieHint();
      return;
    }

    const room = showrooms.find((r) => r.name === hallName);
    if (!room) {
      setScheduleError("Selected hall could not be found.");
      return;
    }

    const key = `${room.showroomId}_${dateKey}_${slotValue}`;
    setPendingSlots((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) return prev.filter((s) => s.key !== key);
      return [...prev, { key, dateKey, slotValue, hallName, showroomId: room.showroomId }];
    });
    setScheduleError(null);
    setScheduleSelectedRoom(room.showroomId);
    setScheduleForm((prev) => ({ ...prev, date: dateKey, timeSlot: slotValue }));
  };

  const handleScheduleFormChange = (key, value) => {
    setScheduleForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "movieId") {
        setPendingSlots([]);
        setScheduleSelectedRoom("");
        setScheduleError(null);
        setScheduleSuccess(null);
        setShowScheduleMovieHint(false);
      }
      return next;
    });
  };

  const handleScheduleShow = async () => {
    setScheduleError(null);
    setScheduleSuccess(null);

    if (!scheduleForm.movieId) { triggerScheduleMovieHint(); return; }
    if (pendingSlots.length === 0) {
      setScheduleError("Please select at least one hall slot from the schedule grid.");
      return;
    }

    const movieId = Number(scheduleForm.movieId);
    const now = new Date();

    setIsScheduling(true);
    const errors = [];
    let successCount = 0;
    for (const slot of pendingSlots) {
      const startDate = new Date(buildStartAtFromForm(slot.dateKey, slot.slotValue));
      if (Number.isNaN(startDate.getTime()) || startDate < now) {
        errors.push(`${slot.hallName} ${slot.dateKey} ${slot.slotValue} is no longer available.`);
        continue;
      }

      try {
        await scheduleShowtime({
          movieId,
          showroomId: slot.showroomId,
          startAt: startDate.toISOString()
        });
        successCount++;
      } catch (err) {
        errors.push(getMeaningfulErrorMessage(err, "admin"));
      }
    }

    setIsScheduling(false);
    setPendingSlots([]);
    setScheduleSelectedRoom("");
    setScheduleForm((prev) => ({
      ...prev,
      date: "",
      timeSlot: ""
    }));
    loadAllScheduledShows();
    if (errors.length === 0) {
      setScheduleSuccess(`${successCount} show${successCount !== 1 ? "s" : ""} scheduled successfully!`);
    } else if (successCount > 0) {
      setScheduleSuccess(`${successCount} scheduled. ${errors.length} failed: ${errors[0]}`);
    } else {
      setScheduleError(errors[0] ?? "Scheduling failed.");
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
      if (String(movie.id) === String(scheduleForm.movieId)) {
        setScheduleForm(initialScheduleForm);
        setScheduleSelectedRoom("");
        setSelectedHall("");
        setPendingSlots([]);
      }
      loadAllScheduledShows();
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
    showHallDialog,
    hallForm,
    editingHall,
    hallSubmitError,
    hallTotalSeats,
    isSavingHall,
    deletingHallId,
    openHallDialog,
    openEditHallDialog,
    closeHallDialog,
    handleHallChange,
    handleSaveHall,
    handleDeleteHall,
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
    showScheduleMovieHint,
    togglePendingSlot,
    triggerScheduleMovieHint,
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
