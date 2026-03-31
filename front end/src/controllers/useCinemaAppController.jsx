import { useEffect, useMemo, useState } from "react";
import {
  addFavoriteMovie,
  createMovie,
  deleteMovie,
  fetchFavorites,
  fetchCurrentUserProfile,
  fetchMovies,
  getMeaningfulErrorMessage,
  removeFavoriteMovie,
  signOutCurrentUser,
  subscribeToAuthState,
  updateMovie
} from "@/services";
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

function normalizeMovieIdKey(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return "";
}

function addFavoriteId(movieIds, movieIdKey) {
  const normalized = normalizeMovieIdKey(movieIdKey);
  if (!normalized) {
    return [];
  }

  const ids = Array.isArray(movieIds) ? movieIds : [];
  const nextIds = ids.map((id) => normalizeMovieIdKey(id)).filter(Boolean);
  if (nextIds.includes(normalized)) {
    return nextIds;
  }

  return [...nextIds, normalized];
}

function removeFavoriteId(movieIds, movieIdKey) {
  const normalized = normalizeMovieIdKey(movieIdKey);
  return (Array.isArray(movieIds) ? movieIds : [])
    .map((id) => normalizeMovieIdKey(id))
    .filter((id) => id && id !== normalized);
}

function parseFavoriteMovieIds(payload) {
  const candidateMovieIds = Array.isArray(payload?.movieIds)
    ? payload.movieIds
    : Array.isArray(payload?.favorites)
      ? payload.favorites.map((favorite) => favorite?.movieId)
      : [];

  return Array.from(
    new Set(candidateMovieIds.map((id) => normalizeMovieIdKey(id)).filter(Boolean))
  );
}

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
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [loadedCartKey, setLoadedCartKey] = useState("");
  const [favoriteMovieIds, setFavoriteMovieIds] = useState([]);
  const [favoritePendingMovieIds, setFavoritePendingMovieIds] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const cartStorageKey = useMemo(
    () => `cinebook:cart:${typeof currentUser?.uid === "string" ? currentUser.uid : "guest"}`,
    [currentUser?.uid]
  );

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedAdminState = window.localStorage.getItem("cinebook:admin") === "true";
    setIsAdmin(storedAdminState);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user ?? null);
      setAuthBusy(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUserProfile = async () => {
      if (!currentUser) {
        setCurrentUserProfile(null);
        setProfileError("");
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      const result = await fetchCurrentUserProfile();
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setCurrentUserProfile(result.profile ?? null);
        setProfileLoading(false);
        return;
      }

      setProfileError(result.message || "Unable to load your profile details.");
      setCurrentUserProfile({
        uid: currentUser.uid ?? "",
        email: currentUser.email ?? "",
        displayName: currentUser.displayName ?? "",
        firstName: "",
        lastName: "",
        phone: "",
        phoneNumber: "",
        address: null,
        emailVerified: Boolean(currentUser.emailVerified),
        status: currentUser.emailVerified ? "Active" : "Inactive"
      });
      setProfileLoading(false);
    };

    void loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser]);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      if (!currentUser || typeof currentUser.getIdToken !== "function") {
        setFavoriteMovieIds([]);
        setFavoritePendingMovieIds([]);
        setFavoritesLoading(false);
        return;
      }

      setFavoritesLoading(true);

      try {
        const token = await currentUser.getIdToken();
        const response = await fetchFavorites(token);
        if (!cancelled) {
          setFavoriteMovieIds(parseFavoriteMovieIds(response));
        }
      } catch {
        if (!cancelled) {
          setFavoriteMovieIds([]);
        }
      } finally {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(cartStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCartItems([]);
    } finally {
      setLoadedCartKey(cartStorageKey);
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || loadedCartKey !== cartStorageKey) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems, cartStorageKey, loadedCartKey]);

  const filteredMovies = useMemo(
    () => filterMoviesBySearchAndGenre(movies, searchQuery, selectedGenre),
    [movies, searchQuery, selectedGenre]
  );

  const availableGenres = useMemo(() => getMovieGenres(movies), [movies]);

  const { currentlyRunning, comingSoon } = useMemo(
    () => splitMoviesByStatus(filteredMovies),
    [filteredMovies]
  );
  const favoriteMovieIdSet = useMemo(
    () => new Set(favoriteMovieIds.map((movieId) => normalizeMovieIdKey(movieId)).filter(Boolean)),
    [favoriteMovieIds]
  );
  const favoritePendingMovieIdSet = useMemo(
    () =>
      new Set(
        favoritePendingMovieIds
          .map((movieId) => normalizeMovieIdKey(movieId))
          .filter(Boolean)
      ),
    [favoritePendingMovieIds]
  );
  const favoriteMovies = useMemo(
    () => movies.filter((movie) => favoriteMovieIdSet.has(normalizeMovieIdKey(movie?.id))),
    [movies, favoriteMovieIdSet]
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
    if (!showtime) {
      return;
    }

    setAuthMessage("");
    setCartItems((previous) => addMovieToCart(previous, movie, showtime));
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

  const handleUpdateMovie = async (movieId, payload) => {
    const updatedMovie = await updateMovie(movieId, payload);

    setMovies((previous) =>
      previous.map((movie) => (movie.id === movieId ? updatedMovie : movie))
    );
    setCartItems((previous) =>
      previous.map((item) =>
        item.movie.id === movieId
          ? {
              ...item,
              movie: updatedMovie
            }
          : item
      )
    );
    setView((previous) =>
      previous.type === "detail" && previous.movie?.id === movieId
        ? {
            ...previous,
            movie: updatedMovie
          }
        : previous
    );
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
    setAuthMessage("");
    setCartItems((previous) => updateCartTickets(previous, itemId, type, delta));
  };

  const handleRemoveCartItem = (itemId) => {
    setAuthMessage("");
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

  const navigateFavorites = () => {
    setView({ type: "favorites" });
  };

  const handleToggleFavorite = async (movie) => {
    const movieIdKey = normalizeMovieIdKey(movie?.id);
    if (!movieIdKey) {
      return;
    }

    if (!currentUser || typeof currentUser.getIdToken !== "function") {
      setAuthMessage("Please sign in to save favorites.");
      if (typeof window !== "undefined") {
        window.location.assign("/login?mode=login");
      }
      return;
    }

    if (favoritePendingMovieIdSet.has(movieIdKey)) {
      return;
    }

    const wasFavorite = favoriteMovieIdSet.has(movieIdKey);
    setAuthMessage("");
    setFavoritePendingMovieIds((previous) => addFavoriteId(previous, movieIdKey));
    setFavoriteMovieIds((previous) =>
      wasFavorite ? removeFavoriteId(previous, movieIdKey) : addFavoriteId(previous, movieIdKey)
    );

    try {
      const token = await currentUser.getIdToken();
      const response = wasFavorite
        ? await removeFavoriteMovie(movieIdKey, token)
        : await addFavoriteMovie(movieIdKey, token);
      setFavoriteMovieIds(parseFavoriteMovieIds(response));
    } catch (error) {
      setFavoriteMovieIds((previous) =>
        wasFavorite ? addFavoriteId(previous, movieIdKey) : removeFavoriteId(previous, movieIdKey)
      );
      setAuthMessage(getMeaningfulErrorMessage(error, "user"));
    } finally {
      setFavoritePendingMovieIds((previous) => removeFavoriteId(previous, movieIdKey));
    }
  };

  const clearAdminMode = () => {
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("cinebook:admin");
    }
  };

  const handleSignOut = async () => {
    setAuthBusy(true);
    const result = await signOutCurrentUser();
    setAuthBusy(false);

    if (!result.ok) {
      setAuthMessage(result.message || "Sign-out failed.");
      return;
    }

    clearAdminMode();
    setFavoriteMovieIds([]);
    setFavoritePendingMovieIds([]);
    setFavoritesLoading(false);
    if (isAdmin && typeof window !== "undefined") {
      window.location.assign("/login?mode=login");
      return;
    }
    setAuthMessage("Signed out.");
  };

  return {
    isAdmin,
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
    currentUser,
    currentUserProfile,
    favoriteMovieIds,
    favoriteMovies,
    favoritePendingMovieIds,
    favoritesLoading,
    profileLoading,
    profileError,
    authBusy,
    authMessage,
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
    handleUpdateMovie,
    handleDeleteMovie,
    handleUpdateCartTickets,
    handleRemoveCartItem,
    handleCheckout,
    handleToggleFavorite,
    navigateHome,
    navigateFavorites,
    handleSignOut
  };
}
