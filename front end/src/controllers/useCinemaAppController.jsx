import { useEffect, useMemo, useState } from "react";
import { createMovie, deleteMovie, fetchMovies, getMeaningfulErrorMessage } from "@/services";
import {
  addMovieToCart,
  getCartCount,
  removeCartItem,
  removeMovieFromCart,
  updateCartTickets
} from "@/models/cart-model";
import {
  filterMoviesBySearchAndGenre,
  getMovieGenres,
  splitMoviesByStatus
} from "@/models/movie-model";

export function useCinemaAppController() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");
  const [view, setView] = useState({ type: "home" });
  const [movies, setMovies] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesLoadError, setMoviesLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadMovies = async () => {
      try {
        const data = await fetchMovies();
        if (isMounted) {
          setMovies(Array.isArray(data) ? data : []);
          setMoviesLoadError(null);
        }
      } catch (error) {
        if (isMounted) {
          setMovies([]);
          setMoviesLoadError(getMeaningfulErrorMessage(error, "user"));
        }
      } finally {
        if (isMounted) {
          setMoviesLoading(false);
        }
      }
    };

    void loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredMovies = useMemo(
    () => filterMoviesBySearchAndGenre(movies, searchQuery, selectedGenre),
    [movies, searchQuery, selectedGenre]
  );

  const availableGenres = useMemo(() => getMovieGenres(movies), [movies]);

  const { currentlyRunning, comingSoon } = useMemo(
    () => splitMoviesByStatus(filteredMovies),
    [filteredMovies]
  );

  const handleMovieClick = (movie) => {
    setView({
      type: "detail",
      movie
    });
  };

  const handleWatchTrailer = (movie) => {
    setView({
      type: "detail",
      movie,
      autoOpenTrailer: true
    });
  };

  const handleAddToCart = (movie, showtime) => {
    setCartItems((previous) => addMovieToCart(previous, movie, showtime));
    setView({ type: "cart" });
  };

  const handleAddToCartFromCard = (movie) => {
    const defaultShowtime = movie.showtimes[0];
    if (!defaultShowtime) {
      return;
    }
    handleAddToCart(movie, defaultShowtime);
  };

  const handleCreateMovie = async (payload) => {
    const createdMovie = await createMovie(payload);
    setMovies((previous) => [createdMovie, ...previous]);
  };

  const handleDeleteMovie = async (movieId) => {
    await deleteMovie(movieId);
    setMovies((previous) => previous.filter((movie) => movie.id !== movieId));
    setCartItems((previous) => removeMovieFromCart(previous, movieId));
    setView((previous) =>
      previous.type === "detail" && previous.movie?.id === movieId
        ? { type: "home" }
        : previous
    );
  };

  const handleUpdateCartTickets = (itemId, type, delta) => {
    setCartItems((previous) => updateCartTickets(previous, itemId, type, delta));
  };

  const handleRemoveCartItem = (itemId) => {
    setCartItems((previous) => removeCartItem(previous, itemId));
  };

  const handleCheckout = ({ confirmedBookings, total, completedItemIds, warning } = {}) => {
    if (!Array.isArray(confirmedBookings) || confirmedBookings.length === 0) {
      return;
    }

    const orderId = `CB-${Date.now()}`;

    setCartItems((previous) =>
      Array.isArray(completedItemIds) && completedItemIds.length > 0
        ? previous.filter((item) => !completedItemIds.includes(item.id))
        : previous
    );
    setView({
      type: "confirmation",
      orderId,
      total,
      bookings: confirmedBookings,
      warning
    });
  };

  const cartCount = useMemo(() => getCartCount(cartItems), [cartItems]);

  const navigateHome = () => {
    setView({ type: "home" });
  };

  return {
    isAdmin,
    setIsAdmin,
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    selectedDate,
    setSelectedDate,
    view,
    setView,
    movies,
    cartItems,
    moviesLoading,
    moviesLoadError,
    filteredMovies,
    availableGenres,
    currentlyRunning,
    comingSoon,
    cartCount,
    handleMovieClick,
    handleWatchTrailer,
    handleAddToCart,
    handleAddToCartFromCard,
    handleCreateMovie,
    handleDeleteMovie,
    handleUpdateCartTickets,
    handleRemoveCartItem,
    handleCheckout,
    navigateHome
  };
}
