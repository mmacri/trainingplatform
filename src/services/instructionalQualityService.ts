import type { AppData, Course, Lesson } from "../data/schema";

export interface InstructionalQualityFinding {
  id: string;
  severity: "INFO" | "WARNING" | "BLOCKING";
  category: string;
  message: string;
  targetType: string;
  targetId: string;
  recommendation: string;
}

export interface CourseInstructionalQuality {
  structure: "STRONG" | "NEEDS_ATTENTION";
  visualLearning: "STRONG" | "NEEDS_ATTENTION";
  interactivity: "STRONG" | "NEEDS_ATTENTION";
  appliedPractice: "STRONG" | "NEEDS_ATTENTION";
  feedback: "STRONG" | "NEEDS_ATTENTION";
  reinforcement: "STRONG" | "NEEDS_ATTENTION";
  referenceValue: "STRONG" | "NEEDS_ATTENTION";
  findings: InstructionalQualityFinding[];
}

const visualTypes = new Set(["learning_diagram", "process_diagram", "timeline", "before_after", "comparison", "network_explorer", "system_inspector", "evidence_inspector", "artifact_review", "investigation_activity", "record_repair"]);
const actionTypes = new Set(["knowledge_check", "quick_recall", "decision_cards", "classification", "matching", "sequence_builder", "rapid_decisions", "checklist", "checklist_activity", "system_inspector", "evidence_inspector", "artifact_review", "investigation_activity", "record_repair", "scenario"]);
const appliedTypes = new Set(["scenario", "system_inspector", "network_explorer", "artifact_review", "investigation_activity", "record_repair"]);

export class InstructionalQualityService {
  static analyzeCourse(data: AppData, courseId: string): CourseInstructionalQuality {
    const course = data.courses.find((item) => item.id === courseId);
    if (!course) return emptyQuality("Course not found");
    const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
    const findings: InstructionalQualityFinding[] = [];
    const blocks = data.contentBlocks.filter((block) => lessons.some((lesson) => lesson.id === block.lessonId));

    for (const lesson of lessons) {
      findings.push(...this.analyzeLesson(data, lesson));
    }

    const resources = data.learningResources.filter((resource) => resource.relatedCourseIds.includes(course.id)).length + data.courseResources.filter((resource) => resource.courseId === course.id).length;
    if (!resources) {
      findings.push(finding("WARNING", "Reference Value", `${course.title} has no reusable reference resource.`, "Course", course.id, "Add a quick reference, checklist, or job aid for Use at Work mode."));
    }

    const assessment = data.assessments.find((item) => item.courseVersionId === course.currentVersionId);
    const questions = assessment ? data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id) : [];
    if (course.finalAssessmentEnabled !== false && !questions.length) {
      findings.push(finding("BLOCKING", "Assessment", "Final assessment is enabled but has no questions.", "Course", course.id, "Add valid assessment questions or disable the final assessment."));
    }

    return {
      structure: findings.some((item) => item.category === "Structure") ? "NEEDS_ATTENTION" : "STRONG",
      visualLearning: blocks.some((block) => visualTypes.has(block.type)) ? "STRONG" : "NEEDS_ATTENTION",
      interactivity: blocks.some((block) => actionTypes.has(block.type)) ? "STRONG" : "NEEDS_ATTENTION",
      appliedPractice: blocks.some((block) => appliedTypes.has(block.type)) ? "STRONG" : "NEEDS_ATTENTION",
      feedback: findings.some((item) => item.category === "Feedback") ? "NEEDS_ATTENTION" : "STRONG",
      reinforcement: blocks.some((block) => block.type === "quick_recall") ? "STRONG" : "NEEDS_ATTENTION",
      referenceValue: resources ? "STRONG" : "NEEDS_ATTENTION",
      findings
    };
  }

  static analyzeLesson(data: AppData, lesson: Lesson): InstructionalQualityFinding[] {
    const blocks = data.contentBlocks.filter((block) => block.lessonId === lesson.id).sort((left, right) => left.position - right.position);
    const findings: InstructionalQualityFinding[] = [];
    if (!blocks.length) {
      findings.push(finding("BLOCKING", "Structure", `${lesson.title} has no content blocks.`, "Lesson", lesson.id, "Add lesson content or remove the lesson."));
      return findings;
    }
    let textWords = 0;
    let consecutiveText = 0;
    for (const block of blocks) {
      const words = `${block.title ?? ""} ${block.body ?? ""}`.split(/\s+/).filter(Boolean).length;
      const textHeavy = ["paragraph", "rich_text"].includes(block.type) && words > 120;
      textWords += words;
      consecutiveText = textHeavy ? consecutiveText + 1 : 0;
      if (consecutiveText >= 3) {
        findings.push(finding("WARNING", "Interactivity", `${lesson.title} has three or more text-heavy blocks in a row.`, "Lesson", lesson.id, "Add an artifact, diagram, decision, or practice activity to break up passive reading."));
        consecutiveText = 0;
      }
    }
    if (textWords > 700 && !blocks.some((block) => visualTypes.has(block.type) || actionTypes.has(block.type))) {
      findings.push(finding("WARNING", "Visual Learning", `${lesson.title} has about ${textWords} words without a meaningful learner action or visual anchor.`, "Lesson", lesson.id, "Add one visual explanation or applied artifact review."));
    }
    if (!blocks.some((block) => visualTypes.has(block.type))) {
      findings.push(finding("INFO", "Visual Learning", `${lesson.title} has no visual, artifact, or simulation block.`, "Lesson", lesson.id, "Consider adding a diagram, artifact, or comparison if it would improve understanding."));
    }
    if (!blocks.some((block) => actionTypes.has(block.type))) {
      findings.push(finding("WARNING", "Interactivity", `${lesson.title} has no meaningful learner action.`, "Lesson", lesson.id, "Add a knowledge check, investigation, decision, or classification activity."));
    }
    if (!blocks.some((block) => block.type === "module_summary" || block.type.includes("takeaway") || /takeaway|you can now/i.test(`${block.title ?? ""} ${block.body ?? ""}`))) {
      findings.push(finding("INFO", "Takeaway", `${lesson.title} has no clear takeaway block.`, "Lesson", lesson.id, "End with what the learner should now be able to do."));
    }
    return findings;
  }
}

function emptyQuality(message: string): CourseInstructionalQuality {
  return {
    structure: "NEEDS_ATTENTION",
    visualLearning: "NEEDS_ATTENTION",
    interactivity: "NEEDS_ATTENTION",
    appliedPractice: "NEEDS_ATTENTION",
    feedback: "NEEDS_ATTENTION",
    reinforcement: "NEEDS_ATTENTION",
    referenceValue: "NEEDS_ATTENTION",
    findings: [finding("BLOCKING", "Structure", message, "Course", "unknown", "Open a valid course.")]
  };
}

function finding(severity: InstructionalQualityFinding["severity"], category: string, message: string, targetType: string, targetId: string, recommendation: string): InstructionalQualityFinding {
  return { id: `${category}-${targetId}-${message}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"), severity, category, message, targetType, targetId, recommendation };
}
