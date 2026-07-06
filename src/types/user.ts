import type { Timestamp } from "firebase/firestore";

export type UserRole = "listener" | "artist" | "admin";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  pointBalance: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};