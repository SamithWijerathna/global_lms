import { useState, useEffect } from 'react';

interface User {
  uuid: string;
  first_name: string;
  last_name: string;
  user_email: string;
  role: string;
  permission_id: number;
  profile_photo: string;
  theme_preference: string;
  create_at: string;
}

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/admin/auth?action=me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { user, loading, isAuthenticated: !!user, refetch: fetchUser };
}

export const useAuth = useAdminAuth;
