import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/data/seed";
import { getCourseCompletionState } from "../src/services/appServices";

describe("flagship CIP-004 annual refresher", () => {
  it("seeds the full authored course as editable learning data", () => {
    const data = createSeedData();
    const course = data.courses.find((item) => item.id === "course-cip004-annual-refresher")!;
    const version = data.courseVersions.find((item) => item.id === course.currentVersionId)!;
    const modules = data.modules.filter((item) => item.courseVersionId === version.id);
    const lessons = data.lessons.filter((item) => item.courseVersionId === version.id);
    const blocks = data.contentBlocks.filter((block) => lessons.some((lesson) => lesson.id === block.lessonId));
    const assessment = data.assessments.find((item) => item.courseVersionId === version.id)!;
    const questions = data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id);

    expect(course.title).toBe("NERC CIP-004 Personnel Security & Training — Annual Refresher");
    expect(course.status).toBe("PUBLISHED");
    expect(course.certificateEnabled).toBe(true);
    expect(modules.map((module) => module.title)).toEqual([
      "Why Personnel Security Matters",
      "Personnel Risk & Responsibility",
      "Access Must Match the Job",
      "Training, Documentation & Evidence",
      "Applied Personnel Security",
      "Final Knowledge Assessment",
      "Completion"
    ]);
    expect(lessons.some((lesson) => lesson.title === "Interactive Scenario: Jordan's Role Change")).toBe(true);
    expect(blocks.some((block) => block.type === "scenario")).toBe(true);
    expect(blocks.some((block) => block.type === "evidence_builder")).toBe(true);
    expect(blocks.some((block) => block.type === "classification")).toBe(true);
    expect(questions).toHaveLength(15);
  });

  it("starts Taylor at the seeded resume point with assessment still locked", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const course = data.courses.find((item) => item.id === "course-cip004-annual-refresher")!;
    const currentLesson = data.lessons.find((lesson) => lesson.id === data.enrollments.find((item) => item.userId === learner.id && item.courseId === course.id)?.currentLessonId)!;
    const state = getCourseCompletionState(data, learner.id, course.id);

    expect(currentLesson.title).toBe("Transfers, Promotions & Role Changes");
    expect(state.percent).toBeGreaterThanOrEqual(46);
    expect(state.canStartAssessment).toBe(false);
    expect(state.courseComplete).toBe(false);
  });

  it("evaluates completion gates from persisted local records", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const course = data.courses.find((item) => item.id === "course-cip004-annual-refresher")!;
    const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
    const assessment = data.assessments.find((item) => item.courseVersionId === course.currentVersionId)!;

    for (const lesson of lessons.filter((lesson) => lesson.required && !data.lessonProgress.some((item) => item.userId === learner.id && item.lessonId === lesson.id))) {
      data.lessonProgress.push({ id: `lp_${lesson.id}`, userId: learner.id, lessonId: lesson.id, completedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    for (const block of data.contentBlocks.filter((block) => block.required && block.type !== "knowledge_check" && lessons.some((lesson) => lesson.id === block.lessonId))) {
      data.scenarioAttempts.push({ id: `activity_${block.id}`, userId: learner.id, scenarioId: block.id, courseId: course.id, courseVersionId: course.currentVersionId, lessonId: block.lessonId, score: 100, answers: { test: true }, status: "COMPLETED", completedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    data.assessmentAttempts.push({ id: "attempt_test", userId: learner.id, assessmentId: assessment.id, courseId: course.id, score: 100, passed: true, submittedAt: new Date().toISOString(), attemptNumber: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    data.acknowledgements.push({ id: "ack_test", userId: learner.id, courseId: course.id, courseVersionId: course.currentVersionId!, text: "Acknowledged for test.", status: "SUBMITTED", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    data.userCertifications.push({ id: "cert_test", userId: learner.id, certificationId: data.certificationRequirements.find((item) => item.targetId === course.id)!.certificationId, courseId: course.id, courseVersionId: course.currentVersionId, certificateId: `GG-CIP004-${new Date().getFullYear()}-TM-0001`, issuedAt: new Date().toISOString(), expiresAt: new Date().toISOString(), status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const state = getCourseCompletionState(data, learner.id, course.id);

    expect(state.courseComplete).toBe(true);
    expect(data.userCertifications.find((item) => item.userId === learner.id && item.courseId === course.id)?.certificateId).toBe(`GG-CIP004-${new Date().getFullYear()}-TM-0001`);
    expect(data.acknowledgements.find((item) => item.userId === learner.id && item.courseId === course.id)?.status).toBe("SUBMITTED");
  });
});
