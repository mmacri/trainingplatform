import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/data/seed";
import { canAccessCourse } from "../src/services/appServices";

describe("rebuilt NERC CIP catalog", () => {
  it("seeds the normalized course inventory without replacing the protected flagship", () => {
    const data = createSeedData();
    const flagship = data.courses.find((course) => course.id === "course-cip004-annual-refresher")!;
    const visibleCatalog = data.courses.filter((course) => course.showInCatalog);

    expect(flagship.title).toBe("NERC CIP-004 Personnel Security & Training — Annual Refresher");
    expect(data.courses.some((course) => course.id !== "course-cip004-annual-refresher" && course.title.includes("Annual Refresher"))).toBe(false);
    expect(data.courses.find((course) => course.id === "course-cip004-supervisor-workshop")?.title).toBe("CIP-004 — Supervisor & Access Owner Workshop");
    expect(visibleCatalog.length).toBeGreaterThanOrEqual(18);
    expect(data.applicationSettings.find((setting) => setting.key === "catalogContentVersion")?.value).toBe(3);
  });

  it("gives every rebuilt visible catalog course authored curriculum, assessment, resources, and mapping", () => {
    const data = createSeedData();
    const rebuilt = data.courses.filter((course) => course.id !== "course-cip004-annual-refresher" && course.showInCatalog);

    for (const course of rebuilt) {
      const version = data.courseVersions.find((item) => item.id === course.currentVersionId)!;
      const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === version.id);
      const lessonIds = new Set(lessons.map((lesson) => lesson.id));
      const blocks = data.contentBlocks.filter((block) => lessonIds.has(block.lessonId));
      const assessment = data.assessments.find((item) => item.courseVersionId === version.id);
      const questions = assessment ? data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id) : [];

      expect(lessons.length, course.title).toBeGreaterThanOrEqual(5);
      expect(blocks.length, course.title).toBeGreaterThanOrEqual(18);
      expect(blocks.some((block) => ["knowledge_check", "classification", "evidence_builder", "scenario", "process_diagram", "timeline"].includes(block.type)), course.title).toBe(true);
      const expectedMinimum = course.title.includes("Supervisor") ? 8 : course.estimatedMinutes < 45 ? 8 : 10;
      expect(questions.length, course.title).toBeGreaterThanOrEqual(expectedMinimum);
      expect(data.courseResources.filter((resource) => resource.courseId === course.id).length, course.title).toBeGreaterThanOrEqual(3);
      expect(data.courseStandardMappings.some((mapping) => mapping.courseId === course.id), course.title).toBe(true);
    }
  });

  it("keeps the private draft hidden from Taylor while making restricted catalog courses requestable or granted", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const privateDraft = data.courses.find((course) => course.id === "course-internal-procedure-authoring")!;
    const cip007 = data.courses.find((course) => course.id === "course-cip007-system-security")!;

    expect(canAccessCourse(data, learner.id, privateDraft.id).allowed).toBe(false);
    expect(canAccessCourse(data, learner.id, privateDraft.id).discoverable).toBe(false);
    expect(canAccessCourse(data, learner.id, cip007.id).allowed || canAccessCourse(data, learner.id, cip007.id).discoverable).toBe(true);
  });
});
