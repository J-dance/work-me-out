/**
 * Context stored here for app
 */

import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Exercise } from "./types";

export type UserContextValue = {
  state: unknown
  setState: Dispatch<SetStateAction<unknown>>
}

export const UserContext = createContext<UserContextValue | null>(null)
export const ExercisesContext = createContext<Promise<Exercise[]> | null>(null)