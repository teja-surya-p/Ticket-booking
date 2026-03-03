"use client";

import { Navbar } from "@/components/navbar";
import { MovieDetail } from "@/components/movie-detail";
import { CartPage } from "@/components/cart-page";
import { HomePage } from "@/pages/home-page";
import { AdminPage } from "@/pages/admin-page";
import { CheckoutPage } from "@/pages/checkout-page";
import { useCinemaAppController } from "@/controllers/useCinemaAppController";
import "./app.module.css";

export default function App() {
  const {
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
    moviesLoading,
    moviesLoadError,
    filteredMovies,
    availableGenres,
    currentlyRunning,
    comingSoon,
    cartItems,
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
  } = useCinemaAppController();

  return (
    <div className={"app-shell"}>
      <Navbar
        isAdmin={isAdmin}
        onToggleRole={() => setIsAdmin(!isAdmin)}
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
      />

      <main>
        {isAdmin ? (
          <AdminPage
            movies={movies}
            onViewMovie={handleMovieClick}
            onCreateMovie={handleCreateMovie}
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
          />
        ) : view.type === "detail" ? (
          <MovieDetail
            movie={view.movie}
            initialShowTrailer={Boolean(view.autoOpenTrailer)}
            onBack={navigateHome}
            onSelectShowtime={handleAddToCart}
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
            onAddToCartFromCard={handleAddToCartFromCard}
            onWatchTrailer={handleWatchTrailer}
          />
        )}
      </main>
    </div>
  );
}
