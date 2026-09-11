import type { AppData } from "../schema";
import { createSeedData } from "../seed";

export function createCurrentSeedData(): AppData {
  return createSeedData();
}
