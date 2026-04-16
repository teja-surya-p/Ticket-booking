"use client";

import { Navbar } from "@/components/navbar";
import { MovieDetail } from "@/components/movie-detail";
import { CartPage } from "@/components/cart-page";
import { HomePage } from "@/pages/home-page";
import { AdminPage } from "@/pages/admin-page";
import { CheckoutPage } from "@/pages/checkout-page";
import { FavoritesPage } from "@/pages/favorites-page";
import { useCinemaAppController } from "@/controllers/useCinemaAppController";
import styles from "./app.module.css";

export default function App() {
  const {
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
    moviesLoading,
    moviesLoadError,
    filteredMovies,
    availableGenres,
    currentlyRunning,
    comingSoon,
    cartItems,
    cartCount,
    currentUser,
    currentUserProfile,
    favoriteMovieIds,
    favoriteMovies,
    favoritePendingMovieIds,
    favoritesLoading,
    authBusy,
    authMessage,
    handleMovieClick,
    handleWatchTrailer,
    handleAddToCart,
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
  } = useCinemaAppController();
  const detailMovieIdKey =
    view.type === "detail"
      ? typeof view.movie?.id === "number"
        ? String(view.movie.id)
        : typeof view.movie?.id === "string"
          ? view.movie.id.trim()
          : ""
      : "";
  const isDetailMovieFavorite =
    detailMovieIdKey.length > 0 &&
    favoriteMovieIds.some((movieId) => String(movieId).trim() === detailMovieIdKey);
  const isDetailMovieFavoriteBusy =
    detailMovieIdKey.length > 0 &&
    favoritePendingMovieIds.some((movieId) => String(movieId).trim() === detailMovieIdKey);

  return (
    <div className={styles.appShell}>
      <Navbar
        isAdmin={isAdmin}
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          if (view.type !== "home") {
            setView({ type: "home" });
          }
        }}
        onNavigateHome={navigateHome}
        cartCount={cartCount}
        onNavigateCart={() => setView({ type: "cart" })}
        onNavigateFavorites={navigateFavorites}
        favoriteCount={favoriteMovies.length}
        isFavoritesView={view.type === "favorites"}
        currentUser={currentUser}
        currentUserProfile={currentUserProfile}
        authBusy={authBusy}
        authMessage={authMessage}
        onSignOut={handleSignOut}
      />

      <main>
        {isAdmin ? (
          <AdminPage
            movies={movies}
            onViewMovie={handleMovieClick}
            onCreateMovie={handleCreateMovie}
            onUpdateMovie={handleUpdateMovie}
            onDeleteMovie={handleDeleteMovie}
          />
        ) : view.type === "confirmation" ? (
          <CheckoutPage
            orderId={view.orderId}
            total={view.total}
            bookings={view.bookings}
            warning={view.warning}
            onGoHome={navigateHome}
            onOpenCart={() => setView({ type: "cart" })}
          />
        ) : view.type === "cart" ? (
          <CartPage
            items={cartItems}
            onBack={navigateHome}
            onUpdateTickets={handleUpdateCartTickets}
            onRemoveItem={handleRemoveCartItem}
            onCheckout={handleCheckout}
            currentUser={currentUser}
          />
        ) : view.type === "favorites" ? (
          <FavoritesPage
            movies={favoriteMovies}
            favoritesLoading={favoritesLoading}
            currentUser={currentUser}
            onMovieClick={handleMovieClick}
            onToggleFavorite={handleToggleFavorite}
            favoriteMovieIds={favoriteMovieIds}
            favoritePendingMovieIds={favoritePendingMovieIds}
          />
        ) : view.type === "detail" ? (
          <MovieDetail
            movie={view.movie}
            initialShowTrailer={Boolean(view.autoOpenTrailer)}
            onBack={navigateHome}
            onSelectShowtime={handleAddToCart}
            isFavorite={isDetailMovieFavorite}
            isFavoriteBusy={isDetailMovieFavoriteBusy}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <HomePage
            moviesLoadError={moviesLoadError}
            moviesLoading={moviesLoading}
            searchQuery={searchQuery}
            selectedGenre={selectedGenre}
            selectedDate={selectedDate}
            availableGenres={availableGenres}
            currentlyRunning={currentlyRunning}
            comingSoon={comingSoon}
            filteredMovies={filteredMovies}
            onGenreChange={setSelectedGenre}
            onDateChange={setSelectedDate}
            onMovieClick={handleMovieClick}
            onWatchTrailer={handleWatchTrailer}
            onToggleFavorite={handleToggleFavorite}
            onAddToCart={handleAddToCart}
            favoriteMovieIds={favoriteMovieIds}
            favoritePendingMovieIds={favoritePendingMovieIds}
          />
        )}
      </main>
    </div>
  );
}
