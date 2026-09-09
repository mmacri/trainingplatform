import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/data/seed";
import { ArtifactService } from "../src/services/artifactService";
import { InstructionalQualityService } from "../src/services/instructionalQualityService";
import { LearningSearchService } from "../src/services/learningSearchService";
import { LearningTimeService } from "../src/services/learningTimeService";
import { TrainingWorldService } from "../src/services/trainingWorldService";

describe("learning experience 4.0", () => {
  it("seeds North Valley Energy as a reusable fictional training world", () => {
    const data = createSeedData();
    const world = TrainingWorldService.primaryWorld(data)!;
    const cip007 = data.courses.find((course) => course.id === "course-cip007-system-security")!;
    const entities = TrainingWorldService.courseEntities(data, cip007);

    expect(world.name).toBe("North Valley Energy");
    expect(world.description).toContain("fictional");
    expect(world.systems.some((system) => system.id === "system-ops-srv-12")).toBe(true);
    expect(world.people.some((person) => person.id === "person-jamie-rivera")).toBe(true);
    expect(entities.some((entity) => entity.item.id === "system-ops-srv-12")).toBe(true);
  });

  it("evaluates artifact investigations with valid concerns and needs-context nuance", () => {
    const data = createSeedData();
    const artifact = data.trainingArtifacts.find((item) => item.id === "artifact-ops-srv-12-account-inventory")!;
    const expiredVendor = artifact.fields.find((field) => field.label === "vendor-temp")!;
    const sharedOps = artifact.fields.find((field) => field.label === "ops_shared")!;
    const jamieAdmin = artifact.fields.find((field) => field.label === "jrivera-admin")!;

    const result = ArtifactService.review(artifact, [expiredVendor.id, sharedOps.id, jamieAdmin.id]);

    expect(result.identified.map((item) => item.label)).toContain("vendor-temp");
    expect(result.identified.map((item) => item.label)).toContain("ops_shared");
    expect(result.needsContext.map((item) => item.label)).toContain("jrivera-admin");
    expect(result.missed.map((item) => item.label)).toContain("svc_backup");
  });

  it("estimates learning time and reports instructional quality findings", () => {
    const data = createSeedData();
    const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;
    const remaining = LearningTimeService.estimateCourseRemaining(data, "course-cip007-system-security", jamie.id);
    const quality = InstructionalQualityService.analyzeCourse(data, "course-cip007-system-security");

    expect(remaining).toBeGreaterThan(0);
    expect(["STRONG", "NEEDS_ATTENTION"]).toContain(quality.visualLearning);
    expect(quality.findings.every((finding) => finding.severity !== "BLOCKING")).toBe(true);
  });

  it("searches the training world, artifacts, resources, and diagrams", () => {
    const data = createSeedData();
    const taylor = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const results = LearningSearchService.search(data, taylor.id, "OPS-SRV-12");

    expect(results.some((result) => result.resultType === "System" && result.title === "OPS-SRV-12")).toBe(true);
    expect(results.some((result) => result.resultType === "Artifact" && result.title.includes("OPS-SRV-12"))).toBe(true);
  });
});
