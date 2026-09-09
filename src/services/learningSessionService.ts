import type { AppData, LearningSession } from "../data/schema";
import { id, now } from "../data/db";
import { LearningRecommendationService } from "./appServices";

export class LearningSessionService {
  static buildSession(data: AppData, userId: string, targetMinutes: 5 | 10 | 15 | 30): LearningSession {
    const open = data.learningSessions.find((session) => session.userId === userId && !session.completedAt && session.targetMinutes === targetMinutes);
    if (open) return open;
    const recommended = LearningRecommendationService.getRecommendations(data, userId)
      .filter((item) => ["PRACTICE_ACTIVITY", "REFRESHER", "SCENARIO"].includes(item.recommendationType))
      .map((item) => ({
        itemType: item.recommendationType === "SCENARIO" ? "SCENARIO" as const : item.recommendationType === "REFRESHER" ? "REINFORCEMENT" as const : "PRACTICE" as const,
        targetId: item.targetId,
        minutes: data.practiceActivities.find((activity) => activity.id === item.targetId)?.estimatedMinutes ?? data.scenarioDefinitions.find((scenario) => scenario.id === item.targetId)?.estimatedMinutes ?? 5
      }));
    const fallback = data.practiceActivities.filter((activity) => activity.status === "PUBLISHED").map((activity) => ({ itemType: "PRACTICE" as const, targetId: activity.id, minutes: activity.estimatedMinutes }));
    const picked = [...recommended, ...fallback].reduce<typeof recommended>((items, candidate) => {
      const total = items.reduce((sum, item) => sum + item.minutes, 0);
      if (total >= targetMinutes || total + candidate.minutes > targetMinutes + 5 || items.some((item) => item.targetId === candidate.targetId)) return items;
      return [...items, candidate];
    }, []);
    const skillIds = Array.from(new Set(picked.flatMap((item) => data.practiceActivities.find((activity) => activity.id === item.targetId)?.skillIds ?? data.scenarioDefinitions.find((scenario) => scenario.id === item.targetId)?.skillIds ?? [])));
    return {
      id: id("learningsession"),
      userId,
      title: `${targetMinutes}-Minute Learning Session`,
      targetMinutes,
      startedAt: now(),
      currentItemId: picked[0]?.targetId,
      items: picked.map((item, index) => ({ id: id("sessionitem"), order: index + 1, itemType: item.itemType, targetId: item.targetId, estimatedMinutes: item.minutes })),
      skillIds,
      createdAt: now(),
      updatedAt: now()
    };
  }

  static completeItem(data: AppData, sessionId: string, targetId: string) {
    const session = data.learningSessions.find((item) => item.id === sessionId);
    if (!session) return;
    const item = session.items.find((candidate) => candidate.targetId === targetId);
    if (item && !item.completedAt) item.completedAt = now();
    const next = session.items.find((candidate) => !candidate.completedAt);
    session.currentItemId = next?.targetId;
    if (!next) session.completedAt = now();
    session.updatedAt = now();
  }
}
