"use client";

import { useState, useEffect } from "react";

interface CurrentUser {
  id: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, isAdmin: user?.role === "ADMIN" };
}
