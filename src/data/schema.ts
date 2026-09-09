export type Role =
  | "LEARNER"
  | "MANAGER"
  | "AUTHOR"
  | "REVIEWER"
  | "COURSE_OWNER"
  | "COMPLIANCE_MANAGER"
  | "LEARNING_ADMIN"
  | "PLATFORM_ADMIN";

export type CourseStatus = "DRAFT" | "READY_FOR_REVIEW" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
export type AccessMode = "OPEN" | "RESTRICTED" | "ASSIGNMENT_ONLY" | "PRIVATE";
export type TrainingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "OVERDUE" | "EXPIRED";
export type EvidenceStatus = "CURRENT" | "INVALIDATED" | "REVIEW_SOON" | "NEEDS_REVIEW" | "EXPIRED";
export type ReviewStatus = "OPEN" | "RESOLVED";
export type QuestionType = "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "MATCHING" | "ORDERING" | "SHORT_ANSWER" | "SCENARIO" | "ACKNOWLEDGEMENT";

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization extends BaseRecord {
  name: string;
  slug: string;
  timezone: string;
  supportEmail: string;
  certificateOrgName: string;
  appSubtitle: string;
  accentColor: string;
}

export interface User extends BaseRecord {
  organizationId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  name: string;
  jobTitle: string;
  teamId?: string;
  status: "ACTIVE" | "DEACTIVATED";
  lastActiveAt?: string;
}

export interface UserRole extends BaseRecord {
  userId: string;
  role: Role;
}

export interface Team extends BaseRecord {
  organizationId: string;
  name: string;
  description: string;
  managerId?: string;
}

export interface TeamMember extends BaseRecord {
  teamId: string;
  userId: string;
}

export interface Group extends BaseRecord {
  organizationId: string;
  name: string;
  description: string;
}

export interface GroupMember extends BaseRecord {
  groupId: string;
  userId: string;
}

export interface Course extends BaseRecord {
  organizationId: string;
  slug: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  difficulty: string;
  estimatedMinutes: number;
  delivery?: string;
  language?: string;
  recurrence?: string;
  sequencing?: string;
  audienceDescription?: string;
  status: CourseStatus;
  currentVersionId?: string;
  draftVersionId?: string;
  accessMode: AccessMode;
  allowSelfEnrollment: boolean;
  showInCatalog: boolean;
  allowAccessRequests: boolean;
  requireManagerApproval: boolean;
  certificateEnabled: boolean;
  ownerId: string;
  icon: string;
  accent: string;
  coverVisual?: string;
  completionEvidence?: string[];
  completionDeadlineDays?: number;
  requireAllLessons?: boolean;
  requireFinalAssessment?: boolean;
  requireScenarios?: boolean;
  requireAcknowledgement?: boolean;
  requireManagerValidation?: boolean;
  finalAssessmentEnabled?: boolean;
  attemptsAllowed?: number;
  failedAttemptBehavior?: "RETRY_IMMEDIATELY" | "WAIT_24_HOURS" | "MANAGER_RESET_REQUIRED";
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  showAnswersAfterAttempt?: boolean;
  certificateName?: string;
  certificateExpirationMonths?: number;
  scheduledPublishAt?: string;
  publishedById?: string;
  archiveReason?: string;
  archivedAt?: string;
}

export interface CourseOwner extends BaseRecord {
  courseId: string;
  userId: string;
}

export interface CourseContributor extends BaseRecord {
  courseId: string;
  userId: string;
  role: Role;
}

export interface CourseAccessPolicy extends BaseRecord {
  courseId: string;
  mode: AccessMode;
}

export interface CourseAccessGrant extends BaseRecord {
  courseId: string;
  grantType: "USER" | "TEAM" | "GROUP" | "ROLE";
  grantId: string;
}

export interface CourseVersion extends BaseRecord {
  courseId: string;
  version: string;
  status: CourseStatus;
  summary: string;
  goal: string;
  publishedAt?: string;
  publishedById?: string;
  scheduledPublishAt?: string;
  versionNotes?: string;
  immutable: boolean;
  completionRules: string[];
}

export interface Module extends BaseRecord {
  courseVersionId: string;
  title: string;
  position: number;
}

export interface Lesson extends BaseRecord {
  moduleId: string;
  courseVersionId: string;
  title: string;
  slug: string;
  position: number;
  required: boolean;
  estimatedMinutes: number;
}

export interface ContentBlock extends BaseRecord {
  lessonId: string;
  type: string;
  title?: string;
  body?: string;
  data?: unknown;
  configuration?: unknown;
  required?: boolean;
  mappedObjectiveIds?: string[];
  mappedStandardReferenceIds?: string[];
  estimatedInteractionTime?: number;
  position: number;
}

export interface CourseResource extends BaseRecord {
  courseId: string;
  title: string;
  description: string;
  type: string;
  url?: string;
  visibility: "PUBLIC" | "ENROLLED" | "AUTHOR";
  blob?: Blob;
}

export interface LearningObjective extends BaseRecord {
  courseVersionId: string;
  text: string;
  position: number;
}

export interface Skill extends BaseRecord {
  organizationId: string;
  name: string;
  description: string;
  level: string;
  category?: string;
  relatedStandardIds?: string[];
  relatedCourseIds?: string[];
}

export interface CourseSkill extends BaseRecord {
  courseId: string;
  skillId: string;
  level: string;
}

export interface UserSkill extends BaseRecord {
  userId: string;
  skillId: string;
  level: string;
  points: number;
}

export interface Standard extends BaseRecord {
  organizationId: string;
  family: string;
  number: string;
  title: string;
  internalNotes: string;
  lastReviewedAt: string;
}

export interface StandardVersion extends BaseRecord {
  standardId: string;
  version: string;
  status: "ENFORCED" | "FUTURE_ENFORCEMENT" | "SUPERSEDED" | "DRAFT_INTERNAL_TRACKING";
  effectiveDate?: string;
  futureEnforcementDate?: string;
  supersedes?: string;
  notes: string;
}

export interface StandardReference extends BaseRecord {
  standardVersionId: string;
  label: string;
  url: string;
  source: string;
}

export interface CourseStandardMapping extends BaseRecord {
  courseId: string;
  standardVersionId: string;
  objectiveId?: string;
  requirementText?: string;
  trainingRelevance?: string;
  internalNotes?: string;
  evidenceExpectation: string;
}

export interface LearningPath extends BaseRecord {
  organizationId: string;
  title: string;
  description: string;
  slug: string;
  sequential: boolean;
  certificationId?: string;
}

export interface LearningPathCourse extends BaseRecord {
  learningPathId: string;
  courseId: string;
  required: boolean;
  position: number;
}

export interface LearningPathEnrollment extends BaseRecord {
  learningPathId: string;
  userId: string;
  progress: number;
  status: TrainingStatus;
}

export interface Assignment extends BaseRecord {
  organizationId: string;
  title: string;
  targetType: "COURSE" | "LEARNING_PATH" | "CERTIFICATION" | "PRACTICE" | "SCENARIO" | "CAMPAIGN";
  targetId: string;
  createdById: string;
  dueAt: string;
  assignedAt?: string;
  recurrence: "NONE" | "ANNUAL" | "MONTHS";
  recurrenceMonths?: number;
  notificationSettings?: Record<string, boolean>;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
}

export interface AssignmentAudience extends BaseRecord {
  assignmentId: string;
  audienceType: "USER" | "TEAM" | "GROUP" | "ROLE";
  audienceId: string;
}

export interface Enrollment extends BaseRecord {
  organizationId: string;
  userId: string;
  courseId: string;
  assignmentId?: string;
  status: TrainingStatus;
  startedAt?: string;
  lastAccessedAt?: string;
  currentLessonId?: string;
  completedAt?: string;
}

export interface LessonProgress extends BaseRecord {
  userId: string;
  lessonId: string;
  completedAt?: string;
  notes?: string;
}

export interface CourseProgress extends BaseRecord {
  userId: string;
  courseId: string;
  courseVersionId: string;
  status: TrainingStatus;
  percentComplete: number;
  completedAt?: string;
}

export interface Assessment extends BaseRecord {
  courseVersionId?: string;
  title: string;
  instructions: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes?: number;
  required: boolean;
}

export interface Question extends BaseRecord {
  type: QuestionType;
  prompt: string;
  explanation: string;
  difficulty: string;
  tags: string[];
}

export interface QuestionOption extends BaseRecord {
  questionId: string;
  text: string;
  isCorrect: boolean;
  position: number;
  match?: string;
}

export interface AssessmentQuestion extends BaseRecord {
  assessmentId: string;
  questionId: string;
  points: number;
  position: number;
}

export interface AssessmentAttempt extends BaseRecord {
  userId: string;
  assessmentId: string;
  courseId: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  attemptNumber: number;
  answers?: Record<string, unknown>;
  correctCount?: number;
  totalQuestions?: number;
  missedTopics?: string[];
}

export interface AssessmentAnswer extends BaseRecord {
  attemptId: string;
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  points: number;
}

export interface Scenario extends BaseRecord {
  organizationId: string;
  title: string;
  situation: string;
  learnerRole: string;
  context: string;
  associatedSkills: string[];
}

export interface ScenarioStep extends BaseRecord {
  scenarioId: string;
  prompt: string;
  choices: string[];
  correctChoice: number;
  feedback: string;
  position: number;
}

export interface ScenarioAttempt extends BaseRecord {
  scenarioId: string;
  userId: string;
  courseId?: string;
  courseVersionId?: string;
  lessonId?: string;
  score: number;
  answers: unknown;
  status?: "IN_PROGRESS" | "COMPLETED";
  lastStep?: number;
  completedAt?: string;
}

export interface Certification extends BaseRecord {
  organizationId: string;
  name: string;
  description: string;
  validityDays: number;
  renewalWindowDays: number;
  status: "ACTIVE" | "ARCHIVED";
}

export interface CertificationRequirement extends BaseRecord {
  certificationId: string;
  type: "COURSE" | "ASSESSMENT" | "MANAGER_VALIDATION";
  targetId: string;
}

export interface UserCertification extends BaseRecord {
  userId: string;
  certificationId: string;
  courseId?: string;
  courseVersionId?: string;
  certificateId: string;
  issuedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "REVOKED";
}

export interface Review extends BaseRecord {
  courseVersionId: string;
  status: "OPEN" | "APPROVED" | "CHANGES_REQUESTED";
  dueAt: string;
  submittedAt?: string;
  message?: string;
  requireAllReviewers?: boolean;
}

export interface ReviewAssignment extends BaseRecord {
  reviewId: string;
  userId: string;
}

export interface ReviewComment extends BaseRecord {
  reviewId: string;
  authorId: string;
  body: string;
  blockId?: string;
  location?: string;
  severity?: "SUGGESTION" | "REQUIRED_CHANGE" | "BLOCKING";
  blocking: boolean;
  status: ReviewStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: string[];
}

export interface Approval extends BaseRecord {
  reviewId: string;
  approverId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED";
  comment?: string;
}

export interface EvidenceRecord extends BaseRecord {
  organizationId: string;
  title?: string;
  evidenceType?: string;
  userId: string;
  userDisplayName: string;
  courseId: string;
  courseTitle: string;
  courseVersionId: string;
  assignmentId?: string;
  enrollmentId?: string;
  completedAt: string;
  assessmentScore?: number;
  certificationId?: string;
  certificateId?: string;
  acknowledgementText?: string;
  source?: string;
  standardRefs: string[];
  status: EvidenceStatus;
  invalidationReason?: string;
}

export interface Acknowledgement extends BaseRecord {
  userId: string;
  courseId?: string;
  courseVersionId: string;
  text: string;
  acknowledgementVersion?: string;
  submittedAt?: string;
  status?: "SUBMITTED";
}

export interface Notification extends BaseRecord {
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt?: string;
}

export interface AccessRequest extends BaseRecord {
  userId: string;
  courseId: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED";
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
}

export interface CourseFeedback extends BaseRecord {
  courseId: string;
  userId: string;
  usefulness: number;
  confidence: number;
  comment: string;
}

export interface AuditEvent extends BaseRecord {
  organizationId: string;
  actorId?: string;
  action: string;
  objectType: string;
  objectId: string;
  summary: string;
}

export interface ApplicationSettings extends BaseRecord {
  key: string;
  value: unknown;
}

export interface BackupMetadata extends BaseRecord {
  fileName: string;
  recordCounts: Record<string, number>;
}

export interface ActivityTimeline extends BaseRecord {
  objectType: string;
  objectId: string;
  actorId?: string;
  action: string;
  summary: string;
}

export interface PracticeActivity extends BaseRecord {
  title: string;
  subtitle?: string;
  description: string;
  activityType: "QUICK_CHALLENGE" | "KNOWLEDGE_REFRESH" | "EVIDENCE_CHALLENGE" | "DECISION_EXERCISE" | "CLASSIFICATION" | "SEQUENCE" | "SYSTEM_INSPECTION" | "NETWORK_INSPECTION" | "TIMELINE_REVIEW" | "MICROLEARNING";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  estimatedMinutes: number;
  difficulty: "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED";
  standardIds: string[];
  skillIds: string[];
  topicIds: string[];
  relatedCourseIds: string[];
  relatedLessonIds: string[];
  blocks: Array<Pick<ContentBlock, "id" | "type" | "title" | "body" | "data" | "required" | "position">>;
  scoringMode: "PRACTICE" | "SCORE" | "COMPETENCY";
  passingScore?: number;
  repeatable: boolean;
  recommendationWeight?: number;
}

export interface PracticeAttempt extends BaseRecord {
  practiceActivityId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
  passed?: boolean;
  responses: Array<{ blockId: string; response: unknown; correct?: boolean }>;
  topicResults: Array<{ topicId: string; result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG"; score?: number }>;
  durationSeconds?: number;
  source: "SELF_SELECTED" | "RECOMMENDED" | "ASSIGNED" | "REMEDIATION" | "REINFORCEMENT";
}

export interface SkillEvidence extends BaseRecord {
  userId: string;
  skillId: string;
  sourceType: "COURSE_ASSESSMENT" | "KNOWLEDGE_CHECK" | "SCENARIO" | "PRACTICE" | "MICROLEARNING";
  sourceId: string;
  observedAt: string;
  result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG";
  weight: number;
  details?: string;
}

export interface LearnerFollowUp extends BaseRecord {
  userId: string;
  title: string;
  description?: string;
  sourceType: "COURSE" | "SCENARIO" | "PRACTICE" | "MANUAL";
  sourceId?: string;
  dueAt?: string;
  completedAt?: string;
  visibility: "PRIVATE" | "SHARED_WITH_MANAGER";
}

export interface ReinforcementSchedule extends BaseRecord {
  userId: string;
  sourceCourseId: string;
  sourceCourseVersionId: string;
  skillIds: string[];
  topicIds: string[];
  events: ReinforcementEvent[];
}

export interface ReinforcementEvent {
  id: string;
  dueAt: string;
  type: "QUICK_RECALL" | "PRACTICE" | "SCENARIO" | "MICROLEARNING";
  activityId: string;
  state: "SCHEDULED" | "AVAILABLE" | "COMPLETED" | "SKIPPED";
  completedAt?: string;
}

export interface ScenarioDefinition extends BaseRecord {
  title: string;
  description: string;
  category: string;
  difficulty: "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED";
  estimatedMinutes: number;
  relatedCourseIds: string[];
  skillIds: string[];
  topicIds: string[];
  initialState: Record<string, unknown>;
  steps: ScenarioStepDefinition[];
  resultRules: Array<{ id: string; result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG"; minRecommendedChoices: number }>;
  repeatable: boolean;
  variantPool?: Array<Record<string, string>>;
}

export interface ScenarioStepDefinition {
  id: string;
  stepType: "INFORMATION" | "DECISION" | "INSPECTION" | "TIMELINE" | "CLASSIFICATION" | "REVEAL";
  title?: string;
  narrative: string;
  workspaceConfig?: Record<string, unknown>;
  choices?: ScenarioChoice[];
  visibleWhen?: Array<{ field: string; equals: unknown }>;
  stateChanges?: Array<{ field: string; value: unknown }>;
  skillMappings?: Array<{ skillId: string; principle: string }>;
}

export interface ScenarioChoice {
  id: string;
  label: string;
  description?: string;
  feedback: string;
  principleTags: string[];
  impact: Array<{ field: string; value: unknown }>;
  nextStepId?: string;
  quality: "RECOMMENDED" | "ACCEPTABLE" | "RISKY" | "INCORRECT";
}

export interface BranchingScenarioAttempt extends BaseRecord {
  userId: string;
  scenarioId: string;
  startedAt: string;
  completedAt?: string;
  currentStepId: string;
  currentState: Record<string, unknown>;
  decisions: Array<{ stepId: string; choiceId: string; quality: string; feedback: string; selectedAt: string }>;
  skillResults: Array<{ topicId: string; result: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG"; score?: number }>;
  overallResult: "NEEDS_REVIEW" | "DEVELOPING" | "STRONG";
  replayOfAttemptId?: string;
}

export interface LearningCampaign extends BaseRecord {
  title: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  audienceType: "USER" | "TEAM" | "GROUP" | "ROLE";
  audienceIds: string[];
  startAt: string;
  dueAt?: string;
  items: LearningCampaignItem[];
  createdByUserId: string;
}

export interface LearningCampaignItem {
  id: string;
  order: number;
  itemType: "COURSE" | "PRACTICE" | "SCENARIO" | "ACKNOWLEDGEMENT" | "LIVE_SESSION";
  targetId: string;
  required: boolean;
}

export interface LiveLearningSession extends BaseRecord {
  title: string;
  description: string;
  sessionType: "INSTRUCTOR_LED" | "TABLETOP";
  facilitatorUserId: string;
  scheduledAt: string;
  durationMinutes: number;
  participantUserIds: string[];
  scenarioId?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  attendance: Array<{ userId: string; attended: boolean; recordedAt?: string }>;
  notes?: string;
  outcome?: string;
}

export interface ContentFeedback extends BaseRecord {
  courseId?: string;
  courseVersionId?: string;
  lessonId?: string;
  activityId?: string;
  userId: string;
  feedbackType: "HELPFUL" | "CONFUSING" | "OUTDATED" | "BROKEN_ACTIVITY";
  comment?: string;
  status: "OPEN" | "REVIEWED";
}

export interface LearningPreference extends BaseRecord {
  userId: string;
  key: string;
  value: unknown;
}

export interface StandardChangeReview extends BaseRecord {
  standardId: string;
  oldVersion: string;
  newVersion: string;
  effectiveDate: string;
  summary: string;
  affectedCourseIds: string[];
  ownerId: string;
  dueAt: string;
  status: "IDENTIFIED" | "IMPACT_REVIEW" | "CONTENT_UPDATE_REQUIRED" | "IN_PROGRESS" | "APPROVED" | "COMPLETE";
}

export interface AppData {
  organizations: Organization[];
  users: User[];
  userRoles: UserRole[];
  teams: Team[];
  teamMembers: TeamMember[];
  groups: Group[];
  groupMembers: GroupMember[];
  courses: Course[];
  courseOwners: CourseOwner[];
  courseContributors: CourseContributor[];
  courseVersions: CourseVersion[];
  courseAccessPolicies: CourseAccessPolicy[];
  courseAccessGrants: CourseAccessGrant[];
  modules: Module[];
  lessons: Lesson[];
  contentBlocks: ContentBlock[];
  courseResources: CourseResource[];
  learningObjectives: LearningObjective[];
  skills: Skill[];
  courseSkills: CourseSkill[];
  userSkills: UserSkill[];
  standards: Standard[];
  standardVersions: StandardVersion[];
  standardReferences: StandardReference[];
  courseStandardMappings: CourseStandardMapping[];
  learningPaths: LearningPath[];
  learningPathCourses: LearningPathCourse[];
  learningPathEnrollments: LearningPathEnrollment[];
  assignments: Assignment[];
  assignmentAudiences: AssignmentAudience[];
  enrollments: Enrollment[];
  courseProgress: CourseProgress[];
  lessonProgress: LessonProgress[];
  assessments: Assessment[];
  questions: Question[];
  questionOptions: QuestionOption[];
  assessmentQuestions: AssessmentQuestion[];
  assessmentAttempts: AssessmentAttempt[];
  assessmentAnswers: AssessmentAnswer[];
  scenarios: Scenario[];
  scenarioSteps: ScenarioStep[];
  scenarioAttempts: ScenarioAttempt[];
  certifications: Certification[];
  certificationRequirements: CertificationRequirement[];
  userCertifications: UserCertification[];
  reviews: Review[];
  reviewAssignments: ReviewAssignment[];
  reviewComments: ReviewComment[];
  approvals: Approval[];
  evidenceRecords: EvidenceRecord[];
  acknowledgements: Acknowledgement[];
  notifications: Notification[];
  accessRequests: AccessRequest[];
  courseFeedback: CourseFeedback[];
  auditEvents: AuditEvent[];
  applicationSettings: ApplicationSettings[];
  backupMetadata: BackupMetadata[];
  activityTimeline: ActivityTimeline[];
  standardChangeReviews: StandardChangeReview[];
  practiceActivities: PracticeActivity[];
  practiceAttempts: PracticeAttempt[];
  skillEvidence: SkillEvidence[];
  learnerFollowUps: LearnerFollowUp[];
  reinforcementSchedules: ReinforcementSchedule[];
  scenarioDefinitions: ScenarioDefinition[];
  branchingScenarioAttempts: BranchingScenarioAttempt[];
  learningCampaigns: LearningCampaign[];
  liveLearningSessions: LiveLearningSession[];
  contentFeedbackItems: ContentFeedback[];
  learningPreferences: LearningPreference[];
}

export const tableNames = [
  "organizations",
  "users",
  "userRoles",
  "teams",
  "teamMembers",
  "groups",
  "groupMembers",
  "courses",
  "courseOwners",
  "courseContributors",
  "courseVersions",
  "courseAccessPolicies",
  "courseAccessGrants",
  "modules",
  "lessons",
  "contentBlocks",
  "courseResources",
  "learningObjectives",
  "skills",
  "courseSkills",
  "userSkills",
  "standards",
  "standardVersions",
  "standardReferences",
  "courseStandardMappings",
  "learningPaths",
  "learningPathCourses",
  "learningPathEnrollments",
  "assignments",
  "assignmentAudiences",
  "enrollments",
  "courseProgress",
  "lessonProgress",
  "assessments",
  "questions",
  "questionOptions",
  "assessmentQuestions",
  "assessmentAttempts",
  "assessmentAnswers",
  "scenarios",
  "scenarioSteps",
  "scenarioAttempts",
  "certifications",
  "certificationRequirements",
  "userCertifications",
  "reviews",
  "reviewAssignments",
  "reviewComments",
  "approvals",
  "evidenceRecords",
  "acknowledgements",
  "notifications",
  "accessRequests",
  "courseFeedback",
  "auditEvents",
  "applicationSettings",
  "backupMetadata",
  "activityTimeline",
  "standardChangeReviews",
  "practiceActivities",
  "practiceAttempts",
  "skillEvidence",
  "learnerFollowUps",
  "reinforcementSchedules",
  "scenarioDefinitions",
  "branchingScenarioAttempts",
  "learningCampaigns",
  "liveLearningSessions",
  "contentFeedbackItems",
  "learningPreferences"
] as const;

export type TableName = (typeof tableNames)[number];
