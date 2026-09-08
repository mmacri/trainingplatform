import { createContext, useContext } from "react";
import type { AppData, Role, User } from "../data/schema";
import type { WorkflowService } from "../services/appServices";

export type Toast = { id: string; message: string };

export type AppContextValue = {
  data: AppData;
  setData: (data: AppData) => void;
  user: User;
  roles: Role[];
  refresh: () => Promise<void>;
  service: () => WorkflowService;
  toast: (message: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppContext missing");
  return value;
}
