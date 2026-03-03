"use client";

import { Film, Moon, Search, Shield, ShoppingCart, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./navbar.module.css";
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
  return <header className={"navbar-class-1"}>
      <div className={"navbar-class-2"}>
        <button onClick={onNavigateHome} className={"navbar-class-3"}>
          <Film className={"navbar-class-4"} />
          <span className={"navbar-class-5"}>
            CineBook
          </span>
        </button>

        <div className={"navbar-class-6"}>
          <div className={"navbar-class-7"}>
            <Search className={"navbar-class-8"} />
            <Input type="text" placeholder="Search movies by title..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className={"navbar-class-9"} />
          </div>
        </div>

        <div className={"navbar-class-10"}>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={"navbar-class-11"} aria-label="Toggle theme">
            <Sun className={"navbar-class-12"} />
            <Moon className={"navbar-class-13"} />
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateCart} className={"navbar-class-14"} aria-label="Open cart">
            <ShoppingCart className={"navbar-class-15"} />
            <span className={"navbar-class-16"}>Cart</span>
            {cartCount > 0 && <span className={"navbar-class-17"}>
                {cartCount}
              </span>}
          </Button>
          <Button variant={isAdmin ? "default" : "outline"} size="sm" onClick={onToggleRole} className={"navbar-class-18"}>
            {isAdmin ? <>
                <Shield className={"navbar-class-15"} />
                <span className={"navbar-class-16"}>Admin</span>
              </> : <>
                <User className={"navbar-class-15"} />
                <span className={"navbar-class-16"}>User</span>
              </>}
          </Button>
        </div>
      </div>

      <div className={"navbar-class-19"}>
        <div className={"navbar-class-20"}>
          <Search className={"navbar-class-8"} />
          <Input type="text" placeholder="Search movies by title..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className={"navbar-class-9"} />
        </div>
      </div>
    </header>;
}
