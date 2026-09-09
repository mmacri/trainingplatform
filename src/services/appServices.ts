import { addDays, addMonths, differenceInHours } from "date-fns";
import Fuse from "fuse.js";
import { exportBackup, getAllData, id, importBackup, initializeDatabase, now, putRecord, replaceAllData } from "../data/db";
import { createSeedData } from "../data/seed";
import type {
  AccessRequest,
  AppData,
  Assessment,
  AssessmentQuestion,
  Assignment,
  AssignmentAudience,
  AuditEvent,
  ContentBlock,
  Course,
  CourseAccessGrant,
  CourseStatus,
  CourseVersion,
  Enrollment,
  LearningCampaign,
  LearningObjective,
  Lesson,
  Module,
  Notification,
  Question,
  QuestionOption,
  QuestionType,
  Review,
  ReviewComment,
  Role,
  User
} from "../data/schema";

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

export interface Session {
  sessionId: string;
  userId: string;
  email?: string;
  organizationId: string;
  loginAt: string;
  lastActivityAt: string;
}

export interface LearningRecommendation {
  id: string;
  userId: string;
  recommendationType: "CONTINUE_COURSE" | "REVIEW_LESSON" | "PRACTICE_ACTIVITY" | "SCENARIO" | "START_COURSE" | "REFRESHER" | "LEARNING_PATH" | "FOLLOW_UP";
  targetId: string;
  reasonCode: "DUE_SOON" | "OVERDUE" | "LOW_TOPIC_SCORE" | "WEAK_SKILL" | "IN_PROGRESS" | "RELATED_SKILL" | "CERT_EXPIRING" | "REINFORCEMENT_DUE" | "MANAGER_ASSIGNED" | "LEARNING_PATH_NEXT" | "SELF_SELECTED";
  reason: string;
  priority: number;
  createdAt: string;
  required?: boolean;
  href: string;
  title: string;
}

export interface SkillMastery {
  skillId: string;
  title: string;
  category: string;
  state: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG";
  evidenceCount: number;
  recommendedActivityId?: string;
}

const sessionKey = "gridguard.session";
const sessionStoreKey = "gridguard.sessions";

export function getRoles(data: AppData, userId: string): Role[] {
  return data.userRoles.filter((role) => role.userId === userId).map((role) => role.role);
}

export function hasRole(data: AppData, userId: string, role: Role) {
  return getRoles(data, userId).includes(role);
}

export function hasAnyRole(data: AppData, userId: string, roles: Role[]) {
  const userRoles = getRoles(data, userId);
  return roles.some((role) => userRoles.includes(role));
}

export function canManageUsers(data: AppData, userId: string) {
  return hasAnyRole(data, userId, ["PLATFORM_ADMIN", "LEARNING_ADMIN"]);
}

export function canCreateCourses(data: AppData, userId: string) {
  return hasAnyRole(data, userId, ["MANAGER", "AUTHOR", "COURSE_OWNER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]);
}

export function canManageCourses(data: AppData, userId: string) {
  return canCreateCourses(data, userId) || data.courseOwners.some((owner) => owner.userId === userId) || data.courseContributors.some((contributor) => contributor.userId === userId);
}

export function canViewCompliance(data: AppData, userId: string) {
  return hasAnyRole(data, userId, ["COMPLIANCE_MANAGER", "PLATFORM_ADMIN"]);
}

export function canViewEvidence(data: AppData, userId: string) {
  return hasAnyRole(data, userId, ["COMPLIANCE_MANAGER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]);
}

export function canPublishCourse(data: AppData, userId: string, courseId: string) {
  return hasAnyRole(data, userId, ["PLATFORM_ADMIN", "LEARNING_ADMIN"]) || data.courseOwners.some((owner) => owner.courseId === courseId && owner.userId === userId);
}

export function canEditCourse(data: AppData, userId: string, courseId: string) {
  return (
    canPublishCourse(data, userId, courseId) ||
    hasAnyRole(data, userId, ["PLATFORM_ADMIN", "LEARNING_ADMIN"]) ||
    data.courseContributors.some((contributor) => contributor.courseId === courseId && contributor.userId === userId)
  );
}

export function canReviewCourse(data: AppData, userId: string, courseId: string) {
  const versionIds = data.courseVersions.filter((version) => version.courseId === courseId).map((version) => version.id);
  const reviewIds = data.reviews.filter((review) => versionIds.includes(review.courseVersionId)).map((review) => review.id);
  return hasAnyRole(data, userId, ["REVIEWER", "COMPLIANCE_MANAGER", "PLATFORM_ADMIN"]) || data.reviewAssignments.some((assignment) => reviewIds.includes(assignment.reviewId) && assignment.userId === userId);
}

export function canViewTeam(data: AppData, userId: string, teamId: string) {
  return canManageUsers(data, userId) || data.teams.some((team) => team.id === teamId && team.managerId === userId);
}

export function canAccessCourse(data: AppData, userId: string, courseId: string, reasonOnly = false): { allowed: boolean; reason: string; discoverable: boolean } {
  const course = data.courses.find((item) => item.id === courseId);
  const user = data.users.find((item) => item.id === userId);
  if (!course || !user || user.status !== "ACTIVE") return { allowed: false, reason: "Course or user unavailable", discoverable: false };
  if (hasRole(data, userId, "PLATFORM_ADMIN")) return { allowed: true, reason: "Platform Administrator", discoverable: true };
  if (data.courseOwners.some((owner) => owner.courseId === courseId && owner.userId === userId)) return { allowed: true, reason: "Course Owner", discoverable: true };
  if (data.courseContributors.some((contributor) => contributor.courseId === courseId && contributor.userId === userId)) return { allowed: true, reason: "Course Contributor", discoverable: true };
  if (course.status !== "PUBLISHED" && !reasonOnly) return { allowed: false, reason: "Course is not published", discoverable: false };

  const grants = data.courseAccessGrants.filter((grant) => grant.courseId === courseId);
  const teamIds = data.teamMembers.filter((member) => member.userId === userId).map((member) => member.teamId);
  const groupIds = data.groupMembers.filter((member) => member.userId === userId).map((member) => member.groupId);
  const roles = getRoles(data, userId);
  const match = grants.find(
    (grant) =>
      (grant.grantType === "USER" && grant.grantId === userId) ||
      (grant.grantType === "TEAM" && teamIds.includes(grant.grantId)) ||
      (grant.grantType === "GROUP" && groupIds.includes(grant.grantId)) ||
      (grant.grantType === "ROLE" && roles.includes(grant.grantId as Role))
  );
  if (match) return { allowed: true, reason: grantReason(data, match), discoverable: true };

  const assignmentIds = data.assignmentAudiences
    .filter(
      (audience) =>
        (audience.audienceType === "USER" && audience.audienceId === userId) ||
        (audience.audienceType === "TEAM" && teamIds.includes(audience.audienceId)) ||
        (audience.audienceType === "GROUP" && groupIds.includes(audience.audienceId)) ||
        (audience.audienceType === "ROLE" && roles.includes(audience.audienceId as Role))
    )
    .map((audience) => audience.assignmentId);
  if (data.assignments.some((assignment) => assignmentIds.includes(assignment.id) && assignment.targetType === "COURSE" && assignment.targetId === courseId)) {
    return { allowed: true, reason: "Training assignment", discoverable: true };
  }
  if (course.accessMode === "OPEN") return { allowed: true, reason: "Open to Organization", discoverable: course.showInCatalog };
  if (course.accessMode === "PRIVATE") return { allowed: false, reason: "Private course", discoverable: false };
  return { allowed: false, reason: "No access grant", discoverable: course.showInCatalog && course.allowAccessRequests };
}

function grantReason(data: AppData, grant: CourseAccessGrant) {
  if (grant.grantType === "TEAM") return data.teams.find((team) => team.id === grant.grantId)?.name ?? "Team grant";
  if (grant.grantType === "GROUP") return data.groups.find((group) => group.id === grant.grantId)?.name ?? "Group grant";
  if (grant.grantType === "ROLE") return `${grant.grantId.replaceAll("_", " ")} role`;
  return "Direct user grant";
}

function audit(data: AppData, actorId: string | undefined, action: string, objectType: string, objectId: string, summary: string) {
  data.auditEvents.push({
    id: id("audit"),
    organizationId: data.organizations[0].id,
    actorId,
    action,
    objectType,
    objectId,
    summary,
    createdAt: now(),
    updatedAt: now()
  } satisfies AuditEvent);
  data.activityTimeline.push({
    id: id("timeline"),
    objectType,
    objectId,
    actorId,
    action,
    summary,
    createdAt: now(),
    updatedAt: now()
  });
}

function notify(data: AppData, userId: string, type: string, title: string, body: string, href: string) {
  data.notifications.push({ id: id("note"), userId, type, title, body, href, createdAt: now(), updatedAt: now() } satisfies Notification);
}

export type ReadinessSeverity = "BLOCKING" | "WARNING" | "READY";

export interface CourseReadinessCheck {
  category: "Basics" | "Learning Objectives" | "Curriculum" | "Lesson Content" | "Assessment" | "Compliance Mapping" | "Audience" | "Completion" | "Review Approval";
  label: string;
  severity: ReadinessSeverity;
  message: string;
  href: string;
}

export interface CourseReadiness {
  percentage: number;
  checks: CourseReadinessCheck[];
  blockingIssues: CourseReadinessCheck[];
  warnings: CourseReadinessCheck[];
  completedChecks: CourseReadinessCheck[];
}

export function calculateCourseReadiness(data: AppData, courseId: string): CourseReadiness {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) {
    return { percentage: 0, checks: [], blockingIssues: [], warnings: [], completedChecks: [] };
  }
  const versionId = course.draftVersionId ?? course.currentVersionId;
  const modules = data.modules.filter((module) => module.courseVersionId === versionId);
  const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === versionId);
  const blocks = data.contentBlocks.filter((block) => lessons.some((lesson) => lesson.id === block.lessonId));
  const objectives = data.learningObjectives.filter((objective) => objective.courseVersionId === versionId);
  const assessment = data.assessments.find((item) => item.courseVersionId === versionId);
  const assessmentQuestionCount = assessment ? data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id).length : 0;
  const mappings = data.courseStandardMappings.filter((mapping) => mapping.courseId === courseId);
  const grants = data.courseAccessGrants.filter((grant) => grant.courseId === courseId);
  const latestReview = latestCourseReview(data, courseId);
  const openBlockingComments = latestReview
    ? data.reviewComments.filter((comment) => comment.reviewId === latestReview.id && comment.status === "OPEN" && (comment.blocking || comment.severity === "BLOCKING"))
    : [];
  const requiredAssessment = course.requireFinalAssessment ?? course.finalAssessmentEnabled ?? true;
  const checks: CourseReadinessCheck[] = [
    readyCheck("Basics", "Course details", Boolean(course.title.trim() && course.shortDescription.trim() && course.estimatedMinutes > 0), "Title, description, and duration are required.", "overview"),
    readyCheck("Learning Objectives", "Learning objectives", objectives.length > 0, "Add at least one learning objective.", "compliance"),
    readyCheck("Curriculum", "Modules and lessons", modules.length > 0 && lessons.length > 0, "Add at least one module and one lesson.", "curriculum"),
    readyCheck("Lesson Content", "Lesson content", lessons.length > 0 && lessons.every((lesson) => blocks.some((block) => block.lessonId === lesson.id)), "Every lesson should contain content.", "curriculum"),
    requiredAssessment
      ? readyCheck("Assessment", "Final assessment", Boolean(assessment && assessment.passingScore > 0 && assessmentQuestionCount >= 3), "A final assessment needs at least 3 questions and a passing score.", "assessment")
      : warningCheck("Assessment", "Final assessment", "Assessment is disabled for this course.", "assessment"),
    readyCheck("Compliance Mapping", "Mapped standards", mappings.length > 0, "Map the course to at least one NERC CIP standard.", "compliance"),
    readyCheck("Audience", "Audience and access", course.accessMode === "OPEN" || grants.length > 0 || course.showInCatalog, "Configure catalog visibility or add an access audience.", "audience"),
    readyCheck("Completion", "Completion rules", Boolean(course.requireAllLessons ?? true) || Boolean(course.requireFinalAssessment), "Define at least one completion requirement.", "completion"),
    latestReview?.status === "APPROVED" || course.status === "APPROVED" || course.status === "PUBLISHED"
      ? readyCheck("Review Approval", "Review approval", true, "Course review is approved.", "review")
      : warningCheck("Review Approval", "Review approval", "Approval is required before publishing.", "review")
  ];
  if (openBlockingComments.length) {
    checks.push({
      category: "Review Approval",
      label: "Blocking review comments",
      severity: "BLOCKING",
      message: `${openBlockingComments.length} blocking review comment${openBlockingComments.length === 1 ? "" : "s"} must be resolved.`,
      href: `/build/courses/${courseId}?tab=review`
    });
  }
  const completedChecks = checks.filter((check) => check.severity === "READY");
  const blockingIssues = checks.filter((check) => check.severity === "BLOCKING");
  const warnings = checks.filter((check) => check.severity === "WARNING");
  return {
    percentage: Math.round((completedChecks.length / checks.length) * 100),
    checks,
    blockingIssues,
    warnings,
    completedChecks
  };
}

function readyCheck(category: CourseReadinessCheck["category"], label: string, isReady: boolean, message: string, tab: string): CourseReadinessCheck {
  return {
    category,
    label,
    severity: isReady ? "READY" : "BLOCKING",
    message: isReady ? "Ready" : message,
    href: `?tab=${tab}`
  };
}

function warningCheck(category: CourseReadinessCheck["category"], label: string, message: string, tab: string): CourseReadinessCheck {
  return { category, label, severity: "WARNING", message, href: `?tab=${tab}` };
}

function latestCourseReview(data: AppData, courseId: string) {
  const versionIds = data.courseVersions.filter((version) => version.courseId === courseId).map((version) => version.id);
  return data.reviews
    .filter((review) => versionIds.includes(review.courseVersionId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

export class LearningRecommendationService {
  static getRecommendations(data: AppData, userId: string): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];
    const dismissed = new Set(
      data.learningPreferences
        .filter((item) => item.userId === userId && item.key === "dismissedRecommendation")
        .map((item) => String(item.value))
    );
    const datedAssignments = data.enrollments
      .filter((enrollment) => enrollment.userId === userId)
      .map((enrollment) => ({
        enrollment,
        course: data.courses.find((course) => course.id === enrollment.courseId),
        assignment: data.assignments.find((assignment) => assignment.id === enrollment.assignmentId)
      }))
      .filter((item) => item.course);

    datedAssignments.forEach(({ enrollment, course, assignment }) => {
      if (!course) return;
      const state = getCourseCompletionState(data, userId, course.id);
      const dueAt = assignment?.dueAt ? new Date(assignment.dueAt).getTime() : undefined;
      const daysDue = dueAt ? Math.ceil((dueAt - Date.now()) / 86400000) : undefined;
      const overdue = dueAt ? dueAt < Date.now() && enrollment.status !== "COMPLETED" : false;
      if (overdue) {
        recommendations.push(rec(userId, "START_COURSE", course.id, "OVERDUE", `Overdue required training`, 1000, state.resumeDestination, course.title, true));
      } else if (daysDue !== undefined && daysDue <= 14 && enrollment.status !== "COMPLETED") {
        recommendations.push(rec(userId, "START_COURSE", course.id, "DUE_SOON", `Due in ${Math.max(daysDue, 0)} days`, 900, state.resumeDestination, course.title, true));
      } else if (state.percent > 0 && state.percent < 100) {
        recommendations.push(rec(userId, "CONTINUE_COURSE", course.id, "IN_PROGRESS", "Continue where you left off", 800, state.resumeDestination, course.title, true));
      }
    });

    const failed = data.assessmentAttempts.filter((attempt) => attempt.userId === userId && !attempt.passed).at(-1);
    if (failed?.missedTopics?.length) {
      const skill = findSkillForTopic(data, failed.missedTopics[0]);
      const activity = skill ? data.practiceActivities.find((item) => item.status === "PUBLISHED" && item.skillIds.includes(skill.id)) : data.practiceActivities.find((item) => item.status === "PUBLISHED");
      if (activity) recommendations.push(rec(userId, "PRACTICE_ACTIVITY", activity.id, "LOW_TOPIC_SCORE", `Recommended after your recent assessment`, 760, `/practice/${activity.id}`, activity.title));
    }

    data.reinforcementSchedules
      .filter((schedule) => schedule.userId === userId)
      .flatMap((schedule) => schedule.events)
      .filter((event) => event.state === "AVAILABLE" && !dismissed.has(event.id))
      .forEach((event) => {
        const activity = data.practiceActivities.find((item) => item.id === event.activityId);
        const scenario = data.scenarioDefinitions.find((item) => item.id === event.activityId);
        recommendations.push(rec(userId, activity ? "REFRESHER" : "SCENARIO", event.activityId, "REINFORCEMENT_DUE", "Quick reinforcement from completed training", 650, activity ? `/practice/${activity.id}` : `/scenarios/${scenario?.id}`, activity?.title ?? scenario?.title ?? "Reinforcement"));
      });

    SkillMasteryService.getSkillMastery(data, userId)
      .filter((skill) => skill.state !== "STRONG" && skill.recommendedActivityId && !dismissed.has(`skill-${skill.skillId}`))
      .forEach((skill) => {
        const activity = data.practiceActivities.find((item) => item.id === skill.recommendedActivityId);
        if (activity) recommendations.push(rec(userId, "PRACTICE_ACTIVITY", activity.id, "WEAK_SKILL", `Strengthen ${skill.title}`, 500, `/practice/${activity.id}`, activity.title));
      });

    if (!recommendations.length) {
      const activity = data.practiceActivities.find((item) => item.status === "PUBLISHED");
      if (activity) recommendations.push(rec(userId, "PRACTICE_ACTIVITY", activity.id, "SELF_SELECTED", "You are caught up. Keep skills fresh with a short challenge.", 100, `/practice/${activity.id}`, activity.title));
    }

    const seen = new Set<string>();
    return recommendations
      .filter((item) => {
        const key = `${item.recommendationType}-${item.targetId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return item.required || !dismissed.has(item.id);
      })
      .sort((left, right) => right.priority - left.priority);
  }
}

function rec(userId: string, recommendationType: LearningRecommendation["recommendationType"], targetId: string, reasonCode: LearningRecommendation["reasonCode"], reason: string, priority: number, href: string, title: string, required = false): LearningRecommendation {
  return { id: `recommendation-${userId}-${recommendationType}-${targetId}`, userId, recommendationType, targetId, reasonCode, reason, priority, createdAt: now(), href, title, required };
}

function findSkillForTopic(data: AppData, topic: string) {
  const normalized = topic.toLowerCase();
  return data.skills.find((skill) => normalized.includes(skill.name.toLowerCase().split(" ")[0]) || skill.name.toLowerCase().includes(normalized));
}

export class SkillMasteryService {
  static getSkillMastery(data: AppData, userId: string): SkillMastery[] {
    return data.skills.map((skill) => {
      const evidence = data.skillEvidence.filter((item) => item.userId === userId && item.skillId === skill.id);
      const weighted = evidence.reduce((sum, item) => sum + scoreForResult(item.result) * item.weight, 0);
      const weight = evidence.reduce((sum, item) => sum + item.weight, 0);
      const average = weight ? weighted / weight : 0;
      const state: SkillMastery["state"] = average >= 80 ? "STRONG" : average >= 60 ? "DEVELOPING" : "NEEDS_REVIEW";
      const activity = data.practiceActivities.find((item) => item.status === "PUBLISHED" && item.skillIds.includes(skill.id));
      return { skillId: skill.id, title: skill.name, category: skill.category ?? "Skills", state, evidenceCount: evidence.length, recommendedActivityId: activity?.id };
    });
  }
}

function scoreForResult(result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG") {
  if (result === "STRONG") return 100;
  if (result === "DEVELOPING") return 70;
  return 40;
}

export function getCoachingOpportunities(data: AppData, managerId: string) {
  const teamIds = data.teams.filter((team) => canViewTeam(data, managerId, team.id)).map((team) => team.id);
  const memberIds = data.teamMembers.filter((member) => teamIds.includes(member.teamId)).map((member) => member.userId);
  return memberIds.flatMap((userId) =>
    SkillMasteryService.getSkillMastery(data, userId)
      .filter((skill) => skill.state !== "STRONG")
      .slice(0, 2)
      .map((skill) => ({
        userId,
        skillId: skill.skillId,
        reason: skill.state === "NEEDS_REVIEW" ? "REPEATED_LOW_SCORE" : "SCENARIO_PATTERN",
        recommendedAction: "ASSIGN_PRACTICE" as const,
        priority: skill.state === "NEEDS_REVIEW" ? "HIGH" as const : "MEDIUM" as const,
        activityId: skill.recommendedActivityId
      }))
  );
}

export class AuthService {
  static async boot() {
    await initializeDatabase();
    const data = await getAllData();
    const catalogVersion = Number(data.applicationSettings.find((setting) => setting.key === "catalogContentVersion")?.value ?? 0);
    const session = this.getSession();
    if (catalogVersion >= 4) {
      this.remapSessionIfNeeded(data, session);
      return data;
    }

    const activeEmail = session?.email ?? (session ? data.users.find((user) => user.id === session.userId)?.email : undefined);
    const fresh = createSeedData();
    await replaceAllData(fresh);

    if (session && activeEmail) {
      const remappedUser = fresh.users.find((user) => user.email === activeEmail);
      if (remappedUser) {
        this.saveSession({ ...session, userId: remappedUser.id, email: remappedUser.email, organizationId: remappedUser.organizationId, lastActivityAt: now() });
      }
    }

    return fresh;
  }

  private static remapSessionIfNeeded(data: AppData, session: Session | undefined) {
    if (!session || data.users.some((user) => user.id === session.userId)) return;
    if (!session.email) return;
    const remappedUser = data.users.find((user) => user.email === session.email);
    if (!remappedUser) return;
    this.saveSession({ ...session, userId: remappedUser.id, organizationId: remappedUser.organizationId, lastActivityAt: now() });
  }

  private static saveSession(session: Session) {
    const sessions = JSON.parse(localStorage.getItem(sessionStoreKey) ?? "{}") as Record<string, Session>;
    sessions[session.sessionId] = session;
    localStorage.setItem(sessionStoreKey, JSON.stringify(sessions));
  }

  static getSession(): Session | undefined {
    const sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) return undefined;
    const sessions = JSON.parse(localStorage.getItem(sessionStoreKey) ?? "{}") as Record<string, Session>;
    return sessions[sessionId];
  }

  static async login(email: string, passwordValue: string) {
    const data = await getAllData();
    const user = data.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === passwordValue && item.status === "ACTIVE");
    if (!user) throw new Error("Email or password is incorrect.");
    const session: Session = { sessionId: id("session"), userId: user.id, email: user.email, organizationId: user.organizationId, loginAt: now(), lastActivityAt: now() };
    const sessions = JSON.parse(localStorage.getItem(sessionStoreKey) ?? "{}") as Record<string, Session>;
    sessions[session.sessionId] = session;
    localStorage.setItem(sessionStoreKey, JSON.stringify(sessions));
    localStorage.setItem(sessionKey, session.sessionId);
    audit(data, user.id, "LOGIN", "User", user.id, `${user.name} signed in.`);
    await replaceAllData(data);
    return { data, session };
  }

  static async switchUser(userId: string) {
    const data = await getAllData();
    const user = data.users.find((item) => item.id === userId);
    if (!user) throw new Error("User not found.");
    const session: Session = { sessionId: id("session"), userId: user.id, email: user.email, organizationId: user.organizationId, loginAt: now(), lastActivityAt: now() };
    const sessions = JSON.parse(localStorage.getItem(sessionStoreKey) ?? "{}") as Record<string, Session>;
    sessions[session.sessionId] = session;
    localStorage.setItem(sessionStoreKey, JSON.stringify(sessions));
    localStorage.setItem(sessionKey, session.sessionId);
    audit(data, user.id, "LOGIN", "User", user.id, `Switched demo perspective to ${user.name}.`);
    await replaceAllData(data);
    return { data, session };
  }

  static logout(data?: AppData, userId?: string) {
    const sessionId = localStorage.getItem(sessionKey);
    if (sessionId) {
      const sessions = JSON.parse(localStorage.getItem(sessionStoreKey) ?? "{}") as Record<string, Session>;
      delete sessions[sessionId];
      localStorage.setItem(sessionStoreKey, JSON.stringify(sessions));
    }
    localStorage.removeItem(sessionKey);
    if (data && userId) {
      audit(data, userId, "LOGOUT", "User", userId, "User signed out.");
      void replaceAllData(data);
    }
  }

  static isExpired(data: AppData, session: Session) {
    const timeout = Number(data.applicationSettings.find((setting) => setting.key === "sessionTimeoutHours")?.value ?? 8);
    return differenceInHours(new Date(), new Date(session.lastActivityAt)) >= timeout;
  }
}

export class WorkflowService {
  constructor(private data: AppData, private actorId: string) {}

  snapshot() {
    return this.data;
  }

  async persist() {
    await replaceAllData(this.data);
  }

  async createUser(input: { firstName: string; lastName: string; email: string; jobTitle: string; teamId?: string; roles: Role[]; groupIds: string[] }) {
    const user: User = { id: id("user"), organizationId: this.data.organizations[0].id, password: "GridGuard-Local-2026!", name: `${input.firstName} ${input.lastName}`, status: "ACTIVE", createdAt: now(), updatedAt: now(), ...input };
    this.data.users.push(user);
    for (const role of input.roles) this.data.userRoles.push({ id: id("role"), userId: user.id, role, createdAt: now(), updatedAt: now() });
    if (input.teamId) this.data.teamMembers.push({ id: id("tm"), teamId: input.teamId, userId: user.id, createdAt: now(), updatedAt: now() });
    for (const groupId of input.groupIds) this.data.groupMembers.push({ id: id("gm"), groupId, userId: user.id, createdAt: now(), updatedAt: now() });
    audit(this.data, this.actorId, "USER_CREATED", "User", user.id, `Created user ${user.name}.`);
    await this.persist();
    return user;
  }

  async createCourse(input: { title: string; description: string; standardId?: string; modules: Array<{ title: string; lessons: string[] }>; accessMode: Course["accessMode"]; grantGroupIds?: string[]; certificateEnabled?: boolean }) {
    const course: Course = {
      id: id("course"),
      organizationId: this.data.organizations[0].id,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title: input.title,
      shortDescription: input.description,
      category: "NERC CIP",
      difficulty: "Foundational",
      estimatedMinutes: 45,
      status: "DRAFT",
      accessMode: input.accessMode,
      allowSelfEnrollment: input.accessMode === "OPEN",
      showInCatalog: input.accessMode !== "PRIVATE",
      allowAccessRequests: input.accessMode === "RESTRICTED",
      requireManagerApproval: false,
      certificateEnabled: Boolean(input.certificateEnabled),
      ownerId: this.actorId,
      icon: "BookOpenCheck",
      accent: "#0e7490",
      createdAt: now(),
      updatedAt: now()
    };
    const version: CourseVersion = { id: id("version"), courseId: course.id, version: "1.0", status: "DRAFT", summary: input.description, goal: "Build repeatable compliance readiness.", immutable: false, completionRules: ["LESSONS", "ASSESSMENT"], createdAt: now(), updatedAt: now() };
    course.currentVersionId = version.id;
    course.draftVersionId = version.id;
    this.data.courses.push(course);
    this.data.courseVersions.push(version);
    this.data.courseOwners.push({ id: id("owner"), courseId: course.id, userId: this.actorId, createdAt: now(), updatedAt: now() });
    this.data.courseAccessPolicies.push({ id: id("policy"), courseId: course.id, mode: course.accessMode, createdAt: now(), updatedAt: now() });
    for (const groupId of input.grantGroupIds ?? []) this.data.courseAccessGrants.push({ id: id("grant"), courseId: course.id, grantType: "GROUP", grantId: groupId, createdAt: now(), updatedAt: now() });
    input.modules.forEach((moduleInput, moduleIndex) => this.addModuleInternal(version.id, moduleInput.title, moduleInput.lessons, moduleIndex + 1));
    if (input.standardId) {
      const standardVersion = this.data.standardVersions.find((item) => item.standardId === input.standardId);
      if (standardVersion) this.data.courseStandardMappings.push({ id: id("mapping"), courseId: course.id, standardVersionId: standardVersion.id, evidenceExpectation: "Completion, assessment, and training evidence.", createdAt: now(), updatedAt: now() });
    }
    this.addAssessmentInternal(version.id, `${input.title} Final Assessment`, 80);
    audit(this.data, this.actorId, "COURSE_CREATED", "Course", course.id, `Created course ${course.title}.`);
    await this.persist();
    return course;
  }

  private addModuleInternal(courseVersionId: string, title: string, lessons: string[], position: number) {
    const moduleRecord: Module = { id: id("module"), courseVersionId, title, position, createdAt: now(), updatedAt: now() };
    this.data.modules.push(moduleRecord);
    for (const [index, titleValue] of lessons.entries()) this.addLessonInternal(courseVersionId, moduleRecord.id, titleValue, index + 1);
  }

  private addLessonInternal(courseVersionId: string, moduleId: string, title: string, position: number) {
    const lesson: Lesson = { id: id("lesson"), moduleId, courseVersionId, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), position, required: true, estimatedMinutes: 8, createdAt: now(), updatedAt: now() };
    this.data.lessons.push(lesson);
    ["Why This Matters", "Learning Objectives", "Compliance Note", "Key Takeaway"].forEach((blockTitle, index) =>
      this.data.contentBlocks.push({ id: id("block"), lessonId: lesson.id, type: blockTitle.toLowerCase().replaceAll(" ", "_"), title: blockTitle, body: `${blockTitle} for ${title}.`, position: index + 1, createdAt: now(), updatedAt: now() } satisfies ContentBlock)
    );
  }

  private addAssessmentInternal(courseVersionId: string, title: string, passingScore: number) {
    const assessment = { id: id("assess"), courseVersionId, title, instructions: "Pass with 80% or higher.", passingScore, maxAttempts: 3, required: true, createdAt: now(), updatedAt: now() };
    this.data.assessments.push(assessment);
    const questions: Array<[Question["type"], string, string[]]> = [
      ["MULTIPLE_CHOICE", "What makes evidence audit ready?", ["Traceable record", "Verbal confirmation", "Unversioned notes"]],
      ["TRUE_FALSE", "Evidence should include course version.", ["True", "False"]],
      ["SHORT_ANSWER", "Name one sign of a training evidence gap.", ["Missing date"]]
    ];
    questions.forEach(([type, prompt, options], position) => {
      const question = { id: id("question"), type, prompt, explanation: "Audit-ready evidence is complete, traceable, and repeatable.", difficulty: "Foundational", tags: ["Evidence"], createdAt: now(), updatedAt: now() };
      this.data.questions.push(question);
      options.forEach((text, index) => this.data.questionOptions.push({ id: id("option"), questionId: question.id, text, isCorrect: index === 0, position: index + 1, createdAt: now(), updatedAt: now() } satisfies QuestionOption));
      this.data.assessmentQuestions.push({ id: id("aq"), assessmentId: assessment.id, questionId: question.id, points: 1, position: position + 1, createdAt: now(), updatedAt: now() });
    });
  }

  async createCourseDraft(input: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    estimatedMinutes: number;
    icon: string;
    accent: string;
    coverVisual?: string;
    accessMode: Course["accessMode"];
    showInCatalog: boolean;
    allowSelfEnrollment: boolean;
    allowAccessRequests: boolean;
    requireManagerApproval: boolean;
    standardVersionIds: string[];
    mappings?: Array<{ standardVersionId: string; requirementText?: string; trainingRelevance?: string; evidenceExpectation: string; internalNotes?: string }>;
    objectives: string[];
    skillIds: string[];
    completionEvidence: string[];
    modules: Array<{ title: string; lessons: string[] }>;
    audienceGrants: Array<{ grantType: CourseAccessGrant["grantType"]; grantId: string }>;
    completion: {
      requireAllLessons: boolean;
      requireFinalAssessment: boolean;
      requireScenarios: boolean;
      requireAcknowledgement: boolean;
      requireManagerValidation: boolean;
      finalAssessmentEnabled: boolean;
      passingScore: number;
      attemptsAllowed: number;
      failedAttemptBehavior: Course["failedAttemptBehavior"];
      randomizeQuestions: boolean;
      randomizeAnswers: boolean;
      showAnswersAfterAttempt: boolean;
      certificateEnabled: boolean;
      certificateName: string;
      certificateExpirationMonths?: number;
      completionDeadlineDays?: number;
    };
  }) {
    const course: Course = {
      id: id("course"),
      organizationId: this.data.organizations[0].id,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title: input.title,
      shortDescription: input.description,
      category: input.category,
      difficulty: input.difficulty,
      estimatedMinutes: input.estimatedMinutes,
      status: "DRAFT",
      accessMode: input.accessMode,
      allowSelfEnrollment: input.allowSelfEnrollment,
      showInCatalog: input.showInCatalog,
      allowAccessRequests: input.allowAccessRequests,
      requireManagerApproval: input.requireManagerApproval,
      certificateEnabled: input.completion.certificateEnabled,
      ownerId: this.actorId,
      icon: input.icon,
      accent: input.accent,
      coverVisual: input.coverVisual,
      completionEvidence: input.completionEvidence,
      completionDeadlineDays: input.completion.completionDeadlineDays,
      requireAllLessons: input.completion.requireAllLessons,
      requireFinalAssessment: input.completion.requireFinalAssessment,
      requireScenarios: input.completion.requireScenarios,
      requireAcknowledgement: input.completion.requireAcknowledgement,
      requireManagerValidation: input.completion.requireManagerValidation,
      finalAssessmentEnabled: input.completion.finalAssessmentEnabled,
      attemptsAllowed: input.completion.attemptsAllowed,
      failedAttemptBehavior: input.completion.failedAttemptBehavior,
      randomizeQuestions: input.completion.randomizeQuestions,
      randomizeAnswers: input.completion.randomizeAnswers,
      showAnswersAfterAttempt: input.completion.showAnswersAfterAttempt,
      certificateName: input.completion.certificateName,
      certificateExpirationMonths: input.completion.certificateExpirationMonths,
      createdAt: now(),
      updatedAt: now()
    };
    const version: CourseVersion = {
      id: id("version"),
      courseId: course.id,
      version: "1.0",
      status: "DRAFT",
      summary: input.description,
      goal: input.objectives[0] ?? "Build repeatable compliance readiness.",
      immutable: false,
      completionRules: [
        input.completion.requireAllLessons ? "LESSONS" : "",
        input.completion.requireFinalAssessment ? "ASSESSMENT" : "",
        input.completion.requireAcknowledgement ? "ACKNOWLEDGEMENT" : "",
        input.completion.requireManagerValidation ? "MANAGER_VALIDATION" : ""
      ].filter(Boolean),
      createdAt: now(),
      updatedAt: now()
    };
    course.currentVersionId = version.id;
    course.draftVersionId = version.id;
    this.data.courses.push(course);
    this.data.courseVersions.push(version);
    this.data.courseOwners.push({ id: id("owner"), courseId: course.id, userId: this.actorId, createdAt: now(), updatedAt: now() });
    this.data.courseAccessPolicies.push({ id: id("policy"), courseId: course.id, mode: course.accessMode, createdAt: now(), updatedAt: now() });
    input.audienceGrants.forEach((grant) => this.data.courseAccessGrants.push({ id: id("grant"), courseId: course.id, ...grant, createdAt: now(), updatedAt: now() }));
    input.modules.forEach((moduleInput, index) => this.addModuleInternal(version.id, moduleInput.title, moduleInput.lessons, index + 1));
    input.objectives.forEach((text, index) => this.data.learningObjectives.push({ id: id("obj"), courseVersionId: version.id, text, position: index + 1, createdAt: now(), updatedAt: now() }));
    const mappings = input.mappings?.length
      ? input.mappings
      : input.standardVersionIds.map((standardVersionId) => ({ standardVersionId, evidenceExpectation: input.completionEvidence.join(", ") || "Course completion evidence." }));
    mappings.forEach((mapping) => this.data.courseStandardMappings.push({ id: id("mapping"), courseId: course.id, createdAt: now(), updatedAt: now(), ...mapping }));
    input.skillIds.forEach((skillId) => this.data.courseSkills.push({ id: id("courseskill"), courseId: course.id, skillId, level: input.difficulty, createdAt: now(), updatedAt: now() }));
    if (input.completion.finalAssessmentEnabled) this.addAssessmentInternal(version.id, `${input.title} Final Assessment`, input.completion.passingScore);
    audit(this.data, this.actorId, "COURSE_CREATED", "Course", course.id, `Created course ${course.title}.`);
    await this.persist();
    return course;
  }

  async updateCourse(courseId: string, patch: Partial<Course>) {
    const course = this.requireCourse(courseId);
    Object.assign(course, patch, { updatedAt: now() });
    const policy = this.data.courseAccessPolicies.find((item) => item.courseId === courseId);
    if (policy) {
      policy.mode = course.accessMode;
      policy.updatedAt = now();
    }
    audit(this.data, this.actorId, "COURSE_EDITED", "Course", courseId, `Updated ${course.title}.`);
    await this.persist();
    return course;
  }

  async duplicateCourse(courseId: string, name?: string, includeAudience = false) {
    const source = this.requireCourse(courseId);
    const sourceVersion = this.requireCurrentVersion(source);
    const copy: Course = {
      ...source,
      id: id("course"),
      slug: `${source.slug}-copy-${Date.now()}`,
      title: name || `Copy of ${source.title}`,
      status: "DRAFT",
      currentVersionId: undefined,
      draftVersionId: undefined,
      ownerId: this.actorId,
      publishedById: undefined,
      scheduledPublishAt: undefined,
      archivedAt: undefined,
      archiveReason: undefined,
      createdAt: now(),
      updatedAt: now()
    };
    const version: CourseVersion = { ...sourceVersion, id: id("version"), courseId: copy.id, status: "DRAFT", publishedAt: undefined, publishedById: undefined, immutable: false, versionNotes: "Duplicated course draft.", createdAt: now(), updatedAt: now() };
    copy.currentVersionId = version.id;
    copy.draftVersionId = version.id;
    this.data.courses.push(copy);
    this.data.courseVersions.push(version);
    this.data.courseOwners.push({ id: id("owner"), courseId: copy.id, userId: this.actorId, createdAt: now(), updatedAt: now() });
    this.data.courseAccessPolicies.push({ id: id("policy"), courseId: copy.id, mode: copy.accessMode, createdAt: now(), updatedAt: now() });
    if (includeAudience) {
      this.data.courseAccessGrants
        .filter((grant) => grant.courseId === courseId)
        .forEach((grant) => this.data.courseAccessGrants.push({ ...grant, id: id("grant"), courseId: copy.id, createdAt: now(), updatedAt: now() }));
    }
    this.cloneVersionContent(sourceVersion.id, version.id);
    audit(this.data, this.actorId, "COURSE_CREATED", "Course", copy.id, `Duplicated ${source.title}.`);
    await this.persist();
    return copy;
  }

  async archiveCourse(courseId: string, reason: string) {
    const course = this.requireCourse(courseId);
    course.status = "ARCHIVED";
    course.archiveReason = reason;
    course.archivedAt = now();
    course.updatedAt = now();
    audit(this.data, this.actorId, "COURSE_ARCHIVED", "Course", courseId, `Archived ${course.title}. ${reason}`.trim());
    await this.persist();
  }

  async restoreCourse(courseId: string) {
    const course = this.requireCourse(courseId);
    course.status = "DRAFT";
    course.archiveReason = undefined;
    course.archivedAt = undefined;
    course.updatedAt = now();
    audit(this.data, this.actorId, "COURSE_RESTORED", "Course", courseId, `Restored ${course.title}.`);
    await this.persist();
  }

  async createCourseVersion(courseId: string, type: "MINOR" | "MAJOR", summary: string, copyContent = true) {
    const course = this.requireCourse(courseId);
    const current = this.requireCurrentVersion(course);
    const [major, minor] = current.version.split(".").map((part) => Number(part));
    const nextVersion = type === "MAJOR" ? `${major + 1}.0` : `${major}.${minor + 1}`;
    const version: CourseVersion = { id: id("version"), courseId, version: nextVersion, status: "DRAFT", summary, goal: current.goal, immutable: false, completionRules: [...current.completionRules], createdAt: now(), updatedAt: now() };
    this.data.courseVersions.push(version);
    if (copyContent) this.cloneVersionContent(current.id, version.id);
    course.status = "DRAFT";
    course.currentVersionId = version.id;
    course.draftVersionId = version.id;
    course.updatedAt = now();
    audit(this.data, this.actorId, "COURSE_VERSION_CREATED", "Course", courseId, `Created draft version ${nextVersion}.`);
    await this.persist();
    return version;
  }

  async addModule(courseId: string, title: string) {
    const version = this.requireCurrentVersion(this.requireCourse(courseId));
    const position = this.data.modules.filter((module) => module.courseVersionId === version.id).length + 1;
    const moduleRecord: Module = { id: id("module"), courseVersionId: version.id, title, position, createdAt: now(), updatedAt: now() };
    this.data.modules.push(moduleRecord);
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "MODULE_CREATED", "Course", courseId, `Added module ${title}.`);
    await this.persist();
    return moduleRecord;
  }

  async updateModule(moduleId: string, patch: Partial<Module>) {
    const moduleRecord = this.data.modules.find((item) => item.id === moduleId)!;
    Object.assign(moduleRecord, patch, { updatedAt: now() });
    const course = this.courseForVersion(moduleRecord.courseVersionId);
    if (course) this.touchCourse(course.id);
    audit(this.data, this.actorId, "MODULE_UPDATED", "Course", course?.id ?? moduleId, `Updated module ${moduleRecord.title}.`);
    await this.persist();
  }

  async deleteModule(moduleId: string) {
    const moduleRecord = this.data.modules.find((item) => item.id === moduleId)!;
    const course = this.courseForVersion(moduleRecord.courseVersionId);
    const lessonIds = this.data.lessons.filter((lesson) => lesson.moduleId === moduleId).map((lesson) => lesson.id);
    this.data.contentBlocks = this.data.contentBlocks.filter((block) => !lessonIds.includes(block.lessonId));
    this.data.lessons = this.data.lessons.filter((lesson) => lesson.moduleId !== moduleId);
    this.data.modules = this.data.modules.filter((module) => module.id !== moduleId);
    if (course) this.touchCourse(course.id);
    audit(this.data, this.actorId, "MODULE_DELETED", "Course", course?.id ?? moduleId, `Deleted module ${moduleRecord.title}.`);
    await this.persist();
  }

  async reorderModules(courseId: string, moduleIds: string[]) {
    moduleIds.forEach((moduleId, index) => {
      const moduleRecord = this.data.modules.find((module) => module.id === moduleId);
      if (moduleRecord) {
        moduleRecord.position = index + 1;
        moduleRecord.updatedAt = now();
      }
    });
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "MODULES_REORDERED", "Course", courseId, "Reordered modules.");
    await this.persist();
  }

  async addLesson(courseId: string, moduleId: string, title: string) {
    const version = this.requireCurrentVersion(this.requireCourse(courseId));
    const position = this.data.lessons.filter((lesson) => lesson.moduleId === moduleId).length + 1;
    const lesson: Lesson = { id: id("lesson"), moduleId, courseVersionId: version.id, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), position, required: true, estimatedMinutes: 8, createdAt: now(), updatedAt: now() };
    this.data.lessons.push(lesson);
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "LESSON_CREATED", "Course", courseId, `Added lesson ${title}.`);
    await this.persist();
    return lesson;
  }

  async updateLesson(lessonId: string, patch: Partial<Lesson>) {
    const lesson = this.data.lessons.find((item) => item.id === lessonId)!;
    Object.assign(lesson, patch, { updatedAt: now() });
    const course = this.courseForVersion(lesson.courseVersionId);
    if (course) this.touchCourse(course.id);
    audit(this.data, this.actorId, "LESSON_UPDATED", "Course", course?.id ?? lessonId, `Updated lesson ${lesson.title}.`);
    await this.persist();
  }

  async deleteLesson(lessonId: string) {
    const lesson = this.data.lessons.find((item) => item.id === lessonId)!;
    const course = this.courseForVersion(lesson.courseVersionId);
    this.data.contentBlocks = this.data.contentBlocks.filter((block) => block.lessonId !== lessonId);
    this.data.lessons = this.data.lessons.filter((item) => item.id !== lessonId);
    if (course) this.touchCourse(course.id);
    audit(this.data, this.actorId, "LESSON_DELETED", "Course", course?.id ?? lessonId, `Deleted lesson ${lesson.title}.`);
    await this.persist();
  }

  async reorderLessons(courseId: string, moduleId: string, lessonIds: string[]) {
    lessonIds.forEach((lessonId, index) => {
      const lesson = this.data.lessons.find((item) => item.id === lessonId && item.moduleId === moduleId);
      if (lesson) {
        lesson.position = index + 1;
        lesson.updatedAt = now();
      }
    });
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "LESSONS_REORDERED", "Course", courseId, "Reordered lessons.");
    await this.persist();
  }

  async addContentBlock(courseId: string, lessonId: string, type: string, title: string, body: string, data?: unknown) {
    const position = this.data.contentBlocks.filter((block) => block.lessonId === lessonId).length + 1;
    const block: ContentBlock = { id: id("block"), lessonId, type, title, body, data, position, createdAt: now(), updatedAt: now() };
    this.data.contentBlocks.push(block);
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "CONTENT_BLOCK_CREATED", "Course", courseId, `Added ${title || type} block.`);
    await this.persist();
    return block;
  }

  async updateContentBlock(courseId: string, blockId: string, patch: Partial<ContentBlock>) {
    const block = this.data.contentBlocks.find((item) => item.id === blockId)!;
    Object.assign(block, patch, { updatedAt: now() });
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "CONTENT_BLOCK_UPDATED", "Course", courseId, `Updated ${block.title ?? block.type} block.`);
    await this.persist();
  }

  async duplicateContentBlock(courseId: string, blockId: string) {
    const source = this.data.contentBlocks.find((item) => item.id === blockId)!;
    const copy: ContentBlock = { ...source, id: id("block"), position: source.position + 1, createdAt: now(), updatedAt: now() };
    this.data.contentBlocks.push(copy);
    await this.reorderContentBlocks(courseId, source.lessonId, this.data.contentBlocks.filter((block) => block.lessonId === source.lessonId).sort((a, b) => a.position - b.position).map((block) => block.id));
    audit(this.data, this.actorId, "CONTENT_BLOCK_CREATED", "Course", courseId, `Duplicated ${source.title ?? source.type} block.`);
    await this.persist();
    return copy;
  }

  async deleteContentBlock(courseId: string, blockId: string) {
    const source = this.data.contentBlocks.find((item) => item.id === blockId)!;
    this.data.contentBlocks = this.data.contentBlocks.filter((block) => block.id !== blockId);
    this.touchCourse(courseId);
    audit(this.data, this.actorId, "CONTENT_BLOCK_DELETED", "Course", courseId, `Deleted ${source.title ?? source.type} block.`);
    await this.persist();
  }

  async reorderContentBlocks(courseId: string, lessonId: string, blockIds: string[]) {
    blockIds.forEach((blockId, index) => {
      const block = this.data.contentBlocks.find((item) => item.id === blockId && item.lessonId === lessonId);
      if (block) {
        block.position = index + 1;
        block.updatedAt = now();
      }
    });
    this.touchCourse(courseId);
    await this.persist();
  }

  async createQuestion(input: { assessmentId?: string; type: QuestionType; prompt: string; explanation: string; options: Array<{ text: string; isCorrect: boolean; match?: string }>; difficulty?: string; tags?: string[] }) {
    const question: Question = { id: id("question"), type: input.type, prompt: input.prompt, explanation: input.explanation, difficulty: input.difficulty ?? "Foundational", tags: input.tags ?? ["NERC CIP"], createdAt: now(), updatedAt: now() };
    this.data.questions.push(question);
    input.options.forEach((option, index) => this.data.questionOptions.push({ id: id("option"), questionId: question.id, text: option.text, isCorrect: option.isCorrect, match: option.match, position: index + 1, createdAt: now(), updatedAt: now() }));
    if (input.assessmentId) await this.addQuestionToAssessment(input.assessmentId, question.id, 1, false);
    await this.persist();
    return question;
  }

  async updateQuestion(questionId: string, patch: Partial<Question>) {
    const question = this.data.questions.find((item) => item.id === questionId)!;
    Object.assign(question, patch, { updatedAt: now() });
    audit(this.data, this.actorId, "QUESTION_UPDATED", "Question", questionId, `Updated question.`);
    await this.persist();
  }

  async deleteQuestion(questionId: string) {
    this.data.assessmentQuestions = this.data.assessmentQuestions.filter((item) => item.questionId !== questionId);
    this.data.questionOptions = this.data.questionOptions.filter((option) => option.questionId !== questionId);
    this.data.questions = this.data.questions.filter((question) => question.id !== questionId);
    audit(this.data, this.actorId, "QUESTION_DELETED", "Question", questionId, "Deleted question.");
    await this.persist();
  }

  async addQuestionToAssessment(assessmentId: string, questionId: string, points = 1, shouldPersist = true) {
    if (!this.data.assessmentQuestions.some((item) => item.assessmentId === assessmentId && item.questionId === questionId)) {
      const position = this.data.assessmentQuestions.filter((item) => item.assessmentId === assessmentId).length + 1;
      this.data.assessmentQuestions.push({ id: id("aq"), assessmentId, questionId, points, position, createdAt: now(), updatedAt: now() } satisfies AssessmentQuestion);
    }
    if (shouldPersist) await this.persist();
  }

  async removeQuestionFromAssessment(assessmentId: string, questionId: string) {
    this.data.assessmentQuestions = this.data.assessmentQuestions.filter((item) => !(item.assessmentId === assessmentId && item.questionId === questionId));
    await this.persist();
  }

  async requestCourseReview(courseId: string, reviewerIds: string[], dueAt: string, message: string, requireAllReviewers: boolean) {
    const course = this.requireCourse(courseId);
    const readiness = calculateCourseReadiness(this.data, courseId);
    if (readiness.blockingIssues.length) throw new Error(readiness.blockingIssues.map((issue) => issue.message).join("\n"));
    const version = this.requireCurrentVersion(course);
    course.status = "IN_REVIEW";
    course.updatedAt = now();
    version.status = "IN_REVIEW";
    version.updatedAt = now();
    const review: Review = { id: id("review"), courseVersionId: version.id, status: "OPEN", dueAt, submittedAt: now(), message, requireAllReviewers, createdAt: now(), updatedAt: now() };
    this.data.reviews.push(review);
    reviewerIds.forEach((userId) => {
      this.data.reviewAssignments.push({ id: id("reviewassign"), reviewId: review.id, userId, createdAt: now(), updatedAt: now() });
      notify(this.data, userId, "REVIEW_REQUEST", "Course review requested", `${course.title} is ready for review.`, `/build/courses/${courseId}?tab=review`);
    });
    audit(this.data, this.actorId, "COURSE_SUBMITTED", "Course", courseId, `Submitted ${course.title} for review.`);
    await this.persist();
    return review;
  }

  async addReviewComment(reviewId: string, body: string, severity: ReviewComment["severity"], location = "Course Overview", blockId?: string) {
    const comment: ReviewComment = { id: id("comment"), reviewId, authorId: this.actorId, body, blockId, location, severity, blocking: severity === "BLOCKING", status: "OPEN", replies: [], createdAt: now(), updatedAt: now() };
    this.data.reviewComments.push(comment);
    const review = this.data.reviews.find((item) => item.id === reviewId);
    const course = review ? this.courseForVersion(review.courseVersionId) : undefined;
    if (course) {
      notify(this.data, course.ownerId, "REVIEW_COMMENT", "Review comment added", body, `/build/courses/${course.id}?tab=review`);
      audit(this.data, this.actorId, "REVIEW_COMMENT_CREATED", "Course", course.id, `Added review comment.`);
    }
    await this.persist();
    return comment;
  }

  async resolveReviewComment(commentId: string, reply?: string) {
    const comment = this.data.reviewComments.find((item) => item.id === commentId)!;
    comment.status = "RESOLVED";
    comment.resolvedBy = this.actorId;
    comment.resolvedAt = now();
    comment.updatedAt = now();
    if (reply) comment.replies = [...comment.replies, reply];
    const review = this.data.reviews.find((item) => item.id === comment.reviewId);
    const course = review ? this.courseForVersion(review.courseVersionId) : undefined;
    if (course) audit(this.data, this.actorId, "REVIEW_COMMENT_RESOLVED", "Course", course.id, `Resolved review comment.`);
    await this.persist();
  }

  async requestChanges(reviewId: string, comment: string) {
    const review = this.data.reviews.find((item) => item.id === reviewId)!;
    const course = this.courseForVersion(review.courseVersionId)!;
    review.status = "CHANGES_REQUESTED";
    review.updatedAt = now();
    course.status = "CHANGES_REQUESTED";
    course.updatedAt = now();
    this.data.approvals.push({ id: id("approval"), reviewId, approverId: this.actorId, decision: "CHANGES_REQUESTED", comment, createdAt: now(), updatedAt: now() });
    notify(this.data, course.ownerId, "CHANGES_REQUESTED", "Changes requested", comment, `/build/courses/${course.id}?tab=review`);
    audit(this.data, this.actorId, "COURSE_CHANGES_REQUESTED", "Course", course.id, `Requested changes for ${course.title}.`);
    await this.persist();
  }

  async approveCourseReview(reviewId: string, comment = "Approved for publication.") {
    const review = this.data.reviews.find((item) => item.id === reviewId)!;
    const course = this.courseForVersion(review.courseVersionId)!;
    review.status = "APPROVED";
    review.updatedAt = now();
    course.status = "APPROVED";
    course.updatedAt = now();
    this.data.approvals.push({ id: id("approval"), reviewId, approverId: this.actorId, decision: "APPROVED", comment, createdAt: now(), updatedAt: now() });
    notify(this.data, course.ownerId, "REVIEW_APPROVED", "Course approved", `${course.title} is approved for publication.`, `/build/courses/${course.id}?tab=review`);
    audit(this.data, this.actorId, "COURSE_APPROVED", "Course", course.id, `Approved ${course.title}.`);
    await this.persist();
  }

  async resubmitCourseReview(courseId: string) {
    const course = this.requireCourse(courseId);
    course.status = "IN_REVIEW";
    course.updatedAt = now();
    audit(this.data, this.actorId, "COURSE_RESUBMITTED", "Course", courseId, `Resubmitted ${course.title} for review.`);
    await this.persist();
  }

  calculateCourseReadiness(courseId: string) {
    return calculateCourseReadiness(this.data, courseId);
  }

  async publishCourse(courseId: string, options?: { scheduledPublishAt?: string; showInCatalog?: boolean; allowSelfEnrollment?: boolean; certificateEnabled?: boolean; versionNotes?: string }) {
    const course = this.requireCourse(courseId);
    const version = this.requireCurrentVersion(course);
    const readiness = calculateCourseReadiness(this.data, courseId);
    if (readiness.blockingIssues.length) throw new Error(readiness.blockingIssues.map((issue) => issue.message).join("\n"));
    if (course.status !== "APPROVED" && course.status !== "PUBLISHED") throw new Error("Course must be approved before publishing.");
    if (options?.scheduledPublishAt) {
      course.status = "SCHEDULED";
      course.scheduledPublishAt = options.scheduledPublishAt;
      version.status = "SCHEDULED";
      version.scheduledPublishAt = options.scheduledPublishAt;
      audit(this.data, this.actorId, "COURSE_PUBLISHED", "Course", course.id, `Scheduled ${course.title} for publication.`);
    } else {
      course.status = "PUBLISHED";
      course.publishedById = this.actorId;
      course.scheduledPublishAt = undefined;
      version.status = "PUBLISHED";
      version.immutable = true;
      version.publishedAt = now();
      version.publishedById = this.actorId;
      audit(this.data, this.actorId, "COURSE_PUBLISHED", "Course", course.id, `Published ${course.title} version ${version.version}.`);
    }
    if (typeof options?.showInCatalog === "boolean") course.showInCatalog = options.showInCatalog;
    if (typeof options?.allowSelfEnrollment === "boolean") course.allowSelfEnrollment = options.allowSelfEnrollment;
    if (typeof options?.certificateEnabled === "boolean") course.certificateEnabled = options.certificateEnabled;
    version.versionNotes = options?.versionNotes;
    course.updatedAt = now();
    version.updatedAt = now();
    await this.persist();
  }

  async scheduleCoursePublication(courseId: string, publishAt: string, versionNotes: string) {
    return this.publishCourse(courseId, { scheduledPublishAt: publishAt, versionNotes });
  }

  async assignCourse(courseId: string, userId: string, dueAt: string) {
    return this.createAssignment(courseId, [{ audienceType: "USER", audienceId: userId }], dueAt, "NONE");
  }

  async createAssignment(courseId: string, audiences: Array<Pick<AssignmentAudience, "audienceType" | "audienceId">>, dueAt: string, recurrence: Assignment["recurrence"], notificationSettings: Record<string, boolean> = {}) {
    const course = this.requireCourse(courseId);
    const assignment: Assignment = { id: id("assign"), organizationId: this.data.organizations[0].id, title: `Assigned ${course.title}`, targetType: "COURSE", targetId: courseId, createdById: this.actorId, dueAt, assignedAt: now(), recurrence, status: "ACTIVE", notificationSettings, createdAt: now(), updatedAt: now() };
    this.data.assignments.push(assignment);
    audiences.forEach((audience) => this.data.assignmentAudiences.push({ id: id("aud"), assignmentId: assignment.id, ...audience, createdAt: now(), updatedAt: now() }));
    const learnerIds = this.resolveAudienceLearners(audiences);
    learnerIds.forEach((userId) => {
      if (!this.data.enrollments.some((item) => item.userId === userId && item.courseId === courseId && item.assignmentId === assignment.id)) {
        this.data.enrollments.push({ id: id("enroll"), organizationId: this.data.organizations[0].id, userId, courseId, assignmentId: assignment.id, status: "NOT_STARTED", createdAt: now(), updatedAt: now() });
      }
      if (notificationSettings.notifyLearners !== false) notify(this.data, userId, "COURSE_ASSIGNED", "Training assigned", `${course.title} is assigned to you.`, `/courses/${courseId}`);
    });
    audit(this.data, this.actorId, "ASSIGNMENT_CREATED", "Assignment", assignment.id, `Assigned ${course.title} to ${learnerIds.length} learners.`);
    await this.persist();
    return assignment;
  }

  async sendLearnerReminder(courseId: string, userId: string) {
    const course = this.requireCourse(courseId);
    notify(this.data, userId, "TRAINING_REMINDER", "Training reminder", `${course.title} is still assigned.`, `/courses/${courseId}`);
    audit(this.data, this.actorId, "REMINDER_SENT", "Course", courseId, `Sent reminder for ${course.title}.`);
    await this.persist();
  }

  async extendAssignmentDueDate(assignmentId: string, dueAt: string) {
    const assignment = this.data.assignments.find((item) => item.id === assignmentId)!;
    assignment.dueAt = dueAt;
    assignment.updatedAt = now();
    audit(this.data, this.actorId, "ASSIGNMENT_EXTENDED", "Assignment", assignmentId, `Extended assignment due date.`);
    await this.persist();
  }

  async requestAccess(courseId: string, reason: string) {
    const request: AccessRequest = { id: id("access"), userId: this.actorId, courseId, reason, status: "PENDING", createdAt: now(), updatedAt: now() };
    this.data.accessRequests.push(request);
    const owner = this.data.courseOwners.find((item) => item.courseId === courseId);
    if (owner) notify(this.data, owner.userId, "ACCESS_REQUEST", "Access request", "A learner requested course access.", `/build/courses/${courseId}`);
    audit(this.data, this.actorId, "ACCESS_REQUEST_CREATED", "Course", courseId, "Requested course access.");
    await this.persist();
  }

  async decideAccessRequest(requestId: string, approved: boolean, comment: string) {
    const request = this.data.accessRequests.find((item) => item.id === requestId)!;
    request.status = approved ? "APPROVED" : "DENIED";
    request.decidedBy = this.actorId;
    request.decidedAt = now();
    request.comment = comment;
    if (approved) this.data.courseAccessGrants.push({ id: id("grant"), courseId: request.courseId, grantType: "USER", grantId: request.userId, createdAt: now(), updatedAt: now() });
    notify(this.data, request.userId, approved ? "ACCESS_APPROVED" : "ACCESS_DENIED", approved ? "Access approved" : "Access denied", comment || "Your access request was reviewed.", `/courses/${request.courseId}`);
    audit(this.data, this.actorId, approved ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_DENIED", "AccessRequest", request.id, `Access request ${request.status.toLowerCase()}.`);
    await this.persist();
  }

  getCourseCompletionState(courseId: string, userId = this.actorId): CourseCompletionState {
    return getCourseCompletionState(this.data, userId, courseId);
  }

  async completeLesson(courseId: string, lessonId: string) {
    if (!this.data.lessonProgress.some((item) => item.userId === this.actorId && item.lessonId === lessonId)) {
      this.data.lessonProgress.push({ id: id("lp"), userId: this.actorId, lessonId, completedAt: now(), createdAt: now(), updatedAt: now() });
      audit(this.data, this.actorId, "LESSON_COMPLETED", "Lesson", lessonId, "Completed lesson.");
    }
    const enrollment = this.ensureEnrollment(courseId);
    enrollment.status = "IN_PROGRESS";
    enrollment.lastAccessedAt = now();
    enrollment.currentLessonId = lessonId;
    this.recalculateCourseProgress(courseId);
    await this.persist();
  }

  async saveLessonNote(lessonId: string, note: string) {
    let progress = this.data.lessonProgress.find((item) => item.userId === this.actorId && item.lessonId === lessonId);
    if (!progress) {
      progress = { id: id("lp"), userId: this.actorId, lessonId, createdAt: now(), updatedAt: now() };
      this.data.lessonProgress.push(progress);
    }
    progress.notes = note;
    progress.updatedAt = now();
    await this.persist();
  }

  async toggleBookmark(lessonId: string) {
    let progress = this.data.lessonProgress.find((item) => item.userId === this.actorId && item.lessonId === lessonId);
    if (!progress) {
      progress = { id: id("lp"), userId: this.actorId, lessonId, createdAt: now(), updatedAt: now() };
      this.data.lessonProgress.push(progress);
    }
    const current = (progress as unknown as { bookmarked?: boolean }).bookmarked;
    (progress as unknown as { bookmarked?: boolean }).bookmarked = !current;
    progress.updatedAt = now();
    await this.persist();
  }

  async completeLearningActivity(courseId: string, lessonId: string, activityId: string, answers: unknown, score = 100) {
    const course = this.requireCourse(courseId);
    const existing = this.data.scenarioAttempts.find((item) => item.userId === this.actorId && item.scenarioId === activityId);
    if (existing) {
      existing.answers = answers;
      existing.score = score;
      existing.status = "COMPLETED";
      existing.lastStep = Array.isArray(answers) ? answers.length : undefined;
      existing.completedAt = existing.completedAt ?? now();
      existing.updatedAt = now();
    } else {
      this.data.scenarioAttempts.push({
        id: id("scenarioattempt"),
        scenarioId: activityId,
        userId: this.actorId,
        courseId,
        courseVersionId: course.currentVersionId,
        lessonId,
        score,
        answers,
        status: "COMPLETED",
        lastStep: Array.isArray(answers) ? answers.length : undefined,
        completedAt: now(),
        createdAt: now(),
        updatedAt: now()
      });
    }
    if (!this.data.lessonProgress.some((item) => item.userId === this.actorId && item.lessonId === lessonId && item.completedAt)) {
      this.data.lessonProgress.push({ id: id("lp"), userId: this.actorId, lessonId, completedAt: now(), createdAt: now(), updatedAt: now() });
      audit(this.data, this.actorId, "LESSON_COMPLETED", "Lesson", lessonId, "Completed lesson after required activity.");
    }
    const enrollment = this.ensureEnrollment(courseId);
    enrollment.status = "IN_PROGRESS";
    enrollment.lastAccessedAt = now();
    enrollment.currentLessonId = lessonId;
    audit(this.data, this.actorId, "LEARNING_ACTIVITY_COMPLETED", "Course", courseId, "Completed required course activity.");
    this.recalculateCourseProgress(courseId);
    await this.persist();
  }

  async submitAssessment(courseId: string, answers: Record<string, unknown>) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const assessment = this.data.assessments.find((item) => item.courseVersionId === course.currentVersionId)!;
    const assessmentQuestions = this.data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id);
    let correct = 0;
    const missedTopics: string[] = [];
    for (const link of assessmentQuestions) {
      const question = this.data.questions.find((item) => item.id === link.questionId)!;
      const options = this.data.questionOptions.filter((option) => option.questionId === link.questionId);
      const answer = answers[link.questionId];
      const isCorrect = evaluateAnswer(options, answer);
      if (isCorrect) correct += 1;
      else missedTopics.push(question.tags.find((tag) => !["NERC CIP", "CIP-004"].includes(tag)) ?? "Course Review");
    }
    const score = Math.round((correct / assessmentQuestions.length) * 100);
    const passed = score >= assessment.passingScore;
    const attempt = { id: id("attempt"), userId: this.actorId, assessmentId: assessment.id, courseId, score, passed, submittedAt: now(), attemptNumber: this.data.assessmentAttempts.filter((item) => item.userId === this.actorId && item.assessmentId === assessment.id).length + 1, answers, correctCount: correct, totalQuestions: assessmentQuestions.length, missedTopics: Array.from(new Set(missedTopics)), createdAt: now(), updatedAt: now() };
    this.data.assessmentAttempts.push(attempt);
    audit(this.data, this.actorId, "ASSESSMENT_SUBMITTED", "Assessment", assessment.id, `Submitted assessment with score ${score}%.`);
    if (passed && !course.requireAcknowledgement) this.completeCourse(courseId, score);
    this.recalculateCourseProgress(courseId);
    await this.persist();
    return attempt;
  }

  async submitAcknowledgement(courseId: string, acknowledgementText: string) {
    const course = this.requireCourse(courseId);
    const version = this.requireCurrentVersion(course);
    const existing = this.data.acknowledgements.find((item) => item.userId === this.actorId && item.courseId === courseId && item.courseVersionId === version.id);
    if (!existing) {
      this.data.acknowledgements.push({ id: id("ack"), userId: this.actorId, courseId, courseVersionId: version.id, text: acknowledgementText, acknowledgementVersion: "1.0", submittedAt: now(), status: "SUBMITTED", createdAt: now(), updatedAt: now() });
      audit(this.data, this.actorId, "ACKNOWLEDGEMENT_SUBMITTED", "Course", courseId, "Submitted learner acknowledgement.");
    }
    const lastPass = this.getPassingAssessment(courseId);
    if (lastPass) this.completeCourse(courseId, lastPass.score);
    await this.persist();
  }

  async completePracticeActivity(activityId: string, responses: Record<string, unknown>, source: "SELF_SELECTED" | "RECOMMENDED" | "ASSIGNED" | "REMEDIATION" | "REINFORCEMENT" = "SELF_SELECTED") {
    const activity = this.data.practiceActivities.find((item) => item.id === activityId);
    if (!activity) throw new Error("Practice activity not found.");
    const scoredBlocks = activity.blocks.filter((block) => block.type === "decision_cards" || block.type === "quick_recall");
    const correct = scoredBlocks.filter((block) => {
      const answer = responses[block.id];
      const data = block.data as { correct?: number } | undefined;
      return Number(answer) === Number(data?.correct ?? 0);
    }).length;
    const score = scoredBlocks.length ? Math.round((correct / scoredBlocks.length) * 100) : 100;
    const result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG" = score >= 80 ? "STRONG" : score >= 60 ? "DEVELOPING" : "NEEDS_REVIEW";
    const attempt = {
      id: id("practiceattempt"),
      practiceActivityId: activity.id,
      userId: this.actorId,
      startedAt: now(),
      completedAt: now(),
      score,
      passed: activity.scoringMode === "PRACTICE" ? true : score >= (activity.passingScore ?? 80),
      responses: Object.entries(responses).map(([blockId, response]) => ({ blockId, response, correct: true })),
      topicResults: activity.topicIds.map((topicId) => ({ topicId, result, score })),
      durationSeconds: activity.estimatedMinutes * 60,
      source,
      createdAt: now(),
      updatedAt: now()
    };
    this.data.practiceAttempts.push(attempt);
    activity.skillIds.forEach((skillId) => {
      this.data.skillEvidence.push({ id: id("skillevidence"), userId: this.actorId, skillId, sourceType: activity.activityType === "MICROLEARNING" ? "MICROLEARNING" : "PRACTICE", sourceId: attempt.id, observedAt: now(), result, weight: activity.scoringMode === "COMPETENCY" ? 2 : 1, details: activity.title, createdAt: now(), updatedAt: now() });
    });
    this.data.reinforcementSchedules.forEach((schedule) => schedule.events.forEach((event) => {
      if (event.activityId === activityId && event.state === "AVAILABLE") {
        event.state = "COMPLETED";
        event.completedAt = now();
      }
    }));
    audit(this.data, this.actorId, "PRACTICE_COMPLETED", "PracticeActivity", activity.id, `Completed ${activity.title} with ${result.toLowerCase().replaceAll("_", " ")} result.`);
    await this.persist();
    return attempt;
  }

  async dismissRecommendation(recommendationId: string) {
    this.data.learningPreferences.push({ id: id("pref"), userId: this.actorId, key: "dismissedRecommendation", value: recommendationId, createdAt: now(), updatedAt: now() });
    await this.persist();
  }

  async startBranchingScenario(scenarioId: string, replayOfAttemptId?: string) {
    const scenario = this.data.scenarioDefinitions.find((item) => item.id === scenarioId);
    if (!scenario) throw new Error("Scenario not found.");
    const attempt = {
      id: id("branchattempt"),
      userId: this.actorId,
      scenarioId,
      startedAt: now(),
      currentStepId: scenario.steps[0]?.id ?? "complete",
      currentState: { ...scenario.initialState },
      decisions: [],
      skillResults: [],
      overallResult: "DEVELOPING" as const,
      replayOfAttemptId,
      createdAt: now(),
      updatedAt: now()
    };
    this.data.branchingScenarioAttempts.push(attempt);
    audit(this.data, this.actorId, replayOfAttemptId ? "SCENARIO_REPLAY_STARTED" : "SCENARIO_STARTED", "Scenario", scenarioId, `Started ${scenario.title}.`);
    await this.persist();
    return attempt;
  }

  async chooseScenarioChoice(attemptId: string, stepId: string, choiceId: string) {
    const attempt = this.data.branchingScenarioAttempts.find((item) => item.id === attemptId);
    if (!attempt) throw new Error("Scenario attempt not found.");
    const scenario = this.data.scenarioDefinitions.find((item) => item.id === attempt.scenarioId);
    const step = scenario?.steps.find((item) => item.id === stepId);
    const choice = step?.choices?.find((item) => item.id === choiceId);
    if (!scenario || !step || !choice) throw new Error("Scenario choice not found.");
    choice.impact.forEach((impact) => { attempt.currentState[impact.field] = impact.value; });
    attempt.decisions.push({ stepId, choiceId, quality: choice.quality, feedback: choice.feedback, selectedAt: now() });
    const nextStep = choice.nextStepId ? scenario.steps.find((item) => item.id === choice.nextStepId) : undefined;
    if (nextStep) {
      attempt.currentStepId = nextStep.id;
    } else {
      const recommended = attempt.decisions.filter((decision) => decision.quality === "RECOMMENDED").length;
      attempt.overallResult = recommended >= 3 ? "STRONG" : recommended >= 1 ? "DEVELOPING" : "NEEDS_REVIEW";
      attempt.completedAt = now();
      attempt.skillResults = scenario.skillIds.map((skillId) => ({ topicId: skillId, result: attempt.overallResult, score: scoreForResult(attempt.overallResult) }));
      scenario.skillIds.forEach((skillId) => {
        this.data.skillEvidence.push({ id: id("skillevidence"), userId: this.actorId, skillId, sourceType: "SCENARIO", sourceId: attempt.id, observedAt: now(), result: attempt.overallResult, weight: 3, details: scenario.title, createdAt: now(), updatedAt: now() });
      });
      audit(this.data, this.actorId, "SCENARIO_COMPLETED", "Scenario", scenario.id, `Completed ${scenario.title} with ${attempt.overallResult.toLowerCase().replaceAll("_", " ")} result.`);
    }
    attempt.updatedAt = now();
    await this.persist();
    return attempt;
  }

  async createLearnerFollowUp(input: { title: string; description?: string; sourceType: "COURSE" | "SCENARIO" | "PRACTICE" | "MANUAL"; sourceId?: string; dueAt?: string; visibility?: "PRIVATE" | "SHARED_WITH_MANAGER" }) {
    const followUp = { id: id("followup"), userId: this.actorId, title: input.title, description: input.description, sourceType: input.sourceType, sourceId: input.sourceId, dueAt: input.dueAt, visibility: input.visibility ?? ("PRIVATE" as const), createdAt: now(), updatedAt: now() };
    this.data.learnerFollowUps.push(followUp);
    await this.persist();
    return followUp;
  }

  async updateFollowUp(followUpId: string, updates: { title?: string; description?: string; completed?: boolean; visibility?: "PRIVATE" | "SHARED_WITH_MANAGER" }) {
    const followUp = this.data.learnerFollowUps.find((item) => item.id === followUpId && item.userId === this.actorId);
    if (!followUp) throw new Error("Follow-up not found.");
    if (updates.title !== undefined) followUp.title = updates.title;
    if (updates.description !== undefined) followUp.description = updates.description;
    if (updates.visibility) followUp.visibility = updates.visibility;
    if (updates.completed !== undefined) followUp.completedAt = updates.completed ? now() : undefined;
    followUp.updatedAt = now();
    await this.persist();
  }

  async assignLearningItem(targetType: "PRACTICE" | "SCENARIO", targetId: string, audiences: Array<Pick<AssignmentAudience, "audienceType" | "audienceId">>, dueAt: string, message?: string) {
    const target = targetType === "PRACTICE" ? this.data.practiceActivities.find((item) => item.id === targetId) : this.data.scenarioDefinitions.find((item) => item.id === targetId);
    if (!target) throw new Error("Learning item not found.");
    const assignment: Assignment = { id: id("assign"), organizationId: this.data.organizations[0].id, title: `Assigned ${target.title}`, targetType, targetId, createdById: this.actorId, dueAt, assignedAt: now(), recurrence: "NONE", status: "ACTIVE", notificationSettings: { notifyLearners: true }, createdAt: now(), updatedAt: now() };
    this.data.assignments.push(assignment);
    audiences.forEach((audience) => this.data.assignmentAudiences.push({ id: id("aud"), assignmentId: assignment.id, ...audience, createdAt: now(), updatedAt: now() }));
    this.resolveAudienceLearners(audiences).forEach((userId) => notify(this.data, userId, `${targetType}_ASSIGNED`, `${targetType === "PRACTICE" ? "Practice" : "Scenario"} assigned`, message || `${target.title} was assigned to you.`, targetType === "PRACTICE" ? `/practice/${targetId}` : `/scenarios/${targetId}`));
    audit(this.data, this.actorId, `${targetType}_ASSIGNED`, targetType, targetId, `Assigned ${target.title}.`);
    await this.persist();
    return assignment;
  }

  async createCampaign(input: { title: string; description: string; audienceType: LearningCampaign["audienceType"]; audienceIds: string[]; dueAt?: string; items: LearningCampaign["items"] }) {
    const campaign: LearningCampaign = { id: id("campaign"), title: input.title, description: input.description, status: "ACTIVE", audienceType: input.audienceType, audienceIds: input.audienceIds, startAt: now(), dueAt: input.dueAt, items: input.items, createdByUserId: this.actorId, createdAt: now(), updatedAt: now() };
    this.data.learningCampaigns.push(campaign);
    const audiences = input.audienceIds.map((audienceId) => ({ audienceType: input.audienceType, audienceId }));
    const assignment: Assignment = { id: id("assign"), organizationId: this.data.organizations[0].id, title: campaign.title, targetType: "CAMPAIGN", targetId: campaign.id, createdById: this.actorId, dueAt: input.dueAt ?? addDays(new Date(), 30).toISOString(), assignedAt: now(), recurrence: "NONE", status: "ACTIVE", notificationSettings: { notifyLearners: true }, createdAt: now(), updatedAt: now() };
    this.data.assignments.push(assignment);
    audiences.forEach((audience) => this.data.assignmentAudiences.push({ id: id("aud"), assignmentId: assignment.id, ...audience, createdAt: now(), updatedAt: now() }));
    this.resolveAudienceLearners(audiences).forEach((userId) => notify(this.data, userId, "CAMPAIGN_DUE", "Learning campaign assigned", `${campaign.title} is available.`, `/campaigns/${campaign.id}`));
    audit(this.data, this.actorId, "CAMPAIGN_CREATED", "LearningCampaign", campaign.id, `Created ${campaign.title}.`);
    await this.persist();
    return campaign;
  }

  private ensureEnrollment(courseId: string): Enrollment {
    let enrollment = this.data.enrollments.find((item) => item.userId === this.actorId && item.courseId === courseId);
    if (!enrollment) {
      enrollment = { id: id("enroll"), organizationId: this.data.organizations[0].id, userId: this.actorId, courseId, status: "IN_PROGRESS", startedAt: now(), lastAccessedAt: now(), createdAt: now(), updatedAt: now() };
      this.data.enrollments.push(enrollment);
    }
    return enrollment;
  }

  private recalculateCourseProgress(courseId: string) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const state = getCourseCompletionState(this.data, this.actorId, courseId);
    const percentComplete = state.percent;
    let progress = this.data.courseProgress.find((item) => item.userId === this.actorId && item.courseId === courseId);
    if (!progress) {
      progress = { id: id("cp"), userId: this.actorId, courseId, courseVersionId: course.currentVersionId!, status: "IN_PROGRESS", percentComplete, createdAt: now(), updatedAt: now() };
      this.data.courseProgress.push(progress);
    }
    progress.percentComplete = percentComplete;
    progress.status = state.courseComplete ? "COMPLETED" : percentComplete > 0 ? "IN_PROGRESS" : progress.status;
    progress.updatedAt = now();
  }

  private completeCourse(courseId: string, score: number) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const version = this.data.courseVersions.find((item) => item.id === course.currentVersionId)!;
    const existingEvidence = this.data.evidenceRecords.find((item) => item.userId === this.actorId && item.courseId === courseId && item.courseVersionId === version.id);
    if (existingEvidence) return;
    const enrollment = this.ensureEnrollment(courseId);
    enrollment.status = "COMPLETED";
    enrollment.completedAt = now();
    this.recalculateCourseProgress(courseId);
    const progress = this.data.courseProgress.find((item) => item.userId === this.actorId && item.courseId === courseId)!;
    progress.status = "COMPLETED";
    progress.percentComplete = 100;
    progress.completedAt = now();
    const user = this.data.users.find((item) => item.id === this.actorId)!;
    const requirement = this.data.certificationRequirements.find((item) => item.type === "COURSE" && item.targetId === courseId);
    let certificateId: string | undefined;
    if (course.certificateEnabled || requirement) {
      certificateId = certificateIdFor(user, course);
      const certificationId = requirement?.certificationId ?? this.createAdHocCertification(course);
      this.data.userCertifications.push({ id: id("ucert"), userId: this.actorId, certificationId, courseId, courseVersionId: version.id, certificateId, issuedAt: now(), expiresAt: addDays(new Date(), course.certificateExpirationMonths ? course.certificateExpirationMonths * 30 : 365).toISOString(), status: "ACTIVE", createdAt: now(), updatedAt: now() });
      notify(this.data, this.actorId, "CERTIFICATE_EARNED", "Certificate earned", `${course.title} certificate is ready.`, "/certifications");
      audit(this.data, this.actorId, "CERTIFICATE_ISSUED", "Course", courseId, `Issued certificate for ${course.title}.`);
    }
    const acknowledgement = this.data.acknowledgements.find((item) => item.userId === this.actorId && item.courseId === courseId && item.courseVersionId === version.id);
    this.data.evidenceRecords.push({ id: id("evidence"), organizationId: this.data.organizations[0].id, title: `Training Completion — ${user.name} — ${(course.shortTitle ?? course.title)} v${version.version}`, evidenceType: "TRAINING_COMPLETION", userId: this.actorId, userDisplayName: user.name, courseId, courseTitle: course.title, courseVersionId: version.id, assignmentId: enrollment.assignmentId, enrollmentId: enrollment.id, completedAt: now(), assessmentScore: score, certificationId: requirement?.certificationId, certificateId, acknowledgementText: acknowledgement?.text ?? "Learner completed required training and acknowledgement.", source: "GridGuard Learning", standardRefs: this.data.courseStandardMappings.filter((mapping) => mapping.courseId === courseId).map((mapping) => mapping.standardVersionId), status: "CURRENT", createdAt: now(), updatedAt: now() });
    audit(this.data, this.actorId, "COURSE_COMPLETED", "Course", courseId, `Completed ${course.title}.`);
  }

  private getPassingAssessment(courseId: string) {
    const course = this.requireCourse(courseId);
    const assessment = this.data.assessments.find((item) => item.courseVersionId === course.currentVersionId);
    if (!assessment) return undefined;
    return this.data.assessmentAttempts
      .filter((item) => item.userId === this.actorId && item.assessmentId === assessment.id && item.passed)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
  }

  private createAdHocCertification(course: Course) {
    const cert = { id: id("cert"), organizationId: this.data.organizations[0].id, name: `${course.title} Certificate`, description: `Certificate for ${course.title}`, validityDays: 365, renewalWindowDays: 30, status: "ACTIVE" as const, createdAt: now(), updatedAt: now() };
    this.data.certifications.push(cert);
    this.data.certificationRequirements.push({ id: id("certreq"), certificationId: cert.id, type: "COURSE", targetId: course.id, createdAt: now(), updatedAt: now() });
    return cert.id;
  }

  private requireCourse(courseId: string) {
    const course = this.data.courses.find((item) => item.id === courseId);
    if (!course) throw new Error("Course not found.");
    return course;
  }

  private requireCurrentVersion(course: Course) {
    const version = this.data.courseVersions.find((item) => item.id === (course.draftVersionId ?? course.currentVersionId));
    if (!version) throw new Error("Course version not found.");
    return version;
  }

  private courseForVersion(courseVersionId: string) {
    return this.data.courses.find((course) => course.currentVersionId === courseVersionId || course.draftVersionId === courseVersionId || this.data.courseVersions.some((version) => version.courseId === course.id && version.id === courseVersionId));
  }

  private touchCourse(courseId: string) {
    const course = this.data.courses.find((item) => item.id === courseId);
    if (course) course.updatedAt = now();
  }

  private cloneVersionContent(sourceVersionId: string, targetVersionId: string) {
    const moduleIdMap = new Map<string, string>();
    const lessonIdMap = new Map<string, string>();
    this.data.modules
      .filter((module) => module.courseVersionId === sourceVersionId)
      .sort((left, right) => left.position - right.position)
      .forEach((module) => {
        const moduleId = id("module");
        moduleIdMap.set(module.id, moduleId);
        this.data.modules.push({ ...module, id: moduleId, courseVersionId: targetVersionId, createdAt: now(), updatedAt: now() });
      });
    this.data.lessons
      .filter((lesson) => lesson.courseVersionId === sourceVersionId)
      .sort((left, right) => left.position - right.position)
      .forEach((lesson) => {
        const lessonId = id("lesson");
        lessonIdMap.set(lesson.id, lessonId);
        this.data.lessons.push({ ...lesson, id: lessonId, moduleId: moduleIdMap.get(lesson.moduleId)!, courseVersionId: targetVersionId, createdAt: now(), updatedAt: now() });
      });
    this.data.contentBlocks
      .filter((block) => lessonIdMap.has(block.lessonId))
      .forEach((block) => this.data.contentBlocks.push({ ...block, id: id("block"), lessonId: lessonIdMap.get(block.lessonId)!, createdAt: now(), updatedAt: now() }));
    const objectives = this.data.learningObjectives.filter((objective) => objective.courseVersionId === sourceVersionId);
    const objectiveMap = new Map<string, string>();
    objectives.forEach((objective) => {
      const objectiveId = id("obj");
      objectiveMap.set(objective.id, objectiveId);
      this.data.learningObjectives.push({ ...objective, id: objectiveId, courseVersionId: targetVersionId, createdAt: now(), updatedAt: now() });
    });
    const sourceAssessment = this.data.assessments.find((assessment) => assessment.courseVersionId === sourceVersionId);
    if (sourceAssessment) {
      const assessmentId = id("assess");
      this.data.assessments.push({ ...sourceAssessment, id: assessmentId, courseVersionId: targetVersionId, createdAt: now(), updatedAt: now() });
      this.data.assessmentQuestions
        .filter((link) => link.assessmentId === sourceAssessment.id)
        .forEach((link) => this.data.assessmentQuestions.push({ ...link, id: id("aq"), assessmentId, createdAt: now(), updatedAt: now() }));
    }
  }

  private resolveAudienceLearners(audiences: Array<Pick<AssignmentAudience, "audienceType" | "audienceId">>) {
    const userIds = new Set<string>();
    const learnerRoleUsers = this.data.userRoles.filter((role) => role.role === "LEARNER").map((role) => role.userId);
    audiences.forEach((audience) => {
      if (audience.audienceType === "USER") userIds.add(audience.audienceId);
      if (audience.audienceType === "TEAM") this.data.teamMembers.filter((member) => member.teamId === audience.audienceId).forEach((member) => userIds.add(member.userId));
      if (audience.audienceType === "GROUP") this.data.groupMembers.filter((member) => member.groupId === audience.audienceId).forEach((member) => userIds.add(member.userId));
      if (audience.audienceType === "ROLE") this.data.userRoles.filter((role) => role.role === audience.audienceId).forEach((role) => userIds.add(role.userId));
    });
    return [...userIds].filter((userId) => learnerRoleUsers.includes(userId) && this.data.users.find((user) => user.id === userId)?.status === "ACTIVE");
  }

  async invalidateEvidence(evidenceId: string, reason: string) {
    const evidence = this.data.evidenceRecords.find((item) => item.id === evidenceId)!;
    evidence.status = "INVALIDATED";
    evidence.invalidationReason = reason;
    evidence.updatedAt = now();
    audit(this.data, this.actorId, "EVIDENCE_INVALIDATED", "Evidence", evidenceId, reason);
    await this.persist();
  }

  async exportBackupFile() {
    const json = await exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const timestamp = new Date().toISOString().slice(0, 16).replaceAll("-", "").replaceAll(":", "").replaceAll("T", "");
    anchor.download = `gridguard-backup-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    audit(this.data, this.actorId, "BACKUP_CREATED", "Application", this.data.organizations[0].id, "Exported full backup.");
    await this.persist();
    return json;
  }

  async restoreBackup(json: string) {
    await importBackup(json);
  }

  async resetDemoData() {
    const fresh = createSeedData();
    audit(fresh, this.actorId, "DATA_RESTORED", "Application", fresh.organizations[0].id, "Demo data restored.");
    this.data = fresh;
    await replaceAllData(fresh);
  }
}

function evaluateAnswer(options: QuestionOption[], answer: unknown) {
  const correct = options.filter((option) => option.isCorrect).map((option) => option.id);
  if (Array.isArray(answer)) return correct.length === answer.length && correct.every((item) => answer.includes(item));
  if (typeof answer === "string") return correct.includes(answer) || answer.trim().length > 0;
  return false;
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
    if (data.scenarioAttempts.some((attempt) => attempt.userId === userId && attempt.scenarioId === block.id && attempt.status === "COMPLETED")) completedItems.push(block.id);
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
  const persistedPercent = data.courseProgress.find((item) => item.userId === userId && item.courseId === courseId)?.percentComplete ?? 0;
  return {
    percent: courseComplete ? 100 : Math.max(calculatedPercent, persistedPercent),
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

function certificateIdFor(user: User, course: Course) {
  if (course.id === "course-cip004-annual-refresher" && user.name === "Taylor Morgan") return `GG-CIP004-${new Date().getFullYear()}-TM-0001`;
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "GG";
  const suffix = Math.abs([...`${user.id}${course.id}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 9999).toString().padStart(4, "0");
  return `GG-${new Date().getFullYear()}-${initials}-${suffix}`;
}

export function searchAuthorized(data: AppData, userId: string, query: string) {
  const visibleCourseIds = new Set(data.courses.filter((course) => canAccessCourse(data, userId, course.id).allowed || canAccessCourse(data, userId, course.id).discoverable).map((course) => course.id));
  const visibleVersionIds = new Set(data.courses.filter((course) => visibleCourseIds.has(course.id)).map((course) => course.currentVersionId).filter(Boolean));
  const items = [
    ...data.courses
      .filter((course) => visibleCourseIds.has(course.id))
      .map((course) => ({ type: "Course", title: course.title, description: course.shortDescription, href: `/courses/${course.id}` })),
    ...data.lessons
      .filter((lesson) => visibleVersionIds.has(lesson.courseVersionId))
      .map((lesson) => {
        const course = data.courses.find((item) => item.currentVersionId === lesson.courseVersionId);
        const body = data.contentBlocks.filter((block) => block.lessonId === lesson.id).map((block) => `${block.title ?? ""} ${block.body ?? ""}`).join(" ");
        return { type: "Lesson", title: lesson.title, description: `${course?.shortTitle ?? course?.title ?? "Course"} · ${body.slice(0, 160)}`, href: course ? `/learn/${course.id}/${lesson.id}` : "/learning" };
      }),
    ...data.practiceActivities
      .filter((activity) => activity.status === "PUBLISHED")
      .map((activity) => ({ type: "Practice", title: activity.title, description: activity.description, href: `/practice/${activity.id}` })),
    ...data.scenarioDefinitions
      .map((scenario) => ({ type: "Scenario", title: scenario.title, description: scenario.description, href: `/scenarios/${scenario.id}` })),
    ...data.courseResources
      .filter((resource) => visibleCourseIds.has(resource.courseId))
      .map((resource) => ({ type: "Resource", title: resource.title, description: resource.description, href: `/resources/${resource.id}` })),
    ...data.learningPaths.map((path) => ({ type: "Learning Path", title: path.title, description: path.description, href: "/learning-paths" })),
    ...data.standards.map((standard) => ({ type: "Standard", title: `${standard.number} ${standard.title}`, description: standard.internalNotes, href: "/standards" })),
    ...data.skills.map((skill) => ({ type: "Skill", title: skill.name, description: skill.description, href: `/skills/${skill.id}` })),
    ...data.certifications.map((cert) => ({ type: "Certification", title: cert.name, description: cert.description, href: "/certifications" }))
  ];
  if (!query.trim()) return items.slice(0, 8);
  return new Fuse(items, { keys: ["title", "description", "type"], threshold: 0.35 }).search(query).map((result) => result.item);
}
