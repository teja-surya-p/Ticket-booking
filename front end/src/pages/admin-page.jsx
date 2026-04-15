"use client";

import { CalendarPlus, Film, Plus, Edit2, Trash2, Eye, BarChart3, Copy, Upload, ChevronDown, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminPageController } from "@/controllers/useAdminPageController";
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
    handleScheduleShow,
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
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Title</label>
              <Input value={form.title} onChange={event => handleChange("title")(event.target.value)} placeholder="Movie title" className={styles["admin-field-control"]} />
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Showroom</label>
              <Select value={form.showroomId} onValueChange={value => handleChange("showroomId")(value)} disabled={isLoadingShowrooms}>
                <SelectTrigger className={styles["admin-field-control"]}>
                  <SelectValue placeholder={isLoadingShowrooms ? "Loading showrooms..." : "Select a showroom"} />
                </SelectTrigger>
                <SelectContent>
                  {showrooms.map((room) => (
                    <SelectItem key={room.showroomId} value={room.showroomId}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={styles["admin-muted-text"]}>
                Determines the seating capacity and layout for this movie.
              </p>
            </div>

            <div className={styles["admin-form-grid-meta"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Genres</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className={styles["admin-field-control"]}>
                      <span>{form.genres.length > 0 ? form.genres.join(", ") : "Select genres"}</span>
                      <ChevronDown className={styles["admin-icon"]} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {genreOptions.map((genre) => <DropdownMenuCheckboxItem key={genre} checked={form.genres.includes(genre)} onCheckedChange={() => handleToggleGenre(genre)} onSelect={event => event.preventDefault()}>
                        {genre}
                      </DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className={styles["admin-muted-text"]}>
                  {form.genres.length > 0 ? `${form.genres.length} genre${form.genres.length > 1 ? "s" : ""} selected` : "Select one or more genres"}
                </p>
              </div>

              {form.status === "currently_running" ? <div className={styles["admin-form-field"]}>
                  <label className={styles["admin-field-label"]}>Rating</label>
                  <Select value={form.rating} onValueChange={value => handleChange("rating")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratingOptions.map(rating => <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div> : <div className={styles["admin-form-field"]}>
                  <label className={styles["admin-field-label"]}>Rating</label>
                  <p className={styles["admin-muted-text"]}>
                    Rating is only required for currently playing movies.
                  </p>
                </div>}

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Status</label>
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
            </div>

            <div className={styles["admin-form-grid-duration"]}>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Duration</label>
                <div className={styles["admin-duration-selects"]}>
                  <Select value={form.durationHours} onValueChange={value => handleChange("durationHours")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationHourOptions.map(hours => <SelectItem key={`duration-hour-${hours}`} value={hours}>
                          {hours}h
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.durationMinutes} onValueChange={value => handleChange("durationMinutes")(value)}>
                    <SelectTrigger className={styles["admin-field-control"]}>
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationMinuteOptions.map(minutes => <SelectItem key={`duration-minute-${minutes}`} value={minutes}>
                          {minutes}m
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className={styles["admin-muted-text"]}>
                  {selectedDuration ? `Selected: ${selectedDuration}` : "Select hours and minutes"}
                </p>
              </div>
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Director</label>
                <Input value={form.director} onChange={event => handleChange("director")(event.target.value)} placeholder="Director name" className={styles["admin-field-control"]} />
              </div>
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Cast (comma separated)</label>
              <Input value={form.cast} onChange={event => handleChange("cast")(event.target.value)} placeholder="Actor 1, Actor 2, Actor 3" className={styles["admin-field-control"]} />
            </div>

            {editingMovie && (
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Scheduled Shows</label>
                {editingMovieShowtimes.length === 0 ? (
                  <p className={styles["admin-muted-text"]}>No shows scheduled yet. Use "Schedule Show" to add.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {editingMovieShowtimes.map((st) => (
                      <span
                        key={st.showtimeId}
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "0.25rem",
                          background: "var(--color-muted, #f3f4f6)",
                          fontSize: "0.8rem"
                        }}
                      >
                        {new Date(st.startAt).toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Description</label>
              <textarea value={form.description} onChange={event => handleChange("description")(event.target.value)} placeholder="Movie description" className={styles["admin-description-input"]} />
            </div>

            <div className={styles["admin-assets-card"]}>
              <div className={styles["admin-assets-header"]}>
                <Upload className={styles["admin-icon"]} />
                Upload Assets
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Poster Image Replacement" : "Poster Image"}
                </label>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange("poster")} />
                <p className={styles["admin-muted-text"]}>
                  {assets.poster?.name ?? (editingMovie?.poster ? "Keep current poster" : "No file selected")}
                </p>
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Trailer Video Replacement" : "Trailer Video"}
                </label>
                <Input type="file" accept=".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v" onChange={handleFileChange("trailer")} />
                <p className={styles["admin-muted-text"]}>
                  {assets.trailer?.name ?? (editingMovie?.trailerUrl ? "Keep current trailer" : "No file selected")}
                </p>
              </div>

              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-assets-label"]}>
                  {editingMovie ? "Trailer Thumbnail Replacement" : "Trailer Thumbnail Image"}
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
        <DialogContent className={styles["admin-dialog"]}>
          <DialogHeader>
            <DialogTitle>Manage Showtimes — Schedule a Show</DialogTitle>
            <DialogDescription>
              Pick a movie, choose a date and time, then select an available showroom.
            </DialogDescription>
          </DialogHeader>

          <div className={styles["admin-form"]}>
            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Movie</label>
              <Select value={scheduleForm.movieId} onValueChange={value => handleScheduleFormChange("movieId", value)}>
                <SelectTrigger className={styles["admin-field-control"]}>
                  <SelectValue placeholder="Select a movie" />
                </SelectTrigger>
                <SelectContent>
                  {movies.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Date &amp; Time</label>
              <Input
                type="datetime-local"
                value={scheduleForm.startAt}
                onChange={event => handleScheduleFormChange("startAt", event.target.value)}
                className={styles["admin-field-control"]}
              />
            </div>

            {scheduleForm.startAt && (
              <div className={styles["admin-form-field"]}>
                <label className={styles["admin-field-label"]}>Available Showrooms</label>
                {isCheckingRooms ? (
                  <p className={styles["admin-muted-text"]}>Checking availability...</p>
                ) : availableShowrooms.length === 0 ? (
                  <p className={styles["admin-muted-text"]}>No showrooms available at this time.</p>
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

            {scheduleError && (
              <div className={styles["admin-error-card"]}>
                <p className={styles["admin-error-title"]}>{scheduleError}</p>
              </div>
            )}
            {scheduleSuccess && (
              <p style={{ color: "var(--color-success, green)", fontWeight: 500 }}>{scheduleSuccess}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeScheduleDialog} disabled={isScheduling}>Close</Button>
            {!scheduleSuccess && (
              <Button onClick={handleScheduleShow} disabled={isScheduling} className={styles["admin-submit-button"]}>
                {isScheduling ? "Scheduling..." : "Schedule Show"}
              </Button>
            )}
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
              <label className={styles["admin-field-label"]}>Promotion Title</label>
              <Input value={promotionForm.title} onChange={event => handlePromotionChange("title")(event.target.value)} placeholder="e.g. Weekend Special — 20% Off" className={styles["admin-field-control"]} />
            </div>

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Message</label>
              <textarea value={promotionForm.message} onChange={event => handlePromotionChange("message")(event.target.value)} placeholder="Describe the promotion details..." className={styles["admin-description-input"]} />
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
