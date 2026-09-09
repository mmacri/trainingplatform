import type { AppData, LearnerGoal } from "../data/schema";

const goalSkillMap: Record<string, string> = {
  "Incident Response": "skill-incident-response",
  "System Security": "skill-system-hardening",
  "Audit Readiness": "skill-audit-readiness",
  "Access Management": "skill-access-management",
  "Evidence Quality": "skill-evidence-quality",
  Monitoring: "skill-network-monitoring",
  "Supply Chain": "skill-supply-chain",
  Recovery: "skill-recovery"
};

export class LearnerGoalService {
  static options(data: AppData) {
    return Object.entries(goalSkillMap).map(([label, skillId]) => ({
      label,
      skillId,
      skill: data.skills.find((item) => item.id === skillId)
    }));
  }

  static activeGoals(data: AppData, userId: string): LearnerGoal[] {
    return data.learnerGoals.filter((goal) => goal.userId === userId && goal.status === "ACTIVE");
  }

  static recommendations(data: AppData, goal: LearnerGoal) {
    const practice = data.practiceActivities.filter((activity) => activity.skillIds.includes(goal.skillId)).slice(0, 2);
    const scenarios = data.scenarioDefinitions.filter((scenario) => scenario.skillIds.includes(goal.skillId)).slice(0, 1);
    const courses = data.courses.filter((course) => data.learningResources.some((resource) => resource.relatedCourseIds.includes(course.id) && resource.relatedSkillIds.includes(goal.skillId))).slice(0, 1);
    return { practice, scenarios, courses };
  }
}
