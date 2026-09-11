import type {
  AppData,
  Assessment,
  AssessmentQuestion,
  ContentBlock,
  ContentFeedback,
  Course,
  CourseExperienceProfile,
  CourseResource,
  CourseStandardMapping,
  CourseVersion,
  LearningResource,
  Lesson,
  Module,
  Question,
  ScenarioDefinition,
  TrainingArtifact
} from "../data/schema";

export interface CourseAnalysisContext {
  course: Course;
  version?: CourseVersion;
  modules: Module[];
  lessons: Lesson[];
  blocks: ContentBlock[];
  assessments: Assessment[];
  assessmentQuestions: AssessmentQuestion[];
  questions: Question[];
  resources: LearningResource[];
  courseResources: CourseResource[];
  artifacts: TrainingArtifact[];
  scenarios: ScenarioDefinition[];
  feedback: ContentFeedback[];
  mappings: CourseStandardMapping[];
  profile?: CourseExperienceProfile;
}

export function getCourseById(data: AppData, courseId: string) {
  return data.courses.find((course) => course.id === courseId);
}

export function getCourseCurrentVersion(data: AppData, courseId: string) {
  const course = getCourseById(data, courseId);
  return course ? data.courseVersions.find((version) => version.id === course.currentVersionId) : undefined;
}

export function getCourseModules(data: AppData, courseId: string) {
  const course = getCourseById(data, courseId);
  return course ? data.modules.filter((module) => module.courseVersionId === course.currentVersionId) : [];
}

export function getCourseLessons(data: AppData, courseId: string) {
  const course = getCourseById(data, courseId);
  return course ? data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId) : [];
}

export function getCourseBlocks(data: AppData, courseId: string) {
  const lessonIds = new Set(getCourseLessons(data, courseId).map((lesson) => lesson.id));
  return data.contentBlocks.filter((block) => lessonIds.has(block.lessonId));
}

export function getCourseAssessments(data: AppData, courseId: string) {
  const course = getCourseById(data, courseId);
  return course ? data.assessments.filter((assessment) => assessment.courseVersionId === course.currentVersionId) : [];
}

export function getCourseAssessmentQuestions(data: AppData, courseId: string) {
  const assessmentIds = new Set(getCourseAssessments(data, courseId).map((assessment) => assessment.id));
  return data.assessmentQuestions.filter((item) => assessmentIds.has(item.assessmentId));
}

export function getCourseQuestions(data: AppData, courseId: string) {
  const questionIds = new Set(getCourseAssessmentQuestions(data, courseId).map((item) => item.questionId));
  return data.questions.filter((question) => questionIds.has(question.id));
}

export function getCourseResources(data: AppData, courseId: string) {
  return data.learningResources.filter((resource) => resource.relatedCourseIds.includes(courseId));
}

export function getCourseArtifacts(data: AppData, courseId: string) {
  return data.trainingArtifacts.filter((artifact) => artifact.relatedCourseIds.includes(courseId));
}

export function getCourseScenarios(data: AppData, courseId: string) {
  return data.scenarioDefinitions.filter((scenario) => scenario.relatedCourseIds.includes(courseId));
}

export function getCourseFeedback(data: AppData, courseId: string) {
  return data.contentFeedbackItems.filter((item) => item.courseId === courseId || item.targetId === courseId);
}

export function getCourseStandardMappings(data: AppData, courseId: string) {
  return data.courseStandardMappings.filter((mapping) => mapping.courseId === courseId);
}

export function buildCourseAnalysisContext(data: AppData, courseId: string): CourseAnalysisContext | undefined {
  const course = getCourseById(data, courseId);
  if (!course) return undefined;
  return {
    course,
    version: getCourseCurrentVersion(data, courseId),
    modules: getCourseModules(data, courseId),
    lessons: getCourseLessons(data, courseId),
    blocks: getCourseBlocks(data, courseId),
    assessments: getCourseAssessments(data, courseId),
    assessmentQuestions: getCourseAssessmentQuestions(data, courseId),
    questions: getCourseQuestions(data, courseId),
    resources: getCourseResources(data, courseId),
    courseResources: data.courseResources.filter((resource) => resource.courseId === courseId),
    artifacts: getCourseArtifacts(data, courseId),
    scenarios: getCourseScenarios(data, courseId),
    feedback: getCourseFeedback(data, courseId),
    mappings: getCourseStandardMappings(data, courseId),
    profile: data.courseExperienceProfiles.find((profile) => profile.courseId === courseId)
  };
}
