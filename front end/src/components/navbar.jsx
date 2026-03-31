"use client";

import { Film, Heart, Moon, Search, ShoppingCart, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./navbar.module.css";

function resolveUserLabel(currentUserProfile, currentUser) {
  const firstName =
    typeof currentUserProfile?.firstName === "string" ? currentUserProfile.firstName.trim() : "";
  const lastName =
    typeof currentUserProfile?.lastName === "string" ? currentUserProfile.lastName.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName.length > 0) {
    return fullName;
  }

  const displayName =
    typeof currentUser?.displayName === "string" ? currentUser.displayName.trim() : "";
  if (displayName.length > 0) {
    return displayName;
  }

  const email = typeof currentUser?.email === "string" ? currentUser.email.trim() : "";
  return email.length > 0 ? email : "Profile";
}

export function Navbar({
  isAdmin,
  searchQuery,
  onSearchChange,
  onNavigateHome,
  cartCount,
  onNavigateCart,
  onNavigateFavorites,
  favoriteCount = 0,
  isFavoritesView = false,
  currentUser,
  currentUserProfile,
  authBusy,
  authMessage,
  onSignOut
}) {
  const { theme, setTheme } = useTheme();
  const userLabel = resolveUserLabel(currentUserProfile, currentUser);

  return (
    <header className={styles["navbar-class-1"]}>
      <div className={styles["navbar-class-2"]}>
        <button onClick={onNavigateHome} className={styles["navbar-class-3"]}>
          <Film className={styles["navbar-class-4"]} />
          <span className={styles["navbar-class-5"]}>CineBook</span>
        </button>

        <div className={styles["navbar-class-6"]}>
          <div className={styles["navbar-class-7"]}>
            <Search className={styles["navbar-class-8"]} />
            <Input
              type="text"
              placeholder="Search movies by title..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className={styles["navbar-class-9"]}
            />
          </div>
        </div>

        <div className={styles["navbar-class-10"]}>
          {currentUser ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">{userLabel}</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login / Register</Link>
            </Button>
          )}

          {currentUser ? (
            <Button variant="outline" size="sm" onClick={onSignOut} disabled={authBusy}>
              {authBusy ? "Working..." : "Sign Out"}
            </Button>
          ) : null}

          {isAdmin ? <span className={styles["navbar-class-16"]}>Admin Mode</span> : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={styles["navbar-class-11"]}
            aria-label="Toggle theme"
          >
            <Sun className={styles["navbar-class-12"]} />
            <Moon className={styles["navbar-class-13"]} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateCart}
            className={styles["navbar-class-14"]}
            aria-label="Open cart"
          >
            <ShoppingCart className={styles["navbar-class-15"]} />
            <span className={styles["navbar-class-16"]}>Cart</span>
            {cartCount > 0 && <span className={styles["navbar-class-17"]}>{cartCount}</span>}
          </Button>

          <Button
            variant={isFavoritesView ? "default" : "outline"}
            size="sm"
            onClick={onNavigateFavorites}
            className={styles["navbar-class-18"]}
            aria-label="Open favorites"
          >
            <Heart className={styles["navbar-class-15"]} />
            <span className={styles["navbar-class-16"]}>Favorites</span>
            {favoriteCount > 0 && <span className={styles["navbar-class-17"]}>{favoriteCount}</span>}
          </Button>
        </div>
      </div>

      {authMessage ? (
        <div className={styles["navbar-class-19"]}>
          <p className={styles["navbar-class-16"]}>{authMessage}</p>
        </div>
      ) : null}

      <div className={styles["navbar-class-19"]}>
        <div className={styles["navbar-class-20"]}>
          <Search className={styles["navbar-class-8"]} />
          <Input
            type="text"
            placeholder="Search movies by title..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className={styles["navbar-class-9"]}
          />
        </div>
      </div>
    </header>
  );
}
