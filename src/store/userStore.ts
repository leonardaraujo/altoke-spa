import { create } from "zustand";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type UserStore = {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User, accessToken: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user, accessToken) => {
    set({ user, accessToken });
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("accessToken", accessToken);
  },
  logout: () => {
    set({ user: null, accessToken: null });
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
  },
  loadFromStorage: () => {
    const user = localStorage.getItem("user");
    const accessToken = localStorage.getItem("accessToken");
    if (user && accessToken) {
      set({ user: JSON.parse(user), accessToken });
    }
  },
}));