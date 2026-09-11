import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
import { ContentHealthService } from "../src/services/contentHealthService";
import { LearnerJourneyService } from "../src/services/learnerJourneyService";
import { LearningSearchService } from "../src/services/learningSearchService";
import { LearningSessionService } from "../src/services/learningSessionService";
import { ResumeService } from "../src/services/resumeService";
import { SkillCompetencyService } from "../src/services/skillMasteryService";

describe("learning experience 3.0", () => {
  it("builds Taylor's learner journey around required formal training before optional practice", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const journey = LearnerJourneyService.getLearnerJourney(data, taylor.id);

    expect(journey.primaryAction).toBeTruthy();
    expect(["OVERDUE", "DUE_SOON", "IN_PROGRESS"]).toContain(journey.primaryAction?.reason);
    expect(journey.skillFocus.length).toBeGreaterThan(0);
    expect(journey.recentAchievements.some((achievement) => achievement.title.includes("Foundations"))).toBe(true);
  });

  it("detects resumable courses and builds a short session from recommendations", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;

    const resumeItems = ResumeService.getResumeItems(data, taylor.id);
    const session = LearningSessionService.buildSession(data, taylor.id, 15);

    expect(resumeItems.some((item) => item.title.includes("CIP-004"))).toBe(true);
    expect(session.items.length).toBeGreaterThan(0);
    expect(session.items.reduce((sum, item) => sum + item.estimatedMinutes, 0)).toBeLessThanOrEqual(20);
  });

  it("calculates competency progression stages from cross-learning evidence", () => {
    const data = createSeedData();
    const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;
    const patch = SkillCompetencyService.getCompetencyStates(data, jamie.id).find((skill) => skill.skillId === "skill-patch-management")!;

    expect(patch.overallState).toBe("DEVELOPING");
    expect(["LEARN", "PRACTICE", "APPLY", "DEMONSTRATE"]).toContain(patch.currentStage);
    expect(patch.recommendedNextAction?.href).toContain("/practice/");
  });

  it("searches global resources and reports content health", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const search = LearningSearchService.search(data, taylor.id, "incident");
    const health = ContentHealthService.getCourseHealth(data, "course-cip007-system-security");

    expect(search.some((result) => result.resultType === "Resource" && result.title.includes("Incident"))).toBe(true);
    expect(["Ready", "Needs Attention", "Blocking Issues"]).toContain(health.state);
  });
});
