"use client";

import { useState, useEffect } from 'react';

interface User {
  uuid: string;
  student_id: string;
  id_number: string;
  first_name: string;
  last_name: string;
  user_email: string;
  user_address: string;
  phone: string;
  birthday: string | null; // ISO date string, e.g. "2004-05-19"
  batch: string;
  profile_url: string; // e.g. "/uploads/profile/SD0002.jpg" or full URL
  created_at: string; // e.g. "2025-11-02 11:37:02"
  role?: string; // optional – keep if your API returns it
  permission_id?: number; // optional
  theme_preference?: string; // optional
  profile_completed?: boolean; // optional – seen in some DB examples
  // Add any other fields your /api/auth?action=me endpoint returns
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth?action=me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Unauthenticated');
      })
      .then((data) => {
        // Assuming the API returns { user: { ... } }
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn('Auth check failed:', err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}