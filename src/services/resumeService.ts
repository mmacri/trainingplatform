import type { AppData } from "../data/schema";
import { getCourseCompletionState } from "./appServices";

export interface ResumeItem {
  id: string;
  type: "COURSE" | "LESSON" | "ASSESSMENT" | "PRACTICE" | "SCENARIO" | "REINFORCEMENT";
  title: string;
  subtitle?: string;
  href: string;
  lastActiveAt?: string;
  progressText?: string;
}

export class ResumeService {
  static getResumeItems(data: AppData, userId: string): ResumeItem[] {
    const courseItems = data.enrollments
      .filter((enrollment) => enrollment.userId === userId && enrollment.status === "IN_PROGRESS")
      .map((enrollment) => {
        const course = data.courses.find((item) => item.id === enrollment.courseId);
        if (!course) return undefined;
        const state = getCourseCompletionState(data, userId, course.id);
        const lesson = enrollment.currentLessonId ? data.lessons.find((item) => item.id === enrollment.currentLessonId) : undefined;
        return {
          id: `resume-course-${course.id}`,
          type: "COURSE" as const,
          title: course.shortTitle ?? course.title,
          subtitle: lesson ? `Next: ${lesson.title}` : course.shortDescription,
          href: state.resumeDestination,
          lastActiveAt: enrollment.lastAccessedAt,
          progressText: `${state.percent}% complete`
        };
      })
      .filter(Boolean) as ResumeItem[];

    const scenarioItems = data.branchingScenarioAttempts
      .filter((attempt) => attempt.userId === userId && !attempt.completedAt)
      .map((attempt) => {
        const scenario = data.scenarioDefinitions.find((item) => item.id === attempt.scenarioId);
        const stepIndex = scenario ? Math.max(0, scenario.steps.findIndex((step) => step.id === attempt.currentStepId)) + 1 : 1;
        return {
          id: `resume-scenario-${attempt.id}`,
          type: "SCENARIO" as const,
          title: scenario?.title ?? "Scenario",
          subtitle: `Step ${stepIndex} of ${scenario?.steps.length ?? "?"}`,
          href: `/scenarios/${attempt.scenarioId}/run/${attempt.id}`,
          lastActiveAt: attempt.updatedAt,
          progressText: "Scenario in progress"
        };
      });

    const sessionItems = data.learningSessions
      .filter((session) => session.userId === userId && !session.completedAt)
      .map((session) => ({
        id: `resume-session-${session.id}`,
        type: "REINFORCEMENT" as const,
        title: session.title,
        subtitle: `${session.items.filter((item) => item.completedAt).length} of ${session.items.length} steps complete`,
        href: `/session?sessionId=${encodeURIComponent(session.id)}`,
        lastActiveAt: session.updatedAt,
        progressText: `${session.targetMinutes}-minute session`
      }));

    return [...scenarioItems, ...sessionItems, ...courseItems].sort((left, right) => new Date(right.lastActiveAt ?? 0).getTime() - new Date(left.lastActiveAt ?? 0).getTime());
  }
}
