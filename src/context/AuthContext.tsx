import React, { createContext, useState, useEffect } from "react";

export interface User {
  discordId: string;
  username: string;
  _id: string;
  createdAt: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setUser(userData);
          // Check admin status
          const res = await fetch(`/api/auth/admin-check`, {
            headers: {
              "X-Discord-ID": userData.discordId,
            },
          });
          if (res.ok) {
            const { isAdmin: admin } = await res.json();
            setIsAdmin(admin);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = () => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri =
      import.meta.env.VITE_DISCORD_REDIRECT_URI ||
      `${window.location.origin}/auth/callback`;
    const scope = "identify";
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = discordAuthUrl;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
