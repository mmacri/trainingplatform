import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
import { LearningRecommendationService, SkillMasteryService, WorkflowService, searchAuthorized } from "../src/services/appServices";

describe("learning intelligence", () => {
  it("seeds practice, scenarios, skill evidence, reinforcement, and recommendations", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const recommendations = LearningRecommendationService.getRecommendations(data, taylor.id);

    expect(data.practiceActivities.length).toBeGreaterThanOrEqual(12);
    expect(data.scenarioDefinitions.length).toBeGreaterThanOrEqual(14);
    expect(data.skills.some((skill) => skill.id === "skill-evidence-quality")).toBe(true);
    expect(data.reinforcementSchedules.some((schedule) => schedule.userId === taylor.id)).toBe(true);
    expect(recommendations[0].reasonCode).toMatch(/DUE_SOON|IN_PROGRESS|OVERDUE/);
    expect(recommendations.some((item) => item.href.startsWith("/practice/"))).toBe(true);
  });

  it("updates skill evidence when a learner completes practice", async () => {
    const data = createSeedData();
    const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;
    const service = new WorkflowService(data, jamie.id);
    service.persist = async () => undefined;
    const before = SkillMasteryService.getSkillMastery(data, jamie.id).find((skill) => skill.skillId === "skill-patch-management")!;

    await service.completePracticeActivity("practice-patch-constraint", { "practice-patch-constraint-decision": 1 }, "RECOMMENDED");

    const after = SkillMasteryService.getSkillMastery(service.snapshot(), jamie.id).find((skill) => skill.skillId === "skill-patch-management")!;
    expect(service.snapshot().practiceAttempts.some((attempt) => attempt.practiceActivityId === "practice-patch-constraint" && attempt.userId === jamie.id)).toBe(true);
    expect(after.evidenceCount).toBeGreaterThan(before.evidenceCount);
    expect(["DEVELOPING", "STRONG"]).toContain(after.state);
  });

  it("persists branching scenario state and preserves replay history", async () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const service = new WorkflowService(data, taylor.id);
    service.persist = async () => undefined;
    const attempt = await service.startBranchingScenario("scenario-unexpected-admin-connection");

    const risky = await service.chooseScenarioChoice(attempt.id, "admin-step-1", "declare");
    expect(risky.currentState.incidentDeclaredPrematurely).toBe(true);
    expect(risky.currentStepId).toBe("admin-step-premature");

    await service.chooseScenarioChoice(attempt.id, "admin-step-premature", "facts");
    const completed = await service.chooseScenarioChoice(attempt.id, "admin-step-final", "traceable-record");
    expect(completed.completedAt).toBeTruthy();
    expect(completed.decisions).toHaveLength(3);

    const replay = await service.startBranchingScenario("scenario-unexpected-admin-connection", attempt.id);
    expect(replay.replayOfAttemptId).toBe(attempt.id);
    expect(service.snapshot().branchingScenarioAttempts.filter((item) => item.scenarioId === "scenario-unexpected-admin-connection")).toHaveLength(2);
  });

  it("searches courses, lessons, practice, scenarios, resources, and skills", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const results = searchAuthorized(data, taylor.id, "vendor");

    expect(results.some((result) => result.type === "Practice" && result.title.includes("Vendor"))).toBe(true);
    expect(results.some((result) => result.type === "Scenario" && result.title.includes("Vendor"))).toBe(true);
    expect(results.some((result) => result.type === "Skill" && result.title.includes("Supply Chain"))).toBe(true);
  });
});
