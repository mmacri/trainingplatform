import type { AppData, ContentBlock, Lesson } from "../data/schema";

const activityTypes = new Set([
  "knowledge_check",
  "quick_recall",
  "decision_cards",
  "classification",
  "matching",
  "sequence_builder",
  "system_inspector",
  "evidence_inspector",
  "artifact_review",
  "investigation_activity",
  "record_repair",
  "learning_diagram",
  "network_explorer",
  "scenario"
]);

export class LearningTimeService {
  static estimateActivityTime(block: ContentBlock) {
    const configured = (block.data as { estimatedMinutes?: number } | undefined)?.estimatedMinutes;
    if (typeof configured === "number" && configured > 0) return configured;
    if (activityTypes.has(block.type)) return block.type === "scenario" ? 6 : 2;
    const words = `${block.title ?? ""} ${block.body ?? ""}`.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 150));
  }

  static estimateLessonRemaining(data: AppData, lesson: Lesson, userId: string) {
    const done = data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === lesson.id && progress.completedAt);
    if (done) return 0;
    const blocks = data.contentBlocks.filter((block) => block.lessonId === lesson.id);
    const estimated = blocks.length ? blocks.reduce((sum, block) => sum + this.estimateActivityTime(block), 0) : lesson.estimatedMinutes;
    return Math.max(lesson.estimatedMinutes || 1, Math.ceil(estimated));
  }

  static estimateModuleRemaining(data: AppData, moduleId: string, userId: string) {
    return data.lessons
      .filter((lesson) => lesson.moduleId === moduleId)
      .reduce((sum, lesson) => sum + this.estimateLessonRemaining(data, lesson, userId), 0);
  }

  static estimateCourseRemaining(data: AppData, courseId: string, userId: string) {
    const course = data.courses.find((item) => item.id === courseId);
    if (!course) return 0;
    const modules = data.modules.filter((module) => module.courseVersionId === course.currentVersionId);
    if (!modules.length) return course.estimatedMinutes;
    return modules.reduce((sum, module) => sum + this.estimateModuleRemaining(data, module.id, userId), 0);
  }

  static formatApprox(minutes: number) {
    if (minutes <= 0) return "Complete";
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `~${hours} hr ${remainder} min` : `~${hours} hr`;
  }
}
