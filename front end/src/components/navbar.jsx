"use client";

import { Film, Moon, Search, Shield, ShoppingCart, Sun, User } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./navbar.module.css";
export function Navbar({
  isAdmin,
  onToggleRole,
  searchQuery,
  onSearchChange,
  onNavigateHome,
  cartCount,
  onNavigateCart
}) {
  const {
    theme,
    setTheme
  } = useTheme();
  return <header className={styles["navbar-class-1"]}>
      <div className={styles["navbar-class-2"]}>
        <button onClick={onNavigateHome} className={styles["navbar-class-3"]}>
          <Film className={styles["navbar-class-4"]} />
          <span className={styles["navbar-class-5"]}>
            CineBook
          </span>
        </button>

        <div className={styles["navbar-class-6"]}>
          <div className={styles["navbar-class-7"]}>
            <Search className={styles["navbar-class-8"]} />
            <Input type="text" placeholder="Search movies by title..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className={styles["navbar-class-9"]} />
          </div>
        </div>

        <div className={styles["navbar-class-10"]}>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/register">Register</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={styles["navbar-class-11"]} aria-label="Toggle theme">
            <Sun className={styles["navbar-class-12"]} />
            <Moon className={styles["navbar-class-13"]} />
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateCart} className={styles["navbar-class-14"]} aria-label="Open cart">
            <ShoppingCart className={styles["navbar-class-15"]} />
            <span className={styles["navbar-class-16"]}>Cart</span>
            {cartCount > 0 && <span className={styles["navbar-class-17"]}>
                {cartCount}
              </span>}
          </Button>
          <Button variant={isAdmin ? "default" : "outline"} size="sm" onClick={onToggleRole} className={styles["navbar-class-18"]}>
            {isAdmin ? <>
                <Shield className={styles["navbar-class-15"]} />
                <span className={styles["navbar-class-16"]}>Admin</span>
              </> : <>
                <User className={styles["navbar-class-15"]} />
                <span className={styles["navbar-class-16"]}>User</span>
              </>}
          </Button>
        </div>
      </div>

      <div className={styles["navbar-class-19"]}>
        <div className={styles["navbar-class-20"]}>
          <Search className={styles["navbar-class-8"]} />
          <Input type="text" placeholder="Search movies by title..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className={styles["navbar-class-9"]} />
        </div>
      </div>
    </header>;
}
