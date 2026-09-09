import type { AppData } from "../data/schema";
import { getCourseCompletionState, LearningRecommendationService } from "./appServices";
import { ResumeService, type ResumeItem } from "./resumeService";
import { SkillCompetencyService, type SkillCompetencyState } from "./skillMasteryService";

export interface LearnerJourneyAction {
  id: string;
  type: "COURSE" | "LESSON" | "ASSESSMENT" | "PRACTICE" | "SCENARIO" | "REINFORCEMENT" | "LEARNING_PATH" | "FOLLOW_UP";
  targetId: string;
  title: string;
  subtitle?: string;
  reason: "OVERDUE" | "DUE_SOON" | "IN_PROGRESS" | "REMEDIATION" | "WEAK_SKILL" | "REINFORCEMENT_DUE" | "NEXT_IN_PATH" | "CERTIFICATE_EXPIRING" | "MANAGER_ASSIGNED" | "RECOMMENDED_NEXT";
  reasonText: string;
  priority: number;
  estimatedMinutes?: number;
  href: string;
}

export interface LearnerSkillFocus {
  skillId: string;
  title: string;
  state: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG";
  stage: SkillCompetencyState["currentStage"];
  href: string;
}

export interface LearnerPathSummary {
  pathId: string;
  title: string;
  progress: number;
  nextCourseId?: string;
  href: string;
}

export interface LearnerJourney {
  primaryAction?: LearnerJourneyAction;
  upcomingActions: LearnerJourneyAction[];
  reinforcementActions: LearnerJourneyAction[];
  skillFocus: LearnerSkillFocus[];
  activeLearningPath?: LearnerPathSummary;
  recentAchievements: AppData["learnerAchievements"];
  resumeItems: ResumeItem[];
}

const reasonMap: Record<string, LearnerJourneyAction["reason"]> = {
  OVERDUE: "OVERDUE",
  DUE_SOON: "DUE_SOON",
  LOW_TOPIC_SCORE: "REMEDIATION",
  WEAK_SKILL: "WEAK_SKILL",
  IN_PROGRESS: "IN_PROGRESS",
  REINFORCEMENT_DUE: "REINFORCEMENT_DUE",
  MANAGER_ASSIGNED: "MANAGER_ASSIGNED",
  LEARNING_PATH_NEXT: "NEXT_IN_PATH",
  CERT_EXPIRING: "CERTIFICATE_EXPIRING",
  RELATED_SKILL: "RECOMMENDED_NEXT",
  SELF_SELECTED: "RECOMMENDED_NEXT"
};

const typeMap: Record<string, LearnerJourneyAction["type"]> = {
  CONTINUE_COURSE: "COURSE",
  REVIEW_LESSON: "LESSON",
  PRACTICE_ACTIVITY: "PRACTICE",
  SCENARIO: "SCENARIO",
  START_COURSE: "COURSE",
  REFRESHER: "REINFORCEMENT",
  LEARNING_PATH: "LEARNING_PATH",
  FOLLOW_UP: "FOLLOW_UP"
};

export class LearnerJourneyService {
  static getLearnerJourney(data: AppData, userId: string): LearnerJourney {
    const recommendations = LearningRecommendationService.getRecommendations(data, userId).map((recommendation) => ({
      id: recommendation.id,
      type: typeMap[recommendation.recommendationType] ?? "PRACTICE",
      targetId: recommendation.targetId,
      title: recommendation.title,
      reason: reasonMap[recommendation.reasonCode] ?? "RECOMMENDED_NEXT",
      reasonText: recommendation.reason,
      priority: recommendation.priority,
      href: recommendation.href,
      estimatedMinutes: minutesForTarget(data, recommendation.targetId)
    })) satisfies LearnerJourneyAction[];

    const resumeItems = ResumeService.getResumeItems(data, userId);
    const resumeActions = resumeItems.map((item, index) => ({
      id: `journey-${item.id}`,
      type: item.type === "SCENARIO" ? "SCENARIO" : item.type === "ASSESSMENT" ? "ASSESSMENT" : "COURSE",
      targetId: item.id,
      title: item.title,
      subtitle: item.subtitle,
      reason: "IN_PROGRESS",
      reasonText: item.progressText ?? "Continue where you left off",
      priority: 850 - index,
      href: item.href,
      estimatedMinutes: item.type === "SCENARIO" ? 8 : undefined
    })) satisfies LearnerJourneyAction[];

    const actions = dedupeActions([...recommendations, ...resumeActions]);
    const primaryAction = actions.sort((left, right) => right.priority - left.priority)[0];
    const competency = SkillCompetencyService.getCompetencyStates(data, userId);
    const activePath = data.learningPathEnrollments.find((enrollment) => enrollment.userId === userId && enrollment.progress < 100);
    const path = activePath ? data.learningPaths.find((item) => item.id === activePath.learningPathId) : undefined;
    const nextCourse = path
      ? data.learningPathCourses
          .filter((item) => item.learningPathId === path.id)
          .sort((left, right) => left.position - right.position)
          .map((item) => data.courses.find((course) => course.id === item.courseId))
          .find((course) => course && !getCourseCompletionState(data, userId, course.id).courseComplete)
      : undefined;

    return {
      primaryAction,
      upcomingActions: actions.filter((item) => item.id !== primaryAction?.id && item.reason !== "REINFORCEMENT_DUE").slice(0, 4),
      reinforcementActions: actions.filter((item) => item.reason === "REINFORCEMENT_DUE").slice(0, 3),
      skillFocus: competency
        .filter((item) => item.recentEvidence.length || item.overallState !== "STRONG")
        .sort((left, right) => (left.overallState === "NEEDS_REVIEW" ? -1 : right.overallState === "NEEDS_REVIEW" ? 1 : 0))
        .slice(0, 4)
        .map((item) => ({ skillId: item.skillId, title: item.title, state: item.overallState, stage: item.currentStage, href: `/skills/${item.skillId}` })),
      activeLearningPath: path ? { pathId: path.id, title: path.title, progress: activePath?.progress ?? 0, nextCourseId: nextCourse?.id, href: "/learning-paths" } : undefined,
      recentAchievements: data.learnerAchievements.filter((achievement) => achievement.userId === userId).slice(-3).reverse(),
      resumeItems
    };
  }
}

function dedupeActions(actions: LearnerJourneyAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.type}-${action.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function minutesForTarget(data: AppData, targetId: string) {
  return data.practiceActivities.find((activity) => activity.id === targetId)?.estimatedMinutes
    ?? data.scenarioDefinitions.find((scenario) => scenario.id === targetId)?.estimatedMinutes
    ?? data.courses.find((course) => course.id === targetId)?.estimatedMinutes;
}
