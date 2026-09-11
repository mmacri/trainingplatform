import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
import { WorkflowService } from "../src/services/appServices";
import { ActivityVariantService } from "../src/services/activityVariantService";
import { CourseDepthAuditService } from "../src/services/courseDepthAuditService";
import { InvestigationService } from "../src/services/investigationService";
import { MicroLearningRouteService } from "../src/services/microLearningRouteService";
import { PracticeSetService } from "../src/services/practiceSetService";
import { ProgramService } from "../src/services/programService";

describe("learning experience 5.0", () => {
  it("seeds connected North Valley storyline, profiles, programs, and capstones", () => {
    const data = createSeedData();

    expect(data.trainingWorldEvents.map((event) => event.id)).toEqual(expect.arrayContaining([
      "world-event-jordan-role-change",
      "world-event-ops-srv-12-drift",
      "world-event-audit-evidence-request"
    ]));
    expect(data.courseExperienceProfiles.find((profile) => profile.courseId === "course-cip007-system-security")?.primaryLearningMode).toBe("INVESTIGATE");
    expect(data.learningPrograms.some((program) => program.id === "program-cybersecurity-operations-readiness")).toBe(true);
    expect(data.scenarioDefinitions.some((scenario) => scenario.id === "scenario-capstone-cyber-ops-night-shift")).toBe(true);
    expect(data.learningAssignmentBundles.some((bundle) => bundle.id === "bundle-cip007-readiness")).toBe(true);
  });

  it("selects deterministic practice variants and builds course-specific practice sets", () => {
    const data = createSeedData();
    const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;
    const first = ActivityVariantService.selectVariant(data, jamie.id, "practice-patch-constraint", 1);
    const firstAgain = ActivityVariantService.selectVariant(data, jamie.id, "practice-patch-constraint", 1);
    const set = PracticeSetService.buildForCourse(data, jamie.id, "course-cip007-system-security");

    expect(first?.id).toBe(firstAgain?.id);
    expect(set.some((item) => item.id === "practice-patch-constraint")).toBe(true);
    expect(set.some((item) => item.type === "SCENARIO")).toBe(true);
  });

  it("evaluates investigation findings, evidence, and hypothesis history", async () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const service = new WorkflowService(data, taylor.id);
    service.persist = async () => undefined;
    const attemptId = "attempt-test-night-shift";

    await service.addInvestigationNote({ attemptId, noteType: "FINDING", title: "Unexpected RDP", content: "Verify context", sourceToolId: "tool-incident", sourceRecordId: "event-0212-rdp" });
    await service.addInvestigationNote({ attemptId, noteType: "EVIDENCE", title: "Maintenance schedule", content: "No visible approved work", sourceToolId: "tool-maintenance", sourceRecordId: "maint-none" });
    await service.setInvestigationHypothesis({ attemptId, hypothesis: "POTENTIAL_UNAUTHORIZED_ACTIVITY", confidence: "MEDIUM" });

    const result = InvestigationService.evaluate(service.snapshot(), "investigation-nv-night-shift", attemptId);

    expect(InvestigationService.latestHypothesis(service.snapshot(), attemptId)?.hypothesis).toBe("POTENTIAL_UNAUTHORIZED_ACTIVITY");
    expect(result.foundCount).toBe(1);
    expect(result.evidenceQuality).toMatch(/Developing|Needs Review|Strong/);
  });

  it("computes program progress and microlearning routes", () => {
    const data = createSeedData();
    const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;
    const program = ProgramService.getProgramProgress(data, jamie.id, "program-cybersecurity-operations-readiness")!;
    const route = MicroLearningRouteService.buildTopicRoute(data, jamie.id, "skill-patch-management", 10);

    expect(program.requiredTotal).toBeGreaterThan(4);
    expect(program.items.some((item) => item.item.type === "CAPSTONE")).toBe(true);
    expect(route.some((item) => item.type === "PRACTICE" && item.href.includes("practice-patch-constraint"))).toBe(true);
  });

  it("audits course depth and differentiation", () => {
    const data = createSeedData();
    const audit = CourseDepthAuditService.auditCourse(data, "course-cip007-system-security");

    expect(audit.courseId).toBe("course-cip007-system-security");
    expect(audit.dimensions.differentiation).toBe("STRONG");
    expect(audit.findings.every((finding) => finding.severity !== "BLOCKING")).toBe(true);
  });
});
