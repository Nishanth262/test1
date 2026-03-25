import type { UserProfile } from "@workspace/api-client-react";

export const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("access_token", token);
};

export const clearAuth = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("auth_user");
};

export const getAuthUser = (): UserProfile | null => {
  const userStr = localStorage.getItem("auth_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setAuthUser = (user: UserProfile) => {
  localStorage.setItem("auth_user", JSON.stringify(user));
};

export const authOptions = () => {
  const token = getAuthToken();
  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  };
};
