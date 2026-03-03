"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import "./movie-filters.module.css";
const showDates = ["Today", "Tomorrow", "This Weekend"];
export function MovieFilters({
  availableGenres,
  selectedGenre,
  onGenreChange,
  selectedDate,
  onDateChange
}) {
  const hasFilters = selectedGenre !== "all" || selectedDate !== "all";
  return <div className={"movie-filters-class-1"}>
      <Select value={selectedGenre} onValueChange={onGenreChange}>
        <SelectTrigger className={"movie-filters-class-2"}>
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Genres</SelectItem>
          {availableGenres.map(genre => <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={selectedDate} onValueChange={onDateChange}>
        <SelectTrigger className={"movie-filters-class-2"}>
          <SelectValue placeholder="Show Date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dates</SelectItem>
          {showDates.map(date => <SelectItem key={date} value={date}>
              {date}
            </SelectItem>)}
        </SelectContent>
      </Select>

      {hasFilters && <Button variant="ghost" size="sm" onClick={() => {
      onGenreChange("all");
      onDateChange("all");
    }} className={"movie-filters-class-3"}>
          <X className={"movie-filters-class-4"} />
          Clear
        </Button>}
    </div>;
}
