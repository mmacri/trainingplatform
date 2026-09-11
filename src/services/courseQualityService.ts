import { buildCourseAnalysisContext, type CourseAnalysisContext } from "../domain/courseSelectors";
import { isInteractiveBlock, isVisualBlock } from "../domain/contentBlockTaxonomy";
import type { QualityDimension, QualityFinding, QualitySeverity, ReleaseState } from "../domain/quality";
import type { AppData } from "../data/schema";
import { calculateCourseReadiness } from "./appServices";
import { ContentHealthService } from "./contentHealthService";
import { CourseDepthAuditService } from "./courseDepthAuditService";
import { InstructionalQualityService } from "./instructionalQualityService";
import { LearningContentValidator } from "./learningContentValidator";

export type CourseQualityStatusKey =
  | "content"
  | "interactions"
  | "scenario"
  | "assessment"
  | "completion"
  | "reference"
  | "accessibility"
  | "responsive"
  | "automatedTest";

export interface CourseQualityResult {
  courseId: string;
  releaseState: ReleaseState;
  dimensions: {
    functional: QualityDimension;
    instructional: QualityDimension;
    depth: QualityDimension;
    governance: QualityDimension;
  };
  statuses: Record<CourseQualityStatusKey, ReleaseState>;
  findings: QualityFinding[];
}

export class CourseQualityService {
  static analyzeCourse(data: AppData, courseId: string): CourseQualityResult {
    const context = buildCourseAnalysisContext(data, courseId);
    if (!context) {
      const finding: QualityFinding = {
        id: `missing-course-${courseId}`,
        source: "VALIDATION",
        severity: "BLOCKING",
        category: "BROKEN_ID",
        message: `Course ${courseId} does not exist.`,
        targetType: "Course",
        targetId: courseId
      };
      return blockedResult(courseId, finding);
    }

    const validation = LearningContentValidator.validateCourse(data, courseId);
    const instructional = InstructionalQualityService.analyzeContext(data, context);
    const depth = CourseDepthAuditService.auditContext(data, context);
    const health = ContentHealthService.getCourseHealth(data, courseId);
    const readiness = calculateCourseReadiness(data, courseId);

    const validationFindings: QualityFinding[] = validation.map((item) => ({
      id: item.id,
      source: "VALIDATION",
      severity: validationSeverity(item.severity),
      category: item.category,
      message: item.message,
      targetType: item.targetId === courseId ? "Course" : undefined,
      targetId: item.targetId
    }));
    const instructionalFindings: QualityFinding[] = instructional.findings.map((item) => ({
      id: item.id,
      source: "INSTRUCTIONAL",
      severity: item.severity === "BLOCKING" ? "BLOCKING" : item.severity,
      category: item.category,
      message: item.message,
      targetType: item.targetType,
      targetId: item.targetId,
      recommendation: item.recommendation
    }));
    const depthFindings: QualityFinding[] = depth.findings.map((item) => ({
      id: item.id,
      source: "DEPTH",
      severity: item.severity === "BLOCKING" ? "BLOCKING" : item.severity,
      category: item.category,
      message: item.message,
      targetType: item.lessonId ? "Lesson" : "Course",
      targetId: item.lessonId ?? item.courseId,
      recommendation: item.recommendation
    }));
    const healthFindings: QualityFinding[] = health.signals.map((signal, index) => ({
      id: `${courseId}-health-${index + 1}`,
      source: "HEALTH",
      severity: health.state === "Blocking Issues" ? "BLOCKING" : "WARNING",
      category: "Health",
      message: signal,
      targetType: "Course",
      targetId: courseId
    }));
    const readinessFindings: QualityFinding[] = [
      ...readiness.blockingIssues.map((item, index) => ({
        id: `${courseId}-readiness-blocking-${index + 1}`,
        source: "VALIDATION" as const,
        severity: "BLOCKING" as const,
        category: item.category,
        message: item.message,
        targetType: "Course",
        targetId: courseId
      })),
      ...readiness.warnings.map((item, index) => ({
        id: `${courseId}-readiness-warning-${index + 1}`,
        source: "VALIDATION" as const,
        severity: "WARNING" as const,
        category: item.category,
        message: item.message,
        targetType: "Course",
        targetId: courseId
      }))
    ];

    const allFindings = [
      ...readinessFindings,
      ...validationFindings,
      ...instructionalFindings,
      ...depthFindings,
      ...healthFindings
    ];

    const statuses = buildStatusSummary(context, validationFindings, depth, health.state, readinessFindings);
    const dimensions = {
      functional: dimensionState(validationFindings),
      instructional: dimensionState(instructionalFindings),
      depth: dimensionState(depthFindings),
      governance: dimensionState(healthFindings)
    };
    const releaseState = Object.values(statuses).includes("BLOCKED") || dimensions.functional.state === "BLOCKED" || dimensions.governance.state === "BLOCKED"
      ? "BLOCKED"
      : Object.values(statuses).includes("REVIEW") || Object.values(dimensions).some((dimension) => dimension.state === "REVIEW")
        ? "REVIEW"
        : "READY";

    return {
      courseId,
      releaseState,
      dimensions,
      statuses,
      findings: allFindings
    };
  }

  static analyzeAll(data: AppData) {
    return data.courses.filter((course) => course.status !== "ARCHIVED" && course.showInCatalog).map((course) => this.analyzeCourse(data, course.id));
  }
}

function buildStatusSummary(
  context: CourseAnalysisContext,
  validationFindings: QualityFinding[],
  depth: ReturnType<typeof CourseDepthAuditService.auditContext>,
  healthState: string,
  readinessFindings: QualityFinding[]
): Record<CourseQualityStatusKey, ReleaseState> {
  const { course, blocks, scenarios, resources } = context;
  const hasInteraction = blocks.some((block) => isInteractiveBlock(block.type));
  const hasVisual = blocks.some((block) => isVisualBlock(block.type));
  const assessmentBlocked = validationFindings.some((finding) => finding.severity === "BLOCKING" && (finding.category === "ASSESSMENT" || finding.category === "DUPLICATE_QUESTION"));
  const assessmentReview = validationFindings.some((finding) => finding.category === "ASSESSMENT" || finding.category === "DUPLICATE_QUESTION");
  return {
    content: readinessFindings.some((finding) => finding.severity === "BLOCKING") || depth.dimensions.contentDepth === "NEEDS_ATTENTION" ? "REVIEW" : "READY",
    interactions: hasInteraction && depth.dimensions.activePractice === "STRONG" ? "READY" : "REVIEW",
    scenario: scenarios.length && depth.dimensions.scenarioQuality === "STRONG" ? "READY" : "REVIEW",
    assessment: assessmentBlocked ? "BLOCKED" : assessmentReview || depth.dimensions.assessmentQuality === "NEEDS_ATTENTION" ? "REVIEW" : "READY",
    completion: readinessFindings.some((finding) => finding.severity === "BLOCKING" && finding.category === "Completion") ? "BLOCKED" : "READY",
    reference: resources.length && depth.dimensions.referenceValue === "STRONG" ? "READY" : "REVIEW",
    accessibility: hasInteraction || hasVisual ? "REVIEW" : "READY",
    responsive: hasVisual ? "REVIEW" : "READY",
    automatedTest: course.id === "course-cip004-annual-refresher" || course.id === "course-cip007-system-security" ? "READY" : "REVIEW"
  };
}

function dimensionState(findings: QualityFinding[]): QualityDimension {
  const state: ReleaseState = findings.some((finding) => finding.severity === "BLOCKING")
    ? "BLOCKED"
    : findings.some((finding) => finding.severity === "WARNING")
      ? "REVIEW"
      : "READY";
  return { state, findings };
}

function validationSeverity(severity: "READY" | "REVIEW" | "BLOCKED"): QualitySeverity {
  if (severity === "BLOCKED") return "BLOCKING";
  if (severity === "REVIEW") return "WARNING";
  return "PASS";
}

function blockedResult(courseId: string, finding: QualityFinding): CourseQualityResult {
  const dimension = { state: "BLOCKED" as const, findings: [finding] };
  return {
    courseId,
    releaseState: "BLOCKED",
    dimensions: {
      functional: dimension,
      instructional: { state: "REVIEW", findings: [] },
      depth: { state: "REVIEW", findings: [] },
      governance: { state: "REVIEW", findings: [] }
    },
    statuses: {
      content: "BLOCKED",
      interactions: "BLOCKED",
      scenario: "BLOCKED",
      assessment: "BLOCKED",
      completion: "BLOCKED",
      reference: "BLOCKED",
      accessibility: "BLOCKED",
      responsive: "BLOCKED",
      automatedTest: "BLOCKED"
    },
    findings: [finding]
  };
}
