"use client";

import { useRef } from "react";
import { CalendarPlus, Film, Plus, Edit2, Trash2, Eye, BarChart3, Copy, Upload, ChevronDown, X, Mail, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIME_SLOT_OPTIONS, useAdminPageController } from "@/controllers/useAdminPageController";
import { getMoviePosterUrl } from "@/models/movie-media";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import styles from "./admin-page.module.css";
export function AdminPage({
  movies,
  onViewMovie,
  onCreateMovie,
  onUpdateMovie,
  onDeleteMovie
}) {
  const {
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
    isLoadingAllShows,
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
    handleChange,
    handleToggleGenre,
    handleFileChange,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSaveMovie,
    copyIssueReport,
    handleDeleteMovie
  } = useAdminPageController({
    movies,
    onCreateMovie,
    onUpdateMovie,
    onDeleteMovie
  });

  const scheduleFormRef = useRef(null);

  return <div className={styles["admin-dashboard"]}>
      <div className={styles["admin-header"]}>
        <h1 className={styles["admin-title"]}>Admin Dashboard</h1>
        <p className={styles["admin-subtitle"]}>
          Manage movies, showtimes, and bookings
        </p>
      </div>

      {/* Stats */}
      <div className={styles["admin-stats-grid"]}>
        <div className={styles["admin-stat-card"]}>
          <div className={styles["admin-stat-label"]}>
            <Film className={styles["admin-icon"]} />
            <span className={styles["admin-stat-label-text"]}>
              Total Movies
            </span>
          </div>
          <p className={styles["admin-stat-value"]}>
            {movies.length}
          </p>
        </div>
        <div className={styles["admin-stat-card"]}>
          <div className={styles["admin-stat-label"]}>
            <Eye className={styles["admin-icon"]} />
            <span className={styles["admin-stat-label-text"]}>
              Now Playing
            </span>
          </div>
          <p className={styles["admin-stat-value-highlight"]}>
            {currentlyRunning}
          </p>
        </div>
        <div className={styles["admin-stat-card"]}>
          <div className={styles["admin-stat-label"]}>
            <BarChart3 className={styles["admin-icon"]} />
            <span className={styles["admin-stat-label-text"]}>
              Coming Soon
            </span>
          </div>
          <p className={styles["admin-stat-value"]}>
            {comingSoon}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className={styles["admin-actions"]}>
        <div className={styles["admin-inline"]}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={styles["admin-status-filter"]}>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Movies</SelectItem>
              <SelectItem value="currently_running">Now Playing</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog} className={styles["admin-add-button"]}>
          <Plus className={styles["admin-icon"]} />
          Add Movie
        </Button>
        <Button onClick={openScheduleDialog} variant="outline">
          <CalendarPlus className={styles["admin-icon"]} />
          Manage Showtimes
        </Button>
        <Button onClick={openHallDialog} variant="outline">
          <LayoutGrid className={styles["admin-icon"]} />
          Manage Halls
        </Button>
        <Button onClick={openPromotionDialog} variant="outline">
          <Mail className={styles["admin-icon"]} />
          Send Promotion
        </Button>
      </div>

      {/* Movie Cards (mobile) */}
      <div className={styles["admin-mobile-list"]}>
        {filteredMovies.map(movie => {
        const posterUrl = getMoviePosterUrl(movie);
        return <div key={movie.id} className={styles["admin-mobile-card"]}>
            <div className={styles["admin-mobile-card-header"]}>
              <img src={posterUrl} alt={movie.title} className={styles["admin-mobile-poster"]} />
              <div className={styles["admin-mobile-content"]}>
                <p className={styles["admin-mobile-movie-title"]}>
                  {movie.title}
                </p>
                <p className={styles["admin-muted-text"]}>{movie.duration}</p>
                <div className={styles["admin-badge-group"]}>
                  {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-${genre}`} variant="secondary" className={styles["admin-genre-badge"]}>
                      {genre}
                    </Badge>)}
                  <Badge className={movie.status === "currently_running" ? styles["admin-status-now"] : styles["admin-status-soon"]} variant="outline">
                    {movie.status === "currently_running" ? "Now Playing" : "Coming Soon"}
                  </Badge>
                  {shouldShowMovieRating(movie) && <Badge variant="outline" className={styles["admin-rating-badge"]}>
                      {movie.rating}
                    </Badge>}
                </div>
              </div>
            </div>
            <div className={styles["admin-mobile-card-footer"]}>
              <div className={styles["admin-mobile-actions"]}>
                <Button variant="ghost" size="sm" onClick={() => onViewMovie(movie)} aria-label={`View ${movie.title}`}>
                  <Eye className={styles["admin-icon"]} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(movie)} aria-label={`Edit ${movie.title}`}>
                  <Edit2 className={styles["admin-icon"]} />
                </Button>
                <Button variant="ghost" size="sm" className={styles["admin-delete-button"]} onClick={() => handleDeleteMovie(movie)} disabled={deletingMovieId === movie.id || isSubmitting} aria-label={`Delete ${movie.title}`}>
                  <Trash2 className={styles["admin-icon"]} />
                </Button>
              </div>
            </div>
          </div>;
      })}
      </div>

      {/* Movie Table (desktop) */}
      <div className={styles["admin-table-wrapper"]}>
        <div className={styles["admin-table-scroll"]}>
          <table className={styles["admin-table"]}>
            <thead>
              <tr className={styles["admin-table-header-row"]}>
                <th className={styles["admin-table-header-cell"]}>
                  Movie
                </th>
                <th className={styles["admin-table-header-cell"]}>
                  Genre
                </th>
                <th className={styles["admin-table-header-cell"]}>
                  Rating
                </th>
                <th className={styles["admin-table-header-cell"]}>
                  Status
                </th>
                <th className={styles["admin-table-header-cell"]}>
                  Showtimes
                </th>
                <th className={styles["admin-table-header-cell-actions"]}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map((movie, idx) => {
              const posterUrl = getMoviePosterUrl(movie);
              return <tr key={movie.id} className={[styles["admin-table-row"], idx % 2 === 0 ? "" : styles["admin-table-row-alt"]].filter(Boolean).join(" ")}>
                  <td className={styles["admin-table-cell"]}>
                    <div className={styles["admin-inline"]}>
                      <img src={posterUrl} alt={movie.title} className={styles["admin-table-poster"]} />
                      <div>
                        <p className={styles["admin-field-label"]}>
                          {movie.title}
                        </p>
                        <p className={styles["admin-muted-text"]}>
                          {movie.duration}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={styles["admin-table-cell"]}>
                    <div className={styles["admin-badge-group"]}>
                      {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-table-${genre}`} variant="secondary" className={styles["admin-table-genre-badge"]}>
                          {genre}
                        </Badge>)}
                    </div>
                  </td>
                  <td className={styles["admin-table-rating"]}>
                    {shouldShowMovieRating(movie) ? movie.rating : <span className={styles["admin-muted-text"]}>Not set</span>}
                  </td>
                  <td className={styles["admin-table-cell"]}>
                    <Badge className={movie.status === "currently_running" ? styles["admin-table-status-now"] : styles["admin-table-status-soon"]} variant="outline">
                      {movie.status === "currently_running" ? "Now Playing" : "Coming Soon"}
                    </Badge>
                  </td>
                  <td className={styles["admin-table-showtimes"]}>
                    —
                  </td>
                  <td className={styles["admin-table-cell"]}>
                    <div className={styles["admin-table-actions"]}>
                      <Button variant="ghost" size="icon-sm" onClick={() => onViewMovie(movie)} aria-label={`View ${movie.title}`}>
                        <Eye className={styles["admin-icon"]} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(movie)} aria-label={`Edit ${movie.title}`}>
                        <Edit2 className={styles["admin-icon"]} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className={styles["admin-delete-button"]} onClick={() => handleDeleteMovie(movie)} disabled={deletingMovieId === movie.id || isSubmitting} aria-label={`Delete ${movie.title}`}>
                        <Trash2 className={styles["admin-icon"]} />
                      </Button>
                    </div>
                  </td>
                </tr>;
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No Showtimes section — currently running */}
      {moviesWithoutShowtimes.length > 0 && (
        <div className={styles["admin-no-showtimes-section"]}>
          <div className={styles["admin-no-showtimes-header"]}>
            <CalendarPlus className={styles["admin-icon"]} />
            <span>No Showtimes</span>
            <span className={styles["admin-no-showtimes-count"]}>{moviesWithoutShowtimes.length}</span>
          </div>
          <p className={styles["admin-no-showtimes-desc"]}>
            The following currently playing movies have no upcoming showtimes scheduled.
          </p>
          <div className={styles["admin-no-showtimes-list"]}>
            {moviesWithoutShowtimes.map((movie) => {
              const posterUrl = getMoviePosterUrl(movie);
              return (
                <div key={movie.id} className={styles["admin-no-showtimes-row"]}>
                  <img src={posterUrl} alt={movie.title} className={styles["admin-no-showtimes-poster"]} />
                  <div className={styles["admin-no-showtimes-info"]}>
                    <p className={styles["admin-field-label"]}>{movie.title}</p>
                    <p className={styles["admin-muted-text"]}>{movie.duration}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openScheduleDialog(movie)}
                    className={styles["admin-no-showtimes-action"]}
                  >
                    <CalendarPlus className={styles["admin-icon"]} />
                    Schedule
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}


      <Dialog open={showHallDialog} onOpenChange={(open) => { if (!open) closeHallDialog(); }}>
        <DialogContent className={styles["admin-dialog"]}>
          <DialogHeader>
            <DialogTitle>{editingHall ? "Edit Hall" : "Manage Halls"}</DialogTitle>
            <DialogDescription>
              Create new halls, update their seat layout, or remove unused halls. The customer seat map will use the hall layout configured here.
            </DialogDescription>
          </DialogHeader>

          <div className={styles["admin-form"]}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                {editingHall ? `Editing ${editingHall.name}` : "Add a New Hall"}
              </p>
              {editingHall && (
                <Button type="button" variant="outline" size="sm" onClick={openHallDialog}>
                  Create New Hall
                </Button>
              )}
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Hall Name <span style={{ color: "red" }}>*</span></label>
              <Input
                value={hallForm.name}
                onChange={(event) => handleHallChange("name")(event.target.value)}
                placeholder="e.g. Deluxe Hall"
                className={styles["admin-field-control"]}
              />
            </div>

            <div className={styles["admin-form-grid-duration"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Rows <span style={{ color: "red" }}>*</span></label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={hallForm.rows}
                  onChange={(event) => handleHallChange("rows")(event.target.value)}
                  placeholder="e.g. 10"
                  className={styles["admin-field-control"]}
                />
              </div>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Seats Per Row <span style={{ color: "red" }}>*</span></label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={hallForm.cols}
                  onChange={(event) => handleHallChange("cols")(event.target.value)}
                  placeholder="e.g. 20"
                  className={styles["admin-field-control"]}
                />
              </div>
            </div>

            <p className={styles["admin-muted-text"]}>
              {hallTotalSeats > 0
                ? `This layout will show exactly ${hallTotalSeats} seat${hallTotalSeats === 1 ? "" : "s"} to customers.`
                : "Enter rows and seats per row to calculate total capacity."}
            </p>

            {hallSubmitError && (
              <div className={styles["admin-error-card"]}>
                <p className={styles["admin-error-title"]}>{hallSubmitError}</p>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.25rem" }}>
              <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                Existing Halls
              </p>

              {isLoadingShowrooms ? (
                <p className={styles["admin-muted-text"]}>Loading halls...</p>
              ) : showrooms.length === 0 ? (
                <p className={styles["admin-muted-text"]}>No halls found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", maxHeight: "280px", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {showrooms.map((room) => (
                    <div
                      key={room.showroomId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.6rem",
                        padding: "0.8rem 0.9rem"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <span style={{ fontWeight: 600 }}>{room.name}</span>
                        <span className={styles["admin-muted-text"]}>
                          {room.layout?.rows ?? 0} rows × {room.layout?.cols ?? 0} seats per row
                        </span>
                        <span className={styles["admin-muted-text"]}>
                          {room.layout?.totalSeats ?? 0} total seats
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditHallDialog(room)}
                          aria-label={`Edit ${room.name}`}
                          disabled={isSavingHall || deletingHallId === room.showroomId}
                        >
                          <Edit2 className={styles["admin-icon"]} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={styles["admin-delete-button"]}
                          onClick={() => handleDeleteHall(room)}
                          aria-label={`Delete ${room.name}`}
                          disabled={isSavingHall || deletingHallId === room.showroomId}
                        >
                          <Trash2 className={styles["admin-icon"]} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeHallDialog} disabled={isSavingHall}>
              Cancel
            </Button>
            <Button onClick={handleSaveHall} disabled={isSavingHall} className={styles["admin-submit-button"]}>
              {isSavingHall ? "Saving..." : editingHall ? "Save Hall" : "Create Hall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={open => open ? setShowAddDialog(true) : closeDialog()}>
        <DialogContent className={styles["admin-dialog"]}>
          <DialogHeader>
            <DialogTitle>{editingMovie ? "Edit Movie" : "Add New Movie"}</DialogTitle>
            <DialogDescription>
              {editingMovie
                ? "Update any movie fields below. File uploads are optional while editing, and unchanged assets will be kept."
                : "Upload poster, trailer video, and trailer thumbnail. Use JPG, PNG, or WebP for images and MP4, MOV, or M4V for trailers so Safari can render them reliably."}
            </DialogDescription>
          </DialogHeader>

          <div className={styles["admin-form"]}>
            {/* Title */}
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Title <span style={{ color: "red" }}>*</span></label>
              <Input value={form.title} onChange={event => handleChange("title")(event.target.value)} placeholder="Movie title" className={styles["admin-field-control"]} />
            </div>

            {/* Showroom — always visible, prominent for coming soon → currently playing */}
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Showroom <span style={{ color: "red" }}>*</span></label>
                <Select value={form.showroomId} onValueChange={value => handleChange("showroomId")(value)} disabled={isLoadingShowrooms}>
                  <SelectTrigger className={styles["admin-field-control"]}>
                    <SelectValue placeholder={isLoadingShowrooms ? "Loading showrooms..." : "Select a showroom"} />
                  </SelectTrigger>
                  <SelectContent>
                  {showrooms.map((room) => (
                    <SelectItem key={room.showroomId} value={room.showroomId}>
                      {room.name} ({room.layout?.totalSeats ?? 0} seats)
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              <p className={styles["admin-muted-text"]}>Determines the seating capacity and layout for this movie.</p>
            </div>

            {/* Genres — full width */}
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Genres <span style={{ color: "red" }}>*</span></label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={styles["admin-field-control"]} style={{ justifyContent: "space-between" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {form.genres.length > 0 ? form.genres.join(", ") : "Select genres"}
                    </span>
                    <ChevronDown className={styles["admin-icon"]} style={{ flexShrink: 0 }} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {genreOptions.map((genre) => (
                    <DropdownMenuCheckboxItem key={genre} checked={form.genres.includes(genre)} onCheckedChange={() => handleToggleGenre(genre)} onSelect={event => event.preventDefault()}>
                      {genre}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className={styles["admin-muted-text"]}>
                {form.genres.length > 0 ? `${form.genres.length} genre${form.genres.length > 1 ? "s" : ""} selected` : "Select one or more genres"}
              </p>
            </div>

            {/* Rating + Status — 2 columns */}
            <div className={styles["admin-form-grid-duration"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Rating</label>
                {form.status === "currently_running" ? (
                  <Select value={form.rating} onValueChange={value => handleChange("rating")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratingOptions.map(rating => (
                        <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className={styles["admin-muted-text"]} style={{ paddingTop: "0.4rem" }}>
                    Only required for currently playing movies.
                  </p>
                )}
              </div>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Status <span style={{ color: "red" }}>*</span></label>
                <Select value={form.status} onValueChange={value => handleChange("status")(value)}>
                  <SelectTrigger className={styles["admin-field-control"]}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currently_running">Currently Running</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Release Date — only for coming soon */}
            {form.status === "coming_soon" && (
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Release Date <span style={{ color: "red" }}>*</span></label>
                <Input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => handleChange("releaseDate")(e.target.value)}
                  className={styles["admin-field-control"]}
                />
              </div>
            )}

            {/* Duration + Director — 2 columns */}
            <div className={styles["admin-form-grid-duration"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Duration <span style={{ color: "red" }}>*</span></label>
                <div className={styles["admin-duration-selects"]}>
                  <Select value={form.durationHours} onValueChange={value => handleChange("durationHours")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationHourOptions.map(hours => (
                        <SelectItem key={`duration-hour-${hours}`} value={hours}>{hours}h</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.durationMinutes} onValueChange={value => handleChange("durationMinutes")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationMinuteOptions.map(minutes => (
                        <SelectItem key={`duration-minute-${minutes}`} value={minutes}>{minutes}m</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className={styles["admin-muted-text"]}>
                  {selectedDuration ? `Selected: ${selectedDuration}` : "Select hours and minutes"}
                </p>
              </div>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Director <span style={{ color: "red" }}>*</span></label>
                <Input value={form.director} onChange={event => handleChange("director")(event.target.value)} placeholder="Director name" className={styles["admin-field-control"]} />
              </div>
            </div>

            {/* Cast */}
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Cast (comma separated) <span style={{ color: "red" }}>*</span></label>
              <Input value={form.cast} onChange={event => handleChange("cast")(event.target.value)} placeholder="Actor 1, Actor 2, Actor 3" className={styles["admin-field-control"]} />
            </div>

            {/* Scheduled Shows — grouped by date */}
            {editingMovie && (
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Scheduled Shows</label>
                {editingMovieShowtimes.length === 0 ? (
                  <p className={styles["admin-muted-text"]}>No shows scheduled yet. Use "Manage Shows" to add.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(() => {
                      const now = new Date();
                      const upcoming = editingMovieShowtimes
                        .filter(st => new Date(st.startAt) >= now)
                        .sort((a, b) => a.startAt.localeCompare(b.startAt));
                      if (upcoming.length === 0) return (
                        <p className={styles["admin-muted-text"]}>No upcoming shows. All scheduled shows are in the past.</p>
                      );
                      // Group by date key YYYY-MM-DD
                      const byDate = {};
                      for (const st of upcoming) {
                        const dk = st.startAt.slice(0, 10);
                        if (!byDate[dk]) byDate[dk] = [];
                        byDate[dk].push(st);
                      }
                      return Object.entries(byDate).map(([dateKey, slots]) => {
                        const displayDate = new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric"
                        });
                        return (
                          <div key={dateKey}>
                            <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.55, marginBottom: "0.3rem" }}>
                              {displayDate}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                              {slots.map(st => (
                                <span key={st.showtimeId} style={{
                                  padding: "0.2rem 0.6rem",
                                  borderRadius: "0.25rem",
                                  background: "var(--color-secondary, #f3f4f6)",
                                  border: "1px solid var(--color-border, #e5e7eb)",
                                  fontSize: "0.8rem"
                                }}>
                                  {new Date(st.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Description <span style={{ color: "red" }}>*</span></label>
              <textarea value={form.description} onChange={event => handleChange("description")(event.target.value)} placeholder="Movie description" className={styles["admin-description-input"]} />
            </div>

            <div className={styles["admin-assets-card"]}>
              <div className={styles["admin-assets-header"]}>
                <Upload className={styles["admin-icon"]} />
                Upload Assets
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Poster Image Replacement" : <>Poster Image <span style={{ color: "red" }}>*</span></>}
                </label>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange("poster")} />
                <p className={styles["admin-muted-text"]}>
                  {assets.poster?.name ?? (editingMovie?.poster ? "Keep current poster" : "No file selected")}
                </p>
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Trailer Video Replacement" : <>Trailer Video <span style={{ color: "red" }}>*</span></>}
                </label>
                <Input type="file" accept=".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v" onChange={handleFileChange("trailer")} />
                <p className={styles["admin-muted-text"]}>
                  {assets.trailer?.name ?? (editingMovie?.trailerUrl ? "Keep current trailer" : "No file selected")}
                </p>
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Trailer Thumbnail Replacement" : <>Trailer Thumbnail Image <span style={{ color: "red" }}>*</span></>}
                </label>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange("trailerThumbnail")} />
                <p className={styles["admin-muted-text"]}>
                  {assets.trailerThumbnail?.name ?? (editingMovie?.trailerThumbnail ? "Keep current trailer thumbnail" : "No file selected")}
                </p>
              </div>
            </div>

            {submitError && <div className={styles["admin-error-card"]}>
                <p className={styles["admin-error-title"]}>{submitError}</p>
                {adminIssueReport && <div className={styles["admin-issue-report"]}>
                    <p className={styles["admin-muted-text"]}>
                      You can copy and repost this issue report.
                    </p>
                    <pre className={styles["admin-issue-report-code"]}>
                      {adminIssueReport}
                    </pre>
                    <Button type="button" size="sm" variant="outline" onClick={copyIssueReport} className={styles["admin-copy-button"]}>
                      <Copy className={styles["admin-copy-icon"]} />
                      {copiedIssueReport ? "Copied" : "Copy Issue Report"}
                    </Button>
                  </div>}
              </div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveMovie} disabled={isSubmitting} className={styles["admin-submit-button"]}>
              {isSubmitting
                ? "Uploading & Saving..."
                : editingMovie
                  ? "Save Changes"
                  : "Add Movie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleDialog} onOpenChange={open => open ? null : closeScheduleDialog()}>
        <DialogContent className={styles["admin-dialog"]} style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>Manage Shows</DialogTitle>
            <DialogDescription>
              Schedule a new show or view all upcoming scheduled shows.
            </DialogDescription>
          </DialogHeader>

          <div className={styles["admin-form"]} ref={scheduleFormRef}>
            <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>Add a Show</p>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Movie <span style={{ color: "red" }}>*</span></label>
              <Select value={scheduleForm.movieId} onValueChange={value => handleScheduleFormChange("movieId", value)}>
                <SelectTrigger className={styles["admin-field-control"]}>
                  <SelectValue placeholder="Select a movie" />
                </SelectTrigger>
                <SelectContent>
                  {movies.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.title}
                      {m.status === "coming_soon" && m.releaseDate ? ` (from ${m.releaseDate})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles["admin-form-grid-duration"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Date <span style={{ color: "red" }}>*</span></label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={event => handleScheduleFormChange("date", event.target.value)}
                  className={styles["admin-field-control"]}
                />
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Time Slot <span style={{ color: "red" }}>*</span></label>
                <Select value={scheduleForm.timeSlot} onValueChange={value => handleScheduleFormChange("timeSlot", value)}>
                  <SelectTrigger className={styles["admin-field-control"]}>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOT_OPTIONS.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scheduleForm.date && scheduleForm.timeSlot && (
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Available Showrooms</label>
                {isCheckingRooms ? (
                  <p className={styles["admin-muted-text"]}>Checking availability...</p>
                ) : availableShowrooms.length === 0 ? (
                  <p className={styles["admin-muted-text"]}>No showrooms available at this time slot.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {availableShowrooms.map((room) => (
                      <button
                        key={room.showroomId}
                        type="button"
                        onClick={() => setScheduleSelectedRoom(room.showroomId)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderRadius: "0.375rem",
                          border: scheduleSelectedRoom === room.showroomId ? "2px solid var(--color-primary, #2563eb)" : "1px solid var(--color-border, #e5e7eb)",
                          background: scheduleSelectedRoom === room.showroomId ? "var(--color-primary-light, #eff6ff)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.875rem"
                        }}
                      >
                        {room.name}
                        {room.layout && (
                          <span style={{ marginLeft: "0.5rem", opacity: 0.6 }}>
                            ({room.layout.totalSeats} seats)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pendingSlots.length > 0 && (
              <div style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #22c55e", background: "rgba(34,197,94,0.08)" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#22c55e", marginBottom: "0.35rem" }}>
                  {pendingSlots.length} slot{pendingSlots.length !== 1 ? "s" : ""} selected
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {pendingSlots.map((s) => {
                    const dateLabel = new Date(s.dateKey + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const timeLabel = TIME_SLOT_OPTIONS.find((o) => o.value === s.slotValue)?.label ?? s.slotValue;
                    return (
                      <span
                        key={s.key}
                        style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "0.3rem", background: "rgba(34,197,94,0.18)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.4)" }}
                      >
                        {dateLabel} · {timeLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {scheduleError && (
              <div className={styles["admin-error-card"]}>
                <p className={styles["admin-error-title"]}>{scheduleError}</p>
              </div>
            )}
            {scheduleSuccess && (
              <p style={{ color: "var(--color-success, green)", fontWeight: 500 }}>{scheduleSuccess}</p>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", gap: "0.75rem", flexWrap: "wrap" }}>
                <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                  All Scheduled Shows
                  {isLoadingAllShows && <span style={{ fontWeight: 400, opacity: 0.6, marginLeft: "0.5rem", fontSize: "0.8rem" }}>Loading...</span>}
                </p>
                {/* Hall selector — uses showrooms list so halls with zero bookings still appear */}
                {showrooms.length > 0 && (
                  <select
                    value={selectedHall}
                    onChange={(e) => setSelectedHall(e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem", borderRadius: "0.4rem", border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", cursor: "pointer" }}
                  >
                    <option value="">All Halls</option>
                    {showrooms.map((r) => <option key={r.showroomId} value={r.name}>{r.name}</option>)}
                  </select>
                )}
              </div>

              {(() => {
                // hall → dateKey → timeKey → show
                const bookedSet = {};
                for (const s of allScheduledShows) {
                  const hall = s.showroomName || s.showroomId || "Unknown Hall";
                  const dk = s.startAt.slice(0, 10);
                  const tk = s.startAt.slice(11, 16);
                  if (!bookedSet[hall]) bookedSet[hall] = {};
                  if (!bookedSet[hall][dk]) bookedSet[hall][dk] = {};
                  bookedSet[hall][dk][tk] = s;
                }

                // "dateKey_timeKey" → show, for the currently selected movie across ALL halls
                const selectedMovieId = scheduleForm.movieId ? Number(scheduleForm.movieId) : null;
                const selectedMovieByTime = {};
                if (selectedMovieId) {
                  for (const s of allScheduledShows) {
                    if (Number(s.movieId) === selectedMovieId) {
                      const dk = s.startAt.slice(0, 10);
                      const tk = s.startAt.slice(11, 16);
                      selectedMovieByTime[`${dk}_${tk}`] = s;
                    }
                  }
                }

                // Show all halls from showrooms list; fall back to booked-set keys
                const allHallNames = showrooms.length > 0
                  ? showrooms.map((r) => r.name)
                  : Object.keys(bookedSet);
                const hallsToShow = selectedHall ? [selectedHall] : allHallNames;

                // Date range: today + next 13 days
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dates = Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(today);
                  d.setDate(today.getDate() + i);
                  return d.toISOString().slice(0, 10);
                });

                const slots = TIME_SLOT_OPTIONS;

                if (hallsToShow.length === 0) {
                  return <p className={styles["admin-muted-text"]}>No halls found.</p>;
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
                    {/* Legend */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", fontSize: "0.7rem", opacity: 0.8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "0.2rem", background: "var(--primary)", display: "inline-block" }} /> Booked (other movie)</span>
                      {selectedMovieId && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "0.2rem", background: "#3b82f6", display: "inline-block" }} /> Selected movie</span>}
                      {selectedMovieId && <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "0.2rem", background: "#f59e0b", display: "inline-block" }} /> Movie in another hall</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}><span style={{ width: "0.7rem", height: "0.7rem", borderRadius: "0.2rem", background: "rgba(34,197,94,0.3)", border: "1px solid #22c55e", display: "inline-block" }} /> Selected</span>
                    </div>

                    {hallsToShow.map((hall) => (
                      <div key={hall}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--primary)" }}>{hall}</span>
                          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {dates.map((dateKey) => {
                            const dateLabel = new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                            const dayBookings = bookedSet[hall]?.[dateKey] ?? {};
                            return (
                              <div key={dateKey} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", width: "6.5rem", flexShrink: 0 }}>{dateLabel}</span>
                                {slots.map((slot) => {
                                  const slotKey = `${dateKey}_${slot.value}`;
                                  const booked = dayBookings[slot.value]; // any show in this hall
                                  const isThisMovieHere = booked && selectedMovieId && Number(booked.movieId) === selectedMovieId;
                                  const isOtherMovieHere = booked && !isThisMovieHere;
                                  const isThisMovieElsewhere = !booked && selectedMovieId && !!selectedMovieByTime[slotKey];
                                  const isPending = !booked && !isThisMovieElsewhere && pendingSlots.some((s) => s.key === slotKey);

                                  let borderColor, background, color, cursor, titleText;
                                  if (isThisMovieHere) {
                                    borderColor = "#3b82f6"; background = "#3b82f6"; color = "#fff";
                                    cursor = "pointer"; titleText = `${booked.movieTitle} — already scheduled here. Click to cancel.`;
                                  } else if (isOtherMovieHere) {
                                    borderColor = "var(--primary)"; background = "var(--primary)"; color = "var(--primary-foreground)";
                                    cursor = "pointer"; titleText = `${booked.movieTitle} — click to cancel`;
                                  } else if (isThisMovieElsewhere) {
                                    const elsewhere = selectedMovieByTime[slotKey];
                                    borderColor = "#f59e0b"; background = "rgba(245,158,11,0.15)"; color = "#f59e0b";
                                    cursor = "not-allowed"; titleText = `Already scheduled in ${elsewhere.showroomName} — same movie can't run in two halls at once`;
                                  } else if (isPending) {
                                    borderColor = "#22c55e"; background = "rgba(34,197,94,0.18)"; color = "#22c55e";
                                    cursor = "pointer"; titleText = `Deselect ${slot.label}`;
                                  } else {
                                    borderColor = "var(--border)"; background = "transparent"; color = "var(--muted-foreground)";
                                    cursor = "pointer"; titleText = `Add ${slot.label} to schedule`;
                                  }

                                  return (
                                    <button
                                      key={slot.value}
                                      type="button"
                                      title={titleText}
                                      disabled={isThisMovieElsewhere}
                                      onClick={() => {
                                        if (isThisMovieHere || isOtherMovieHere) {
                                          setCancelTarget(booked);
                                        } else if (!isThisMovieElsewhere) {
                                          togglePendingSlot(dateKey, slot.value, hall);
                                          scheduleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        }
                                      }}
                                      style={{
                                        padding: "0.25rem 0.55rem",
                                        borderRadius: "0.35rem",
                                        border: `1px solid ${borderColor}`,
                                        fontSize: "0.72rem",
                                        fontWeight: 500,
                                        cursor,
                                        whiteSpace: "nowrap",
                                        transition: "background 0.15s, color 0.15s, border-color 0.15s",
                                        background,
                                        color,
                                        opacity: isThisMovieElsewhere ? 0.7 : 1,
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!booked && !isPending && !isThisMovieElsewhere) { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.color = "#22c55e"; }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!booked && !isPending && !isThisMovieElsewhere) { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = color; }
                                      }}
                                    >
                                      {slot.label}
                                      {(isThisMovieHere || isOtherMovieHere) && <span style={{ marginLeft: "0.3rem", fontSize: "0.65rem", opacity: 0.85 }}>✕</span>}
                                      {isThisMovieElsewhere && <span style={{ marginLeft: "0.3rem", fontSize: "0.65rem" }}>⊘</span>}
                                      {isPending && <span style={{ marginLeft: "0.3rem", fontSize: "0.65rem" }}>✓</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeScheduleDialog} disabled={isScheduling}>Close</Button>
            <Button onClick={handleScheduleShow} disabled={isScheduling} className={styles["admin-submit-button"]}>
              {isScheduling
                ? "Scheduling..."
                : pendingSlots.length > 1
                  ? `Schedule ${pendingSlots.length} Shows`
                  : "Schedule Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel showtime confirm dialog */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelError(""); } }}>
        <DialogContent className={styles["admin-dialog"]}>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Show</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  Are you sure you want to cancel <strong>{cancelTarget.movieTitle}</strong> at{" "}
                  <strong>
                    {new Date(cancelTarget.startAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(cancelTarget.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </strong>{" "}
                  in <strong>{cancelTarget.showroomName}</strong>? This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {cancelError && <p style={{ color: "var(--destructive)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{cancelError}</p>}
          <DialogFooter style={{ marginTop: "1rem" }}>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelError(""); }} disabled={isCancelling}>Keep Show</Button>
            <Button variant="destructive" onClick={handleCancelShow} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPromotionDialog} onOpenChange={open => open ? null : closePromotionDialog()}>
        <DialogContent className={styles["admin-dialog"]}>
          <DialogHeader>
            <DialogTitle>Send Promotion Email</DialogTitle>
            <DialogDescription>
              Compose a promotion and send it to all users who have opted in to promotions.
            </DialogDescription>
          </DialogHeader>

          <div className={styles["admin-form"]}>
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Promotion Title <span style={{ color: "red" }}>*</span></label>
              <Input value={promotionForm.title} onChange={event => handlePromotionChange("title")(event.target.value)} placeholder="e.g. Weekend Special — 20% Off" className={styles["admin-field-control"]} />
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Message <span style={{ color: "red" }}>*</span></label>
              <textarea value={promotionForm.message} onChange={event => handlePromotionChange("message")(event.target.value)} placeholder="Describe the promotion details..." className={styles["admin-description-input"]} />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border, #e5e7eb)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
              <p style={{ fontSize: "0.8rem", opacity: 0.6, marginBottom: "0.5rem" }}>
                Optional: attach a promo code to this promotion. If provided, the code will be created and included in the email sent to subscribers.
              </p>
              <div className={styles["admin-form-grid-duration"]}>
                <div className={styles["admin-form-field"]}>
                  <label className={styles["admin-field-label"]}>Promo Code</label>
                  <Input
                    value={promotionForm.promoCode}
                    onChange={event => handlePromotionChange("promoCode")(event.target.value.toUpperCase())}
                    placeholder="e.g. SAVE20"
                    className={styles["admin-field-control"]}
                  />
                </div>
                <div className={styles["admin-form-field"]}>
                  <label className={styles["admin-field-label"]}>Discount % {promotionForm.promoCode.trim() && <span style={{ color: "red" }}>*</span>}</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={promotionForm.discountPercent}
                    onChange={event => handlePromotionChange("discountPercent")(event.target.value)}
                    placeholder="e.g. 20"
                    className={styles["admin-field-control"]}
                  />
                </div>
              </div>
              {promotionForm.promoCode.trim() && (
                <div className={styles["admin-form-field"]} style={{ marginTop: "0.5rem" }}>
                  <label className={styles["admin-field-label"]}>Expiry Date &amp; Time (optional)</label>
                  <Input
                    type="datetime-local"
                    value={promotionForm.expiresAt}
                    onChange={event => handlePromotionChange("expiresAt")(event.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className={styles["admin-field-control"]}
                  />
                  <p style={{ fontSize: "0.75rem", opacity: 0.55, marginTop: "0.25rem" }}>
                    If set, the promo code will stop working after this date/time.
                  </p>
                </div>
              )}
            </div>

            {promotionError && (
              <div className={styles["admin-error-card"]}>
                <p className={styles["admin-error-title"]}>{promotionError}</p>
              </div>
            )}

            {promotionSendResult && (
              <div className={styles["admin-form-field"]}>
                <p style={{ color: "var(--color-success, green)", fontWeight: 500 }}>
                  Promotion sent successfully to {promotionSendResult.sentCount} subscriber(s).
                  {promotionForm.promoCode.trim() && " Promo code created and included in the email."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePromotionDialog} disabled={isSendingPromotion}>
              {promotionSendResult ? "Close" : "Cancel"}
            </Button>
            {!promotionSendResult && (
              <Button onClick={handleSendPromotion} disabled={isSendingPromotion} className={styles["admin-submit-button"]}>
                {isSendingPromotion ? "Sending..." : "Send to Subscribers"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}

export default function AdminPageRoute() {
  return (
    <AdminPage
      movies={[]}
      onViewMovie={() => {}}
      onCreateMovie={async () => {}}
      onUpdateMovie={async () => {}}
      onDeleteMovie={async () => {}}
    />
  );
}
