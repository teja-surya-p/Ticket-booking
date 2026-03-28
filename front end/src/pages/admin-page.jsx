"use client";

import { Film, Plus, Edit2, Trash2, Eye, BarChart3, Copy, Upload, ChevronDown } from "lucide-react";
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
              <p className={styles["admin-showtime-text"]}>
                {movie.showtimes.join(", ")}
              </p>
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
                    {movie.showtimes.join(", ")}
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

            <div className={styles["admin-form-field"]}>
              <label className={styles["admin-field-label"]}>Showtimes (comma separated)</label>
              <Input value={form.showtimes} onChange={event => handleChange("showtimes")(event.target.value)} placeholder="2:00 PM, 5:00 PM, 8:00 PM" className={styles["admin-field-control"]} />
            </div>

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
