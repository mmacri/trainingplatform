import type { AppData } from "../data/schema";

export interface CourseCompletionState {
  percent: number;
  requiredItems: string[];
  completedItems: string[];
  remainingItems: string[];
  nextAction?: { label: string; lessonId?: string; type: string };
  canStartAssessment: boolean;
  assessmentPassed: boolean;
  acknowledgementRequired: boolean;
  acknowledgementComplete: boolean;
  courseComplete: boolean;
  certificateAvailable: boolean;
  resumeDestination: string;
  score?: number;
}

export function getCourseCompletionState(data: AppData, userId: string, courseId: string): CourseCompletionState {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course?.currentVersionId) {
    return { percent: 0, requiredItems: [], completedItems: [], remainingItems: [], canStartAssessment: false, assessmentPassed: false, acknowledgementRequired: false, acknowledgementComplete: false, courseComplete: false, certificateAvailable: false, resumeDestination: `/courses/${courseId}` };
  }
  const modules = data.modules.filter((module) => module.courseVersionId === course.currentVersionId);
  const modulePosition = new Map(modules.map((module) => [module.id, module.position]));
  const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId).sort((left, right) => (modulePosition.get(left.moduleId) ?? 0) - (modulePosition.get(right.moduleId) ?? 0) || left.position - right.position);
  const assessmentLesson = lessons.find((lesson) => lesson.title.toLowerCase().includes("final assessment"));
  const acknowledgementLesson = lessons.find((lesson) => lesson.title.toLowerCase().includes("acknowledgement"));
  const normalRequiredLessons = lessons.filter((lesson) => lesson.required && !["final assessment", "learner acknowledgement", "completion summary", "certificate"].some((title) => lesson.title.toLowerCase().includes(title)));
  const requiredActivityTypes = ["scenario", "decision_exercise", "classification", "evidence_builder", "system_inspector", "evidence_inspector", "build_record", "network_explorer", "coverage_map", "sequence_builder", "ordering", "decision_cards", "rapid_decisions", "matching", "checklist_activity"];
  const requiredActivityBlocks = data.contentBlocks.filter((block) => block.required && lessons.some((lesson) => lesson.id === block.lessonId) && requiredActivityTypes.includes(block.type));
  const requiredItems = [
    ...normalRequiredLessons.map((lesson) => lesson.id),
    ...requiredActivityBlocks.map((block) => block.id),
    ...(course.finalAssessmentEnabled !== false ? ["assessment"] : []),
    ...(course.requireAcknowledgement ? ["acknowledgement"] : [])
  ];
  const completedItems: string[] = [];
  for (const lesson of normalRequiredLessons) {
    if (data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === lesson.id && progress.completedAt)) completedItems.push(lesson.id);
  }
  for (const block of requiredActivityBlocks) {
    const parentLessonComplete = data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === block.lessonId && progress.completedAt);
    if (parentLessonComplete || data.scenarioAttempts.some((attempt) => attempt.userId === userId && attempt.scenarioId === block.id && attempt.status === "COMPLETED")) completedItems.push(block.id);
  }
  const assessment = data.assessments.find((item) => item.courseVersionId === course.currentVersionId);
  const passingAttempt = assessment
    ? data.assessmentAttempts.filter((attempt) => attempt.userId === userId && attempt.assessmentId === assessment.id && attempt.passed).sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0]
    : undefined;
  if (passingAttempt) completedItems.push("assessment");
  const acknowledgement = data.acknowledgements.find((item) => item.userId === userId && item.courseId === courseId && item.courseVersionId === course.currentVersionId);
  if (course.requireAcknowledgement && acknowledgement) completedItems.push("acknowledgement");
  const remainingItems = requiredItems.filter((item) => !completedItems.includes(item));
  const canStartAssessment = normalRequiredLessons.every((lesson) => completedItems.includes(lesson.id)) && requiredActivityBlocks.every((block) => completedItems.includes(block.id));
  const courseComplete = remainingItems.length === 0;
  const enrollment = data.enrollments.find((item) => item.userId === userId && item.courseId === courseId);
  const firstRemainingLesson = normalRequiredLessons.find((lesson) => !completedItems.includes(lesson.id));
  const firstRemainingActivity = requiredActivityBlocks.find((block) => !completedItems.includes(block.id));
  const resumeLessonId = enrollment?.currentLessonId && lessons.some((lesson) => lesson.id === enrollment.currentLessonId)
    ? enrollment.currentLessonId
    : firstRemainingLesson?.id ?? firstRemainingActivity?.lessonId ?? (canStartAssessment ? assessmentLesson?.id : lessons[0]?.id);
  const nextAction = !canStartAssessment && (firstRemainingLesson?.id ?? firstRemainingActivity?.lessonId)
    ? { label: `Continue: ${firstRemainingLesson?.title ?? lessons.find((lesson) => lesson.id === firstRemainingActivity?.lessonId)?.title ?? "Required training"}`, lessonId: firstRemainingLesson?.id ?? firstRemainingActivity?.lessonId, type: "lesson" }
    : !passingAttempt
      ? { label: "Begin Final Assessment", lessonId: assessmentLesson?.id, type: "assessment" }
      : course.requireAcknowledgement && !acknowledgement
        ? { label: "Submit Acknowledgement", lessonId: acknowledgementLesson?.id, type: "acknowledgement" }
        : courseComplete
          ? { label: "View Certificate", lessonId: lessons.find((lesson) => lesson.title === "Certificate")?.id, type: "certificate" }
          : undefined;
  const calculatedPercent = requiredItems.length ? Math.round((completedItems.length / requiredItems.length) * 100) : 0;
  const progress = data.courseProgress.find((item) => item.userId === userId && item.courseId === courseId);
  const persistedPercent = progress?.percentComplete ?? 0;
  const displayPercent = courseComplete
    ? 100
    : progress?.status === "COMPLETED"
      ? calculatedPercent
      : Math.max(calculatedPercent, persistedPercent);
  return {
    percent: displayPercent,
    requiredItems,
    completedItems,
    remainingItems,
    nextAction,
    canStartAssessment,
    assessmentPassed: Boolean(passingAttempt),
    acknowledgementRequired: Boolean(course.requireAcknowledgement),
    acknowledgementComplete: Boolean(acknowledgement),
    courseComplete,
    certificateAvailable: data.userCertifications.some((cert) => cert.userId === userId && cert.courseId === courseId),
    resumeDestination: resumeLessonId ? `/learn/${courseId}/${resumeLessonId}` : `/courses/${courseId}`,
    score: passingAttempt?.score
  };
}
