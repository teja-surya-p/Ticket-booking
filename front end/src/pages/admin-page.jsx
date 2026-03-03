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
import "./admin-page.module.css";
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

  return <div className={"admin-dashboard"}>
      <div className={"admin-header"}>
        <h1 className={"admin-title"}>Admin Dashboard</h1>
        <p className={"admin-subtitle"}>
          Manage movies, showtimes, and bookings
        </p>
      </div>

      {/* Stats */}
      <div className={"admin-stats-grid"}>
        <div className={"admin-stat-card"}>
          <div className={"admin-stat-label"}>
            <Film className={"admin-icon"} />
            <span className={"admin-stat-label-text"}>
              Total Movies
            </span>
          </div>
          <p className={"admin-stat-value"}>
            {movies.length}
          </p>
        </div>
        <div className={"admin-stat-card"}>
          <div className={"admin-stat-label"}>
            <Eye className={"admin-icon"} />
            <span className={"admin-stat-label-text"}>
              Now Playing
            </span>
          </div>
          <p className={"admin-stat-value-highlight"}>
            {currentlyRunning}
          </p>
        </div>
        <div className={"admin-stat-card"}>
          <div className={"admin-stat-label"}>
            <BarChart3 className={"admin-icon"} />
            <span className={"admin-stat-label-text"}>
              Coming Soon
            </span>
          </div>
          <p className={"admin-stat-value"}>
            {comingSoon}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className={"admin-actions"}>
        <div className={"admin-inline"}>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={"admin-status-filter"}>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Movies</SelectItem>
              <SelectItem value="currently_running">Now Playing</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateDialog} className={"admin-add-button"}>
          <Plus className={"admin-icon"} />
          Add Movie
        </Button>
      </div>

      {/* Movie Cards (mobile) */}
      <div className={"admin-mobile-list"}>
        {filteredMovies.map(movie => {
        const posterUrl = getMoviePosterUrl(movie);
        return <div key={movie.id} className={"admin-mobile-card"}>
            <div className={"admin-mobile-card-header"}>
              <img src={posterUrl} alt={movie.title} className={"admin-mobile-poster"} />
              <div className={"admin-mobile-content"}>
                <p className={"admin-mobile-movie-title"}>
                  {movie.title}
                </p>
                <p className={"admin-muted-text"}>{movie.duration}</p>
                <div className={"admin-badge-group"}>
                  {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-${genre}`} variant="secondary" className={"admin-genre-badge"}>
                      {genre}
                    </Badge>)}
                  <Badge className={movie.status === "currently_running" ? "admin-status-now" : "admin-status-soon"} variant="outline">
                    {movie.status === "currently_running" ? "Now Playing" : "Coming Soon"}
                  </Badge>
                  {shouldShowMovieRating(movie) && <Badge variant="outline" className={"admin-rating-badge"}>
                      {movie.rating}
                    </Badge>}
                </div>
              </div>
            </div>
            <div className={"admin-mobile-card-footer"}>
              <p className={"admin-showtime-text"}>
                {movie.showtimes.join(", ")}
              </p>
              <div className={"admin-mobile-actions"}>
                <Button variant="ghost" size="sm" onClick={() => onViewMovie(movie)} aria-label={`View ${movie.title}`}>
                  <Eye className={"admin-icon"} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog(movie)} aria-label={`Edit ${movie.title}`}>
                  <Edit2 className={"admin-icon"} />
                </Button>
                <Button variant="ghost" size="sm" className={"admin-delete-button"} onClick={() => handleDeleteMovie(movie)} disabled={deletingMovieId === movie.id || isSubmitting} aria-label={`Delete ${movie.title}`}>
                  <Trash2 className={"admin-icon"} />
                </Button>
              </div>
            </div>
          </div>;
      })}
      </div>

      {/* Movie Table (desktop) */}
      <div className={"admin-table-wrapper"}>
        <div className={"admin-table-scroll"}>
          <table className={"admin-table"}>
            <thead>
              <tr className={"admin-table-header-row"}>
                <th className={"admin-table-header-cell"}>
                  Movie
                </th>
                <th className={"admin-table-header-cell"}>
                  Genre
                </th>
                <th className={"admin-table-header-cell"}>
                  Rating
                </th>
                <th className={"admin-table-header-cell"}>
                  Status
                </th>
                <th className={"admin-table-header-cell"}>
                  Showtimes
                </th>
                <th className={"admin-table-header-cell-actions"}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map((movie, idx) => {
              const posterUrl = getMoviePosterUrl(movie);
              return <tr key={movie.id} className={["admin-table-row", idx % 2 === 0 ? "" : "admin-table-row-alt"].filter(Boolean).join(" ")}>
                  <td className={"admin-table-cell"}>
                    <div className={"admin-inline"}>
                      <img src={posterUrl} alt={movie.title} className={"admin-table-poster"} />
                      <div>
                        <p className={"admin-field-label"}>
                          {movie.title}
                        </p>
                        <p className={"admin-muted-text"}>
                          {movie.duration}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={"admin-table-cell"}>
                    <div className={"admin-badge-group"}>
                      {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-table-${genre}`} variant="secondary" className={"admin-table-genre-badge"}>
                          {genre}
                        </Badge>)}
                    </div>
                  </td>
                  <td className={"admin-table-rating"}>
                    {shouldShowMovieRating(movie) ? movie.rating : <span className={"admin-muted-text"}>Not set</span>}
                  </td>
                  <td className={"admin-table-cell"}>
                    <Badge className={movie.status === "currently_running" ? "admin-table-status-now" : "admin-table-status-soon"} variant="outline">
                      {movie.status === "currently_running" ? "Now Playing" : "Coming Soon"}
                    </Badge>
                  </td>
                  <td className={"admin-table-showtimes"}>
                    {movie.showtimes.join(", ")}
                  </td>
                  <td className={"admin-table-cell"}>
                    <div className={"admin-table-actions"}>
                      <Button variant="ghost" size="icon-sm" onClick={() => onViewMovie(movie)} aria-label={`View ${movie.title}`}>
                        <Eye className={"admin-icon"} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(movie)} aria-label={`Edit ${movie.title}`}>
                        <Edit2 className={"admin-icon"} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className={"admin-delete-button"} onClick={() => handleDeleteMovie(movie)} disabled={deletingMovieId === movie.id || isSubmitting} aria-label={`Delete ${movie.title}`}>
                        <Trash2 className={"admin-icon"} />
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
        <DialogContent className={"admin-dialog"}>
          <DialogHeader>
            <DialogTitle>{editingMovie ? "Edit Movie" : "Add New Movie"}</DialogTitle>
            <DialogDescription>
              {editingMovie
                ? "Update any movie fields below. File uploads are optional while editing, and unchanged assets will be kept."
                : "Upload poster, trailer video, and trailer thumbnail. Use JPG, PNG, or WebP for images and MP4, MOV, or M4V for trailers so Safari can render them reliably."}
            </DialogDescription>
          </DialogHeader>

          <div className={"admin-form"}>
            <div className={"admin-form-field"}>
              <label className={"admin-field-label"}>Title</label>
              <Input value={form.title} onChange={event => handleChange("title")(event.target.value)} placeholder="Movie title" className={"admin-field-control"} />
            </div>

            <div className={"admin-form-grid-meta"}>
              <div className={"admin-form-field"}>
                <label className={"admin-field-label"}>Genres</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className={"admin-field-control"}>
                      <span>{form.genres.length > 0 ? form.genres.join(", ") : "Select genres"}</span>
                      <ChevronDown className={"admin-icon"} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {genreOptions.map((genre) => <DropdownMenuCheckboxItem key={genre} checked={form.genres.includes(genre)} onCheckedChange={() => handleToggleGenre(genre)} onSelect={event => event.preventDefault()}>
                        {genre}
                      </DropdownMenuCheckboxItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className={"admin-muted-text"}>
                  {form.genres.length > 0 ? `${form.genres.length} genre${form.genres.length > 1 ? "s" : ""} selected` : "Select one or more genres"}
                </p>
              </div>

              {form.status === "currently_running" ? <div className={"admin-form-field"}>
                  <label className={"admin-field-label"}>Rating</label>
                  <Select value={form.rating} onValueChange={value => handleChange("rating")(value)}>
                    <SelectTrigger className={"admin-field-control"}>
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratingOptions.map(rating => <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div> : <div className={"admin-form-field"}>
                  <label className={"admin-field-label"}>Rating</label>
                  <p className={"admin-muted-text"}>
                    Rating is only required for currently playing movies.
                  </p>
                </div>}

              <div className={"admin-form-field"}>
                <label className={"admin-field-label"}>Status</label>
                <Select value={form.status} onValueChange={value => handleChange("status")(value)}>
                  <SelectTrigger className={"admin-field-control"}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currently_running">Currently Running</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={"admin-form-grid-duration"}>
              <div className={"admin-form-field"}>
                <label className={"admin-field-label"}>Duration</label>
                <div className={"admin-duration-selects"}>
                  <Select value={form.durationHours} onValueChange={value => handleChange("durationHours")(value)}>
                    <SelectTrigger className={"admin-field-control"}>
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationHourOptions.map(hours => <SelectItem key={`duration-hour-${hours}`} value={hours}>
                          {hours}h
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.durationMinutes} onValueChange={value => handleChange("durationMinutes")(value)}>
                    <SelectTrigger className={"admin-field-control"}>
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationMinuteOptions.map(minutes => <SelectItem key={`duration-minute-${minutes}`} value={minutes}>
                          {minutes}m
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className={"admin-muted-text"}>
                  {selectedDuration ? `Selected: ${selectedDuration}` : "Select hours and minutes"}
                </p>
              </div>
              <div className={"admin-form-field"}>
                <label className={"admin-field-label"}>Director</label>
                <Input value={form.director} onChange={event => handleChange("director")(event.target.value)} placeholder="Director name" className={"admin-field-control"} />
              </div>
            </div>

            <div className={"admin-form-field"}>
              <label className={"admin-field-label"}>Cast (comma separated)</label>
              <Input value={form.cast} onChange={event => handleChange("cast")(event.target.value)} placeholder="Actor 1, Actor 2, Actor 3" className={"admin-field-control"} />
            </div>

            <div className={"admin-form-field"}>
              <label className={"admin-field-label"}>Showtimes (comma separated)</label>
              <Input value={form.showtimes} onChange={event => handleChange("showtimes")(event.target.value)} placeholder="2:00 PM, 5:00 PM, 8:00 PM" className={"admin-field-control"} />
            </div>

            <div className={"admin-form-field"}>
              <label className={"admin-field-label"}>Description</label>
              <textarea value={form.description} onChange={event => handleChange("description")(event.target.value)} placeholder="Movie description" className={"admin-description-input"} />
            </div>

            <div className={"admin-assets-card"}>
              <div className={"admin-assets-header"}>
                <Upload className={"admin-icon"} />
                Upload Assets
              </div>

              <div className={"admin-form-field"}>
                <label className={"admin-assets-label"}>
                  {editingMovie ? "Poster Image Replacement" : "Poster Image"}
                </label>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange("poster")} />
                <p className={"admin-muted-text"}>
                  {assets.poster?.name ?? (editingMovie?.poster ? "Keep current poster" : "No file selected")}
                </p>
              </div>

              <div className={"admin-form-field"}>
                <label className={"admin-assets-label"}>
                  {editingMovie ? "Trailer Video Replacement" : "Trailer Video"}
                </label>
                <Input type="file" accept=".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v" onChange={handleFileChange("trailer")} />
                <p className={"admin-muted-text"}>
                  {assets.trailer?.name ?? (editingMovie?.trailerUrl ? "Keep current trailer" : "No file selected")}
                </p>
              </div>

              <div className={"admin-form-field"}>
                <label className={"admin-assets-label"}>
                  {editingMovie ? "Trailer Thumbnail Replacement" : "Trailer Thumbnail Image"}
                </label>
                <Input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange("trailerThumbnail")} />
                <p className={"admin-muted-text"}>
                  {assets.trailerThumbnail?.name ?? (editingMovie?.trailerThumbnail ? "Keep current trailer thumbnail" : "No file selected")}
                </p>
              </div>
            </div>

            {submitError && <div className={"admin-error-card"}>
                <p className={"admin-error-title"}>{submitError}</p>
                {adminIssueReport && <div className={"admin-issue-report"}>
                    <p className={"admin-muted-text"}>
                      You can copy and repost this issue report.
                    </p>
                    <pre className={"admin-issue-report-code"}>
                      {adminIssueReport}
                    </pre>
                    <Button type="button" size="sm" variant="outline" onClick={copyIssueReport} className={"admin-copy-button"}>
                      <Copy className={"admin-copy-icon"} />
                      {copiedIssueReport ? "Copied" : "Copy Issue Report"}
                    </Button>
                  </div>}
              </div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveMovie} disabled={isSubmitting} className={"admin-submit-button"}>
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
