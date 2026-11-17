"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthContext";

export default function UserMenu() {
  const { user, loading, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className="btn"
      >
        Sign in with GitHub
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="btn btn-icon"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.user_name}
          width={24}
          height={24}
          className="h-6 w-6"
        />
      </button>
      {open && (
        <div className="popover absolute right-0 top-full z-(--z-dropdown) mt-2 w-56 py-2">
          <p className="px-3 text-sm text-muted">Signed in as</p>
          <p className="truncate px-3 pb-2 font-display text-sm font-medium text-ink">
            {user.user_metadata.user_name}
          </p>
          <button
            type="button"
            onClick={() => { setOpen(false); signOut(); }}
            className="option w-full border-t border-rule font-display text-sm font-medium text-error"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
