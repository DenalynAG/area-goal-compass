import { useState, createContext, useContext, ReactNode } from 'react';
import { Collaborator } from '@/types';
import { mockCollaborators } from '@/data/mockData';

interface AuthContextType {
  user: Collaborator | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Collaborator | null>(() => {
    const saved = localStorage.getItem('gao_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const login = (email: string, _password: string) => {
    const found = mockCollaborators.find(u => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem('gao_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gao_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
