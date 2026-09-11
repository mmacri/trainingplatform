import type { AppData } from "../data/schema";

export type LearningContentValidationSeverity = "READY" | "REVIEW" | "BLOCKED";

export interface LearningContentValidationIssue {
  id: string;
  courseId?: string;
  severity: LearningContentValidationSeverity;
  category:
    | "BROKEN_ID"
    | "ASSESSMENT"
    | "DUPLICATE_QUESTION"
    | "SCENARIO"
    | "REMEDIATION"
    | "COMPLETION"
    | "REFERENCE";
  message: string;
  targetId?: string;
}

export class LearningContentValidator {
  static validateCourse(data: AppData, courseId: string): LearningContentValidationIssue[] {
    const course = data.courses.find((item) => item.id === courseId);
    if (!course) return [issue("missing-course", "BLOCKED", "BROKEN_ID", `Course ${courseId} does not exist.`, courseId)];
    const issues: LearningContentValidationIssue[] = [];
    const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    const modules = data.modules.filter((module) => module.courseVersionId === course.currentVersionId);
    const moduleIds = new Set(modules.map((module) => module.id));

    lessons.forEach((lesson) => {
      if (!moduleIds.has(lesson.moduleId)) issues.push(issue(`${course.id}-${lesson.id}-module`, "BLOCKED", "BROKEN_ID", `${lesson.title} points to a missing module.`, lesson.id, course.id));
    });
    data.contentBlocks
      .filter((block) => lessonIds.has(block.lessonId))
      .forEach((block) => {
        if (!block.title?.trim() && !block.body?.trim()) issues.push(issue(`${course.id}-${block.id}-empty`, "REVIEW", "REFERENCE", `A ${block.type} block has no learner-facing title or body.`, block.id, course.id));
      });

    const assessments = data.assessments.filter((assessment) => assessment.courseVersionId === course.currentVersionId);
    assessments.forEach((assessment) => {
      const links = data.assessmentQuestions.filter((link) => link.assessmentId === assessment.id);
      if (assessment.required && links.length < 3) issues.push(issue(`${assessment.id}-few-questions`, "BLOCKED", "ASSESSMENT", `${assessment.title} has fewer than 3 questions.`, assessment.id, course.id));
      const prompts = links.map((link) => data.questions.find((question) => question.id === link.questionId)).filter(Boolean);
      const normalized = new Map<string, number>();
      prompts.forEach((question) => {
        if (!question) return;
        const options = data.questionOptions.filter((option) => option.questionId === question.id);
        if (!question.prompt.trim()) issues.push(issue(`${question.id}-prompt`, "BLOCKED", "ASSESSMENT", "Assessment question is missing a prompt.", question.id, course.id));
        if (!question.explanation.trim()) issues.push(issue(`${question.id}-feedback`, "REVIEW", "ASSESSMENT", `${question.prompt.slice(0, 80)} is missing explanatory feedback.`, question.id, course.id));
        if ((question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && options.filter((option) => option.isCorrect).length !== 1) {
          issues.push(issue(`${question.id}-correct`, "BLOCKED", "ASSESSMENT", `${question.prompt.slice(0, 80)} must have exactly one correct option.`, question.id, course.id));
        }
        if (question.type === "MULTIPLE_SELECT" && options.filter((option) => option.isCorrect).length < 1) {
          issues.push(issue(`${question.id}-multi-correct`, "BLOCKED", "ASSESSMENT", `${question.prompt.slice(0, 80)} must have at least one correct option.`, question.id, course.id));
        }
        if (/^(in\s+)?cip-\d{3}.*lesson\s+\d+|strongest learner action/i.test(question.prompt)) {
          issues.push(issue(`${question.id}-formulaic`, "BLOCKED", "ASSESSMENT", `${question.prompt.slice(0, 90)} appears to be generated formulaic wording.`, question.id, course.id));
        }
        const key = normalize(question.prompt);
        normalized.set(key, (normalized.get(key) ?? 0) + 1);
      });
      normalized.forEach((count, prompt) => {
        if (count > 1) issues.push(issue(`${assessment.id}-duplicate-${prompt.slice(0, 20)}`, "BLOCKED", "DUPLICATE_QUESTION", `${count} assessment questions have duplicate normalized prompt text.`, assessment.id, course.id));
      });
    });

    data.scenarioDefinitions
      .filter((scenario) => scenario.relatedCourseIds.includes(course.id))
      .forEach((scenario) => {
        const stepIds = new Set(scenario.steps.map((step) => step.id));
        if (!scenario.steps.length) issues.push(issue(`${scenario.id}-steps`, "BLOCKED", "SCENARIO", `${scenario.title} has no steps.`, scenario.id, course.id));
        scenario.steps.forEach((step) => {
          step.choices?.forEach((choice) => {
            if (choice.nextStepId && !stepIds.has(choice.nextStepId)) issues.push(issue(`${scenario.id}-${choice.id}-next`, "BLOCKED", "SCENARIO", `${scenario.title} has a choice pointing to a missing step.`, scenario.id, course.id));
            if (!choice.feedback.trim()) issues.push(issue(`${scenario.id}-${choice.id}-feedback`, "REVIEW", "SCENARIO", `${scenario.title} choice ${choice.label} is missing feedback.`, scenario.id, course.id));
          });
        });
      });

    const resources = data.learningResources.filter((resource) => resource.relatedCourseIds.includes(course.id));
    if (!resources.length) issues.push(issue(`${course.id}-resources`, "REVIEW", "REFERENCE", "Course has no Use at Work reference resources.", course.id, course.id));
    return issues;
  }

  static validateAll(data: AppData): LearningContentValidationIssue[] {
    return data.courses.flatMap((course) => this.validateCourse(data, course.id));
  }
}

function issue(id: string, severity: LearningContentValidationSeverity, category: LearningContentValidationIssue["category"], message: string, targetId?: string, courseId?: string): LearningContentValidationIssue {
  return { id, severity, category, message, targetId, courseId };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
