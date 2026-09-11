import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
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
    expect(data.applicationSettings.find((setting) => setting.key === "catalogContentVersion")?.value).toBe(4);
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

      const substantiveLessons = lessons.filter((lesson) => !["Final Assessment", "Completion Summary"].includes(lesson.title));
      const interactionBlocks = blocks.filter((block) => ["knowledge_check", "classification", "evidence_builder", "scenario", "process_diagram", "timeline"].includes(block.type));
      const minimumLessons = course.estimatedMinutes <= 40 ? 6 : course.estimatedMinutes < 70 ? 8 : 10;
      const minimumInteractions = course.estimatedMinutes <= 40 ? 3 : course.estimatedMinutes < 70 ? 4 : 5;
      const minimumQuestions = course.estimatedMinutes <= 40 ? 8 : course.estimatedMinutes < 70 ? 10 : 12;

      expect(substantiveLessons.length, course.title).toBeGreaterThanOrEqual(minimumLessons);
      expect(blocks.length, course.title).toBeGreaterThanOrEqual(18);
      expect(interactionBlocks.length, course.title).toBeGreaterThanOrEqual(minimumInteractions);
      expect(questions.length, course.title).toBeGreaterThanOrEqual(minimumQuestions);
      expect(data.courseResources.filter((resource) => resource.courseId === course.id).length, course.title).toBeGreaterThanOrEqual(3);
      expect(data.courseStandardMappings.some((mapping) => mapping.courseId === course.id), course.title).toBe(true);

      const prompts = questions
        .map((item) => data.questions.find((question) => question.id === item.questionId)?.prompt ?? "")
        .map((prompt) => prompt.toLowerCase().replace(/\s+/g, " ").trim());
      const duplicateRatio = 1 - new Set(prompts).size / prompts.length;
      expect(duplicateRatio, course.title).toBeLessThanOrEqual(0.1);
      expect(prompts.join("\n"), course.title).not.toMatch(/application \d+:/i);
      expect(prompts.join("\n"), course.title).not.toContain("select the action that best supports compliance");
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
