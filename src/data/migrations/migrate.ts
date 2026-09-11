import type { AppData } from "../schema";
import { addLearningIntelligenceSeed } from "../learningIntelligenceSeed";

export const currentLearningIntelligenceVersion = 1;
export const currentLearningExperienceVersion = 6;

export function migrateDatabase(data: AppData): AppData {
  const intelligenceVersion = data.applicationSettings.find((setting) => setting.key === "learningIntelligenceVersion")?.value;
  const experienceVersion = data.applicationSettings.find((setting) => setting.key === "learningExperienceVersion")?.value;
  if (intelligenceVersion !== currentLearningIntelligenceVersion || experienceVersion !== currentLearningExperienceVersion) {
    return addLearningIntelligenceSeed(data);
  }
  return data;
}
