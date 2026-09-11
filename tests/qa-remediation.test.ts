import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
import { addLearningIntelligenceSeed } from "../src/data/learningIntelligenceSeed";
import { canAccessCourse, getCourseCompletionState } from "../src/services/appServices";
import { LearningContentValidator } from "../src/services/learningContentValidator";
import { LearningTimeService } from "../src/services/learningTimeService";

const learnerEmail = "learner@gridguard.local";

function learnerId(data: ReturnType<typeof createSeedData>) {
  return data.users.find((user) => user.email === learnerEmail)!.id;
}

describe("QA remediation hardening", () => {
  it("publishes learner-visible CIP-005 and CIP-008 while preserving access", () => {
    const data = createSeedData();
    const learner = learnerId(data);

    for (const courseId of ["course-cip005-esp-access", "course-cip008-incident-response"]) {
      const course = data.courses.find((item) => item.id === courseId)!;
      const version = data.courseVersions.find((item) => item.id === course.currentVersionId)!;

      expect(course.status).toBe("PUBLISHED");
      expect(course.showInCatalog).toBe(true);
      expect(course.allowSelfEnrollment).toBe(true);
      expect(version.status).toBe("PUBLISHED");
      expect(version.immutable).toBe(true);
      expect(canAccessCourse(data, learner, courseId).allowed).toBe(true);
    }
  });

  it("migrates existing v5 local data so learner-facing review demo courses are accessible", () => {
    const data = createSeedData();
    const cip005 = data.courses.find((course) => course.id === "course-cip005-esp-access")!;
    const cip008 = data.courses.find((course) => course.id === "course-cip008-incident-response")!;
    const cip005Version = data.courseVersions.find((version) => version.id === cip005.currentVersionId)!;
    const cip008Version = data.courseVersions.find((version) => version.id === cip008.currentVersionId)!;
    const setting = data.applicationSettings.find((item) => item.key === "learningExperienceVersion")!;

    cip005.status = "CHANGES_REQUESTED";
    cip005Version.status = "CHANGES_REQUESTED";
    cip005.showInCatalog = false;
    cip005.allowSelfEnrollment = false;
    cip008.status = "APPROVED";
    cip008Version.status = "APPROVED";
    cip008.showInCatalog = false;
    cip008.allowSelfEnrollment = false;
    setting.value = 5;

    addLearningIntelligenceSeed(data);

    expect(data.applicationSettings.find((item) => item.key === "learningExperienceVersion")?.value).toBe(6);
    expect(data.courses.find((course) => course.id === cip005.id)?.status).toBe("PUBLISHED");
    expect(data.courseVersions.find((version) => version.id === cip005Version.id)?.status).toBe("PUBLISHED");
    expect(data.courses.find((course) => course.id === cip008.id)?.status).toBe("PUBLISHED");
    expect(data.courseVersions.find((version) => version.id === cip008Version.id)?.status).toBe("PUBLISHED");
    expect(canAccessCourse(data, learnerId(data), cip005.id).allowed).toBe(true);
    expect(canAccessCourse(data, learnerId(data), cip008.id).allowed).toBe(true);
  });

  it("does not ship generated formulaic assessment prompts in published courses", () => {
    const data = createSeedData();
    const publishedVersionIds = new Set(data.courses.filter((course) => course.status === "PUBLISHED").map((course) => course.currentVersionId));
    const publishedAssessmentIds = new Set(data.assessments.filter((assessment) => publishedVersionIds.has(assessment.courseVersionId)).map((assessment) => assessment.id));
    const prompts = data.assessmentQuestions
      .filter((link) => publishedAssessmentIds.has(link.assessmentId))
      .map((link) => data.questions.find((question) => question.id === link.questionId)?.prompt ?? "");

    expect(prompts.filter((prompt) => /^(in\s+)?cip-\d{3}.*lesson\s+\d+|strongest learner action/i.test(prompt))).toEqual([]);
  });

  it("keeps completed-course progress and required-item counts consistent", () => {
    const data = createSeedData();
    const state = getCourseCompletionState(data, learnerId(data), "course-cip007-system-security");

    expect(state.courseComplete).toBe(true);
    expect(state.percent).toBe(100);
    expect(state.remainingItems).toEqual([]);
    expect(state.completedItems.length).toBe(state.requiredItems.length);
  });

  it("caps remaining-time estimates to the authored course duration", () => {
    const data = createSeedData();
    const learner = learnerId(data);

    for (const course of data.courses.filter((item) => item.status === "PUBLISHED" && item.showInCatalog)) {
      expect(LearningTimeService.estimateCourseRemaining(data, course.id, learner)).toBeLessThanOrEqual(course.estimatedMinutes);
    }
  });

  it("flags broken assessment and scenario content through the shared validator", () => {
    const data = createSeedData();
    const course = data.courses.find((item) => item.id === "course-cip007-system-security")!;
    const assessment = data.assessments.find((item) => item.courseVersionId === course.currentVersionId)!;
    const linkedQuestion = data.assessmentQuestions.find((item) => item.assessmentId === assessment.id)!;
    const question = data.questions.find((item) => item.id === linkedQuestion.questionId)!;
    const scenario = data.scenarioDefinitions.find((item) => item.relatedCourseIds.includes(course.id) && item.steps.some((step) => step.choices?.length))!;
    const choice = scenario.steps.find((step) => step.choices?.length)!.choices![0];

    question.prompt = "In CIP-007 lesson 1, System Security: what is the strongest learner action?";
    data.questionOptions.filter((option) => option.questionId === question.id).forEach((option) => {
      option.isCorrect = false;
    });
    choice.nextStepId = "missing-step";

    const issues = LearningContentValidator.validateCourse(data, course.id);

    expect(issues.some((issue) => issue.category === "ASSESSMENT" && issue.severity === "BLOCKED")).toBe(true);
    expect(issues.some((issue) => issue.category === "SCENARIO" && issue.severity === "BLOCKED")).toBe(true);
  });
});
