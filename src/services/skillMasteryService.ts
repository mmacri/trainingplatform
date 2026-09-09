import type { AppData, SkillEvidence } from "../data/schema";
import type { LearnerJourneyAction } from "./learnerJourneyService";
import { SkillMasteryService } from "./appServices";

export interface SkillCompetencyState {
  skillId: string;
  title: string;
  currentStage: "LEARN" | "PRACTICE" | "APPLY" | "DEMONSTRATE";
  overallState: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG";
  stageEvidence: {
    learn: boolean;
    practice: boolean;
    apply: boolean;
    demonstrate: boolean;
  };
  recentEvidence: SkillEvidence[];
  recommendedNextAction?: LearnerJourneyAction;
}

export class SkillCompetencyService {
  static getCompetencyStates(data: AppData, userId: string): SkillCompetencyState[] {
    const mastery = SkillMasteryService.getSkillMastery(data, userId);
    return mastery.map((item) => {
      const recentEvidence = data.skillEvidence
        .filter((evidence) => evidence.userId === userId && evidence.skillId === item.skillId)
        .sort((left, right) => new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime());
      const stageEvidence = {
        learn: recentEvidence.some((evidence) => evidence.sourceType === "COURSE_ASSESSMENT" || evidence.sourceType === "KNOWLEDGE_CHECK"),
        practice: recentEvidence.some((evidence) => evidence.sourceType === "PRACTICE" || evidence.sourceType === "MICROLEARNING"),
        apply: recentEvidence.some((evidence) => evidence.sourceType === "SCENARIO"),
        demonstrate: recentEvidence.some((evidence) => evidence.result === "STRONG" && (evidence.sourceType === "COURSE_ASSESSMENT" || evidence.sourceType === "SCENARIO"))
      };
      const currentStage = stageEvidence.demonstrate ? "DEMONSTRATE" : stageEvidence.apply ? "APPLY" : stageEvidence.practice ? "PRACTICE" : "LEARN";
      const activity = item.recommendedActivityId ? data.practiceActivities.find((candidate) => candidate.id === item.recommendedActivityId) : undefined;
      return {
        skillId: item.skillId,
        title: item.title,
        currentStage,
        overallState: item.state,
        stageEvidence,
        recentEvidence,
        recommendedNextAction: activity
          ? {
              id: `skill-next-${item.skillId}`,
              type: "PRACTICE",
              targetId: activity.id,
              title: activity.title,
              subtitle: activity.description,
              reason: "WEAK_SKILL",
              reasonText: `Recommended to strengthen ${item.title}`,
              priority: 400,
              estimatedMinutes: activity.estimatedMinutes,
              href: `/practice/${activity.id}`
            }
          : undefined
      };
    });
  }
}
