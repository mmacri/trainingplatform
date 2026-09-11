import type { AppData } from "../data/schema";
import { buildCourseAnalysisContext, type CourseAnalysisContext } from "../domain/courseSelectors";
import { isInteractiveBlock, isInvestigationBlock, isPracticeBlock, isVisualBlock } from "../domain/contentBlockTaxonomy";

export type CourseDepthAuditState = "STRONG" | "NEEDS_DEPTH" | "NEEDS_DIFFERENTIATION" | "NEEDS_PRACTICE" | "NEEDS_REFERENCE_VALUE";
export type AuditState = "STRONG" | "NEEDS_ATTENTION";

export interface CourseDepthFinding {
  id: string;
  courseId: string;
  lessonId?: string;
  category: "CONTENT" | "VISUAL" | "PRACTICE" | "INVESTIGATION" | "SCENARIO" | "ASSESSMENT" | "REMEDIATION" | "REFERENCE" | "DIFFERENTIATION";
  severity: "INFO" | "WARNING" | "BLOCKING";
  message: string;
  recommendation: string;
}

export interface CourseDepthAudit {
  courseId: string;
  overallState: CourseDepthAuditState;
  dimensions: {
    contentDepth: AuditState;
    visualLearning: AuditState;
    activePractice: AuditState;
    investigation: AuditState;
    scenarioQuality: AuditState;
    assessmentQuality: AuditState;
    remediation: AuditState;
    referenceValue: AuditState;
    differentiation: AuditState;
  };
  findings: CourseDepthFinding[];
}

export class CourseDepthAuditService {
  static auditAll(data: AppData): CourseDepthAudit[] {
    return data.courses.filter((course) => course.status !== "ARCHIVED" && course.showInCatalog).map((course) => this.auditCourse(data, course.id));
  }

  static auditCourse(data: AppData, courseId: string): CourseDepthAudit {
    const context = buildCourseAnalysisContext(data, courseId);
    if (!context) throw new Error("Course not found.");
    return this.auditContext(data, context);
  }

  static auditContext(data: AppData, context: CourseAnalysisContext): CourseDepthAudit {
    const { course, lessons, blocks, assessments, assessmentQuestions, resources, artifacts, scenarios, profile } = context;
    if (!course) throw new Error("Course not found.");
    const questionCount = assessmentQuestions.length;
    const findings: CourseDepthFinding[] = [];
    const add = (category: CourseDepthFinding["category"], message: string, recommendation: string, severity: CourseDepthFinding["severity"] = "WARNING", lessonId?: string) => findings.push({ id: `${course.id}-${category.toLowerCase()}-${findings.length + 1}`, courseId: course.id, lessonId, category, severity, message, recommendation });

    const requiredLessons = course.estimatedMinutes >= 70 ? 10 : course.estimatedMinutes >= 41 ? 8 : 6;
    const requiredInteractions = course.estimatedMinutes >= 70 ? 5 : course.estimatedMinutes >= 41 ? 4 : 3;
    const requiredQuestions = course.estimatedMinutes >= 70 ? 12 : course.estimatedMinutes >= 41 ? 10 : 8;
    if (lessons.length < requiredLessons) add("CONTENT", `${course.title} has ${lessons.length} lessons; expected about ${requiredLessons} for this duration.`, "Add substantive learning segments rather than completion-only pages.");
    if (blocks.filter((block) => isVisualBlock(block.type)).length === 0) add("VISUAL", "No signature visual learning block found.", "Add a course-specific diagram, simulation, or artifact view.");
    if (blocks.filter((block) => isPracticeBlock(block.type)).length < requiredInteractions) add("PRACTICE", "The course has limited active practice.", "Add course-specific classification, sequence, inspection, or decision activities.");
    if (blocks.filter((block) => isInvestigationBlock(block.type)).length === 0 && artifacts.length === 0) add("INVESTIGATION", "No realistic artifact investigation is attached.", "Add an artifact review or multi-tool investigation aligned to the course identity.");
    if (scenarios.length === 0) add("SCENARIO", "No applied scenario is connected.", "Attach at least one realistic scenario or capstone application.");
    if (questionCount < requiredQuestions && assessments.some((assessment) => assessment.required)) add("ASSESSMENT", `Only ${questionCount} assessment questions found.`, "Add authored questions mapped to course topics.");
    if (!assessments.every((assessment) => data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id).every((item) => (data.questions.find((question) => question.id === item.questionId)?.tags?.length ?? 0) > 0))) add("REMEDIATION", "Some assessment questions have weak remediation mapping.", "Map missed topics to real lessons or practice.");
    if (resources.length === 0) add("REFERENCE", "No Use at Work reference resources are attached.", "Add concise job aids, checklists, or process guides.");
    if (!profile) add("DIFFERENTIATION", "No explicit course experience profile is defined.", "Define primary learning mode, motif, artifact types, interactions, and signature scenario style.");

    lessons.forEach((lesson) => {
      const lessonBlocks = blocks.filter((block) => block.lessonId === lesson.id);
      const textHeavy = lessonBlocks.filter((block) => ["paragraph", "rich_text", "heading"].includes(block.type)).length;
      const active = lessonBlocks.some((block) => isVisualBlock(block.type) || isInteractiveBlock(block.type) || isInvestigationBlock(block.type));
      if (textHeavy >= 3 && !active) add("PRACTICE", `${lesson.title} is mostly passive text.`, "Add an inspection, comparison, decision, or visual explanation.", "INFO", lesson.id);
    });

    const dimensions = {
      contentDepth: lessons.length >= requiredLessons ? "STRONG" : "NEEDS_ATTENTION",
      visualLearning: findings.some((finding) => finding.category === "VISUAL") ? "NEEDS_ATTENTION" : "STRONG",
      activePractice: blocks.filter((block) => isPracticeBlock(block.type)).length >= requiredInteractions ? "STRONG" : "NEEDS_ATTENTION",
      investigation: blocks.some((block) => isInvestigationBlock(block.type)) || artifacts.length ? "STRONG" : "NEEDS_ATTENTION",
      scenarioQuality: scenarios.length ? "STRONG" : "NEEDS_ATTENTION",
      assessmentQuality: questionCount >= requiredQuestions || !assessments.some((assessment) => assessment.required) ? "STRONG" : "NEEDS_ATTENTION",
      remediation: findings.some((finding) => finding.category === "REMEDIATION") ? "NEEDS_ATTENTION" : "STRONG",
      referenceValue: resources.length ? "STRONG" : "NEEDS_ATTENTION",
      differentiation: profile ? "STRONG" : "NEEDS_ATTENTION"
    } satisfies CourseDepthAudit["dimensions"];
    const overallState: CourseDepthAuditState = dimensions.differentiation === "NEEDS_ATTENTION"
      ? "NEEDS_DIFFERENTIATION"
      : dimensions.activePractice === "NEEDS_ATTENTION"
        ? "NEEDS_PRACTICE"
        : dimensions.referenceValue === "NEEDS_ATTENTION"
          ? "NEEDS_REFERENCE_VALUE"
          : Object.values(dimensions).some((state) => state === "NEEDS_ATTENTION") ? "NEEDS_DEPTH" : "STRONG";
    return { courseId: course.id, overallState, dimensions, findings };
  }
}
