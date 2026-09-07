import { addDays, addMonths, differenceInHours } from "date-fns";
import Fuse from "fuse.js";
import { exportBackup, getAllData, id, importBackup, initializeDatabase, now, putRecord, replaceAllData } from "../data/db";
import { createSeedData } from "../data/seed";
import type {
  AccessRequest,
  AppData,
  Assignment,
  AuditEvent,
  ContentBlock,
  Course,
  CourseAccessGrant,
  CourseStatus,
  CourseVersion,
  Enrollment,
  Lesson,
  Module,
  Notification,
  Question,
  QuestionOption,
  Role,
  User
} from "../data/schema";

export interface Session {
  sessionId: string;
  userId: string;
  organizationId: string;
  loginAt: string;
  lastActivityAt: string;
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
    hasAnyRole(data, userId, ["AUTHOR"]) ||
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

export class AuthService {
  static async boot() {
    await initializeDatabase();
    return getAllData();
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
    const session: Session = { sessionId: id("session"), userId: user.id, organizationId: user.organizationId, loginAt: now(), lastActivityAt: now() };
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
    const session: Session = { sessionId: id("session"), userId: user.id, organizationId: user.organizationId, loginAt: now(), lastActivityAt: now() };
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

  async publishCourse(courseId: string) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const version = this.data.courseVersions.find((item) => item.id === course.currentVersionId)!;
    course.status = "PUBLISHED";
    course.updatedAt = now();
    version.status = "PUBLISHED";
    version.immutable = true;
    version.publishedAt = now();
    audit(this.data, this.actorId, "COURSE_PUBLISHED", "Course", course.id, `Published ${course.title}.`);
    await this.persist();
  }

  async assignCourse(courseId: string, userId: string, dueAt: string) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const assignment: Assignment = { id: id("assign"), organizationId: this.data.organizations[0].id, title: `Assigned ${course.title}`, targetType: "COURSE", targetId: courseId, createdById: this.actorId, dueAt, recurrence: "NONE", status: "ACTIVE", createdAt: now(), updatedAt: now() };
    this.data.assignments.push(assignment);
    this.data.assignmentAudiences.push({ id: id("aud"), assignmentId: assignment.id, audienceType: "USER", audienceId: userId, createdAt: now(), updatedAt: now() });
    this.data.enrollments.push({ id: id("enroll"), organizationId: this.data.organizations[0].id, userId, courseId, assignmentId: assignment.id, status: "NOT_STARTED", createdAt: now(), updatedAt: now() });
    notify(this.data, userId, "COURSE_ASSIGNED", "Training assigned", `${course.title} is assigned to you.`, `/courses/${courseId}`);
    audit(this.data, this.actorId, "ASSIGNMENT_CREATED", "Assignment", assignment.id, `Assigned ${course.title}.`);
    await this.persist();
    return assignment;
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

  async completeLesson(courseId: string, lessonId: string) {
    if (!this.data.lessonProgress.some((item) => item.userId === this.actorId && item.lessonId === lessonId)) {
      this.data.lessonProgress.push({ id: id("lp"), userId: this.actorId, lessonId, completedAt: now(), createdAt: now(), updatedAt: now() });
    }
    const enrollment = this.ensureEnrollment(courseId);
    enrollment.status = "IN_PROGRESS";
    enrollment.lastAccessedAt = now();
    enrollment.currentLessonId = lessonId;
    this.recalculateCourseProgress(courseId);
    await this.persist();
  }

  async submitAssessment(courseId: string, answers: Record<string, unknown>) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const assessment = this.data.assessments.find((item) => item.courseVersionId === course.currentVersionId)!;
    const assessmentQuestions = this.data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id);
    let correct = 0;
    for (const link of assessmentQuestions) {
      const options = this.data.questionOptions.filter((option) => option.questionId === link.questionId);
      const answer = answers[link.questionId];
      const isCorrect = evaluateAnswer(options, answer);
      if (isCorrect) correct += 1;
    }
    const score = Math.round((correct / assessmentQuestions.length) * 100);
    const passed = score >= assessment.passingScore;
    const attempt = { id: id("attempt"), userId: this.actorId, assessmentId: assessment.id, courseId, score, passed, submittedAt: now(), attemptNumber: this.data.assessmentAttempts.filter((item) => item.userId === this.actorId && item.assessmentId === assessment.id).length + 1, createdAt: now(), updatedAt: now() };
    this.data.assessmentAttempts.push(attempt);
    audit(this.data, this.actorId, "ASSESSMENT_SUBMITTED", "Assessment", assessment.id, `Submitted assessment with score ${score}%.`);
    if (passed) this.completeCourse(courseId, score);
    await this.persist();
    return attempt;
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
    const lessons = this.data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId && lesson.required);
    const completed = lessons.filter((lesson) => this.data.lessonProgress.some((progress) => progress.userId === this.actorId && progress.lessonId === lesson.id)).length;
    const percentComplete = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
    let progress = this.data.courseProgress.find((item) => item.userId === this.actorId && item.courseId === courseId);
    if (!progress) {
      progress = { id: id("cp"), userId: this.actorId, courseId, courseVersionId: course.currentVersionId!, status: "IN_PROGRESS", percentComplete, createdAt: now(), updatedAt: now() };
      this.data.courseProgress.push(progress);
    }
    progress.percentComplete = percentComplete;
    progress.updatedAt = now();
  }

  private completeCourse(courseId: string, score: number) {
    const course = this.data.courses.find((item) => item.id === courseId)!;
    const version = this.data.courseVersions.find((item) => item.id === course.currentVersionId)!;
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
      certificateId = `GG-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      const certificationId = requirement?.certificationId ?? this.createAdHocCertification(course);
      this.data.userCertifications.push({ id: id("ucert"), userId: this.actorId, certificationId, courseId, certificateId, issuedAt: now(), expiresAt: addDays(new Date(), 365).toISOString(), status: "ACTIVE", createdAt: now(), updatedAt: now() });
      notify(this.data, this.actorId, "CERTIFICATE_EARNED", "Certificate earned", `${course.title} certificate is ready.`, "/certifications");
      audit(this.data, this.actorId, "CERTIFICATE_ISSUED", "Course", courseId, `Issued certificate for ${course.title}.`);
    }
    const assignment = this.data.enrollments.find((item) => item.userId === this.actorId && item.courseId === courseId)?.assignmentId;
    this.data.evidenceRecords.push({ id: id("evidence"), organizationId: this.data.organizations[0].id, userId: this.actorId, userDisplayName: user.name, courseId, courseTitle: course.title, courseVersionId: version.id, assignmentId: assignment, completedAt: now(), assessmentScore: score, certificationId: requirement?.certificationId, certificateId, acknowledgementText: "Learner completed required training and acknowledgement.", standardRefs: this.data.courseStandardMappings.filter((mapping) => mapping.courseId === courseId).map((mapping) => mapping.standardVersionId), status: "CURRENT", createdAt: now(), updatedAt: now() });
    audit(this.data, this.actorId, "COURSE_COMPLETED", "Course", courseId, `Completed ${course.title}.`);
  }

  private createAdHocCertification(course: Course) {
    const cert = { id: id("cert"), organizationId: this.data.organizations[0].id, name: `${course.title} Certificate`, description: `Certificate for ${course.title}`, validityDays: 365, renewalWindowDays: 30, status: "ACTIVE" as const, createdAt: now(), updatedAt: now() };
    this.data.certifications.push(cert);
    this.data.certificationRequirements.push({ id: id("certreq"), certificationId: cert.id, type: "COURSE", targetId: course.id, createdAt: now(), updatedAt: now() });
    return cert.id;
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

export function searchAuthorized(data: AppData, userId: string, query: string) {
  const items = [
    ...data.courses
      .filter((course) => canAccessCourse(data, userId, course.id).allowed || canAccessCourse(data, userId, course.id).discoverable)
      .map((course) => ({ type: "Course", title: course.title, description: course.shortDescription, href: `/courses/${course.id}` })),
    ...data.learningPaths.map((path) => ({ type: "Learning Path", title: path.title, description: path.description, href: "/learning-paths" })),
    ...data.standards.map((standard) => ({ type: "Standard", title: `${standard.number} ${standard.title}`, description: standard.internalNotes, href: "/standards" })),
    ...data.skills.map((skill) => ({ type: "Skill", title: skill.name, description: skill.description, href: "/skills" })),
    ...data.certifications.map((cert) => ({ type: "Certification", title: cert.name, description: cert.description, href: "/certifications" }))
  ];
  if (!query.trim()) return items.slice(0, 8);
  return new Fuse(items, { keys: ["title", "description", "type"], threshold: 0.35 }).search(query).map((result) => result.item);
}
