import { addDays, subDays } from "date-fns";
import type {
  ActivityVariantDefinition,
  AppData,
  CourseExperienceProfile,
  CourseMission,
  InvestigationDefinition,
  LearningAssignmentBundle,
  LearningProgram,
  LearningResource,
  PracticeActivity,
  ScenarioDefinition,
  Skill,
  SkillCoachingGuide,
  TrainingWorldEvent
} from "./schema";
import { northValleyArtifacts, northValleyDiagrams, northValleyScenarioSeries, northValleyWorld } from "./training-world/northValleyEnergy";

const demoNow = new Date("2026-09-09T16:00:00.000Z");

function iso(date: Date) {
  return date.toISOString();
}

function stamp<T extends { id: string }>(item: T): T & { createdAt: string; updatedAt: string } {
  const createdAt = iso(subDays(demoNow, 21));
  return { createdAt, updatedAt: createdAt, ...item };
}

const skillDefs = [
  ["skill-personnel-security", "Personnel Security", "Recognize personnel changes, training expectations, and access responsibilities.", "Access & Personnel"],
  ["skill-access-management", "Access Management", "Keep access aligned with approved need, ownership, and role changes.", "Access & Personnel"],
  ["skill-electronic-access", "Electronic Access", "Understand controlled electronic access paths and remote access decisions.", "Cybersecurity Operations"],
  ["skill-physical-access", "Physical Access", "Apply badge, visitor, controlled-entry, and facility access expectations.", "Access & Personnel"],
  ["skill-system-hardening", "System Hardening", "Review services, configurations, and system security posture.", "Cybersecurity Operations"],
  ["skill-patch-management", "Patch Management", "Evaluate patch applicability, constraints, decisions, and evidence.", "Cybersecurity Operations"],
  ["skill-malicious-code", "Malicious-Code Response", "Respond to malicious-code alerts without destroying useful context.", "Cybersecurity Operations"],
  ["skill-account-management", "Account Management", "Review account ownership, privilege, expiration, and accountability.", "Cybersecurity Operations"],
  ["skill-vulnerability", "Vulnerability Management", "Evaluate, assign, remediate, verify, and document vulnerability findings.", "Cybersecurity Operations"],
  ["skill-incident-recognition", "Incident Recognition", "Recognize suspicious events and escalate factual observations.", "Incident & Monitoring"],
  ["skill-incident-response", "Incident Response", "Coordinate response, preserve information, and avoid unsupported conclusions.", "Incident & Monitoring"],
  ["skill-recovery", "Recovery Planning", "Identify dependencies, executable procedures, exercises, and recovery evidence.", "Risk & Recovery"],
  ["skill-configuration", "Configuration Management", "Manage baselines, controlled changes, drift, and change evidence.", "Risk & Recovery"],
  ["skill-information-protection", "Information Protection", "Recognize, handle, share, retain, and dispose of sensitive information.", "Cybersecurity Operations"],
  ["skill-control-center-comms", "Control-Center Communications", "Understand protected communication paths, ownership, and validation.", "Incident & Monitoring"],
  ["skill-supply-chain", "Supply Chain Security", "Evaluate vendor access, product security, relationship changes, and exit.", "Risk & Recovery"],
  ["skill-physical-risk", "Physical Risk Management", "Connect threat, vulnerability, consequence, mitigation, and ownership.", "Risk & Recovery"],
  ["skill-network-monitoring", "Network Monitoring", "Use internal visibility to recognize unexpected traffic and coverage gaps.", "Incident & Monitoring"],
  ["skill-evidence-quality", "Evidence Quality", "Build records that connect who, what, when, result, and process.", "Compliance & Evidence"],
  ["skill-control-ownership", "Control Ownership", "Clarify accountability, delegation, exceptions, and oversight.", "Compliance & Evidence"],
  ["skill-audit-readiness", "Audit Readiness", "Evaluate packages, gaps, populations, samples, and factual narratives.", "Compliance & Evidence"]
] as const;

const practiceDefs: Array<Pick<PracticeActivity, "id" | "title" | "activityType" | "description" | "estimatedMinutes" | "difficulty" | "skillIds" | "topicIds" | "relatedCourseIds" | "blocks">> = [
  practice("practice-unexpected-mfa", "Unexpected MFA", "QUICK_CHALLENGE", "Decide what to do when an approval request appears during unrelated work.", 3, "FOUNDATIONAL", ["skill-access-management"], "course-annual-awareness", "You receive an MFA approval request from Chicago while working in San Diego.", ["Approve", "Deny and report", "Ignore it"], 1),
  practice("practice-tailgating-entry", "Tailgating at Controlled Entry", "DECISION_EXERCISE", "Respond to a familiar person asking you to bypass controlled entry.", 4, "FOUNDATIONAL", ["skill-physical-access"], "course-cip006-physical-security", "A familiar technician carrying equipment asks you to hold a controlled door.", ["Hold the door", "Use the approved access or visitor process", "Loan your badge"], 1),
  practice("practice-access-approval-quality", "Strong vs Weak Access Approval", "EVIDENCE_CHALLENGE", "Choose fields that make an access approval useful later.", 5, "INTERMEDIATE", ["skill-access-management", "skill-evidence-quality"], "course-cip004-supervisor-workshop", "Build a traceable temporary access approval.", ["User", "System", "Purpose", "Privilege", "Approver", "Start/end", "Favorite color"], 0),
  practice("practice-expired-temp-admin", "Expired Temporary Admin", "SYSTEM_INSPECTION", "Inspect a short account table and identify the privilege that needs review.", 5, "INTERMEDIATE", ["skill-account-management"], "course-cip007-system-security", "Temporary administrator access passed its end date.", ["Keep it", "Review/remove through approved process", "Share it"], 1),
  practice("practice-suspicious-remote-connection", "Suspicious Remote Connection", "TIMELINE_REVIEW", "Separate facts from assumptions and choose an escalation path.", 6, "INTERMEDIATE", ["skill-incident-recognition", "skill-network-monitoring"], "course-cip008-incident-response", "An unexpected remote connection appears at 02:12 with no visible maintenance.", ["Declare final incident", "Preserve facts and escalate", "Delete record"], 1),
  practice("practice-patch-constraint", "Patch Evaluation Constraint", "SEQUENCE", "Order a controlled patch decision when operational constraints exist.", 6, "INTERMEDIATE", ["skill-patch-management"], "course-cip007-system-security", "A security patch applies, but immediate install conflicts with operating constraints.", ["Ignore", "Evaluate, plan or mitigate, verify, document", "Install without review"], 1),
  practice("practice-missing-evidence", "Missing Evidence", "EVIDENCE_CHALLENGE", "Identify gaps that prevent another reviewer from reconstructing a control activity.", 5, "INTERMEDIATE", ["skill-evidence-quality", "skill-audit-readiness"], "course-audit-preparation", "A package has samples, but one approval and a population reconciliation are missing.", ["Mark ready", "Identify and route gaps", "Rewrite old records"], 1),
  practice("practice-vendor-permanent-admin", "Vendor Permanent Admin Request", "DECISION_EXERCISE", "Evaluate a vendor convenience request for persistent elevated access.", 5, "INTERMEDIATE", ["skill-supply-chain", "skill-electronic-access"], "course-cip013-supply-chain", "A vendor asks for a permanent shared domain administrator account.", ["Approve for speed", "Route through security/access review", "Email the password"], 1),
  practice("practice-recovery-dependency-gap", "Recovery Dependency Gap", "MICROLEARNING", "Spot missing identity and storage dependencies in a recovery plan.", 5, "INTERMEDIATE", ["skill-recovery"], "course-cip009-recovery-planning", "A recovery procedure references retired storage and omits identity dependency.", ["Use anyway", "Escalate/update and validate", "Delete procedure"], 1),
  practice("practice-configuration-drift", "Configuration Drift", "SYSTEM_INSPECTION", "Determine how to handle a configuration difference after maintenance.", 6, "ADVANCED", ["skill-configuration"], "course-cip010-change-vulnerability", "A post-maintenance review finds a service setting not listed in the approved change.", ["Preserve and verify authorization", "Assume compromise", "Ignore"], 0),
  practice("practice-wrong-recipient", "Wrong Recipient", "DECISION_EXERCISE", "Choose a responsible response to sensitive information sent to the wrong person.", 4, "FOUNDATIONAL", ["skill-information-protection"], "course-cip011-information-protection", "A sensitive configuration export was emailed to an unintended recipient.", ["Silently delete sent copy", "Follow reporting/handling process", "Forward it wider"], 1),
  practice("practice-monitoring-blind-spot", "Monitoring Blind Spot", "NETWORK_INSPECTION", "Identify visibility gaps in a simple internal monitoring map.", 6, "ADVANCED", ["skill-network-monitoring"], "course-cip015-insm", "A network coverage map shows a critical segment with no visibility owner.", ["Track and review the blind spot", "Ignore until incident", "Disable monitoring"], 0)
];

function practice(id: string, title: string, activityType: PracticeActivity["activityType"], description: string, estimatedMinutes: number, difficulty: PracticeActivity["difficulty"], skillIds: string[], relatedCourseId: string, prompt: string, options: string[], correct: number) {
  return {
    id,
    title,
    activityType,
    description,
    estimatedMinutes,
    difficulty,
    skillIds,
    topicIds: skillIds,
    relatedCourseIds: [relatedCourseId],
    blocks: [
      { id: `${id}-brief`, type: "paragraph", title: "Situation", body: prompt, position: 1 },
      { id: `${id}-decision`, type: "decision_cards", title: "Choose the response", body: "Select the action that best supports the approved process.", position: 2, required: true, data: { question: prompt, options, correct, feedback: options.map((option, index) => index === correct ? `${option}: recommended. This keeps the activity controlled and traceable.` : `${option}: this can leave risk, missing evidence, or an unsupported process.`) } }
    ]
  };
}

export function addLearningIntelligenceSeed(data: AppData) {
  const organizationId = data.organizations[0]?.id;
  if (!organizationId) return data;

  for (const [id, name, description, category] of skillDefs) {
    const existing = data.skills.find((skill) => skill.id === id || skill.name === name);
    if (existing) {
      existing.id = id;
      existing.category = category;
      existing.description = description;
      existing.level = "Shared Skill";
    } else {
      data.skills.push(stamp({ id, organizationId, name, description, category, level: "Shared Skill", relatedStandardIds: [], relatedCourseIds: [] }));
    }
  }

  const existingPractice = new Set(data.practiceActivities.map((activity) => activity.id));
  practiceDefs.forEach((definition) => {
    if (!existingPractice.has(definition.id)) {
      data.practiceActivities.push(stamp({
        ...definition,
        subtitle: `${definition.estimatedMinutes} minute ${definition.activityType.toLowerCase().replaceAll("_", " ")}`,
        status: "PUBLISHED",
        standardIds: [],
        relatedLessonIds: [],
        scoringMode: "COMPETENCY",
        passingScore: 80,
        repeatable: true,
        recommendationWeight: 1,
        supportModes: ["GUIDED", "STANDARD", "CHALLENGE"],
        progressionTrackId: definition.skillIds[0],
        progressionLevel: definition.activityType === "MICROLEARNING" ? "LEARN" : "PRACTICE"
      }));
    } else {
      const activity = data.practiceActivities.find((item) => item.id === definition.id);
      if (activity) {
        activity.supportModes = activity.supportModes ?? ["GUIDED", "STANDARD", "CHALLENGE"];
        activity.progressionTrackId = activity.progressionTrackId ?? activity.skillIds[0];
        activity.progressionLevel = activity.progressionLevel ?? (activity.activityType === "MICROLEARNING" ? "LEARN" : "PRACTICE");
      }
    }
  });

  const scenarioDefs = buildScenarios();
  const existingScenarios = new Set(data.scenarioDefinitions.map((scenario) => scenario.id));
  scenarioDefs.forEach((scenario) => {
    if (!existingScenarios.has(scenario.id)) {
      data.scenarioDefinitions.push(stamp(scenario));
    } else {
      const existing = data.scenarioDefinitions.find((item) => item.id === scenario.id);
      if (existing) {
        existing.objectives = existing.objectives ?? scenario.objectives;
        existing.workspaceType = existing.workspaceType ?? scenario.workspaceType;
      }
    }
  });

  const userByEmail = (email: string) => data.users.find((user) => user.email === email);
  const taylor = userByEmail("learner@gridguard.local");
  const jamie = userByEmail("jamie.rivera@gridguard.local");
  const alex = userByEmail("alex.harper@gridguard.local");
  const samira = userByEmail("samira.khan@gridguard.local");
  const devon = userByEmail("devon.stone@gridguard.local");
  const priya = userByEmail("priya.shah@gridguard.local");
  const morgan = userByEmail("manager@gridguard.local");

  const evidence = [
    [taylor?.id, "skill-evidence-quality", "PRACTICE", "practice-missing-evidence", "STRONG", 2, "Evidence Quality Challenge"],
    [taylor?.id, "skill-access-management", "PRACTICE", "practice-unexpected-mfa", "STRONG", 2, "Unexpected MFA"],
    [jamie?.id, "skill-patch-management", "COURSE_ASSESSMENT", "course-cip007-system-security", "DEVELOPING", 3, "CIP-007 patch topic"],
    [jamie?.id, "skill-account-management", "COURSE_ASSESSMENT", "course-cip007-system-security", "STRONG", 3, "CIP-007 account topic"],
    [alex?.id, "skill-access-management", "PRACTICE", "practice-unexpected-mfa", "DEVELOPING", 2, "Unexpected MFA"],
    [samira?.id, "skill-physical-risk", "SCENARIO", "scenario-facility-construction-risk", "DEVELOPING", 3, "Facility construction risk"],
    [devon?.id, "skill-configuration", "SCENARIO", "scenario-unauthorized-configuration-difference", "STRONG", 3, "Configuration drift"],
    [priya?.id, "skill-audit-readiness", "SCENARIO", "scenario-audit-evidence-package", "STRONG", 3, "Audit package"],
    [morgan?.id, "skill-control-ownership", "COURSE_ASSESSMENT", "course-cip004-supervisor-workshop", "STRONG", 3, "Supervisor workshop"]
  ] as const;
  const existingSkillEvidence = new Set(data.skillEvidence.map((item) => item.id));
  evidence.forEach(([userId, skillId, sourceType, sourceId, result, weight, details], index) => {
    if (!userId) return;
    const id = `skillevidence-seed-${index + 1}`;
    if (!existingSkillEvidence.has(id)) data.skillEvidence.push(stamp({ id, userId, skillId, sourceType, sourceId, observedAt: iso(subDays(demoNow, 8 + index)), result, weight, details }));
  });

  if (taylor && !data.practiceAttempts.some((attempt) => attempt.id === "practiceattempt-taylor-evidence")) {
    data.practiceAttempts.push(stamp({ id: "practiceattempt-taylor-evidence", practiceActivityId: "practice-missing-evidence", userId: taylor.id, startedAt: iso(subDays(demoNow, 7)), completedAt: iso(subDays(demoNow, 7)), score: 100, passed: true, responses: [{ blockId: "practice-missing-evidence-decision", response: 1, correct: true }], topicResults: [{ topicId: "skill-evidence-quality", result: "STRONG", score: 100 }], durationSeconds: 260, source: "RECOMMENDED" as const }));
  }

  if (taylor && !data.reinforcementSchedules.some((schedule) => schedule.id === "reinforcement-taylor-cip004")) {
    const course = data.courses.find((item) => item.id === "course-cip004-annual-refresher");
    data.reinforcementSchedules.push(stamp({
      id: "reinforcement-taylor-cip004",
      userId: taylor.id,
      sourceCourseId: course?.id ?? "course-cip004-annual-refresher",
      sourceCourseVersionId: course?.currentVersionId ?? "course-cip004-annual-refresher-v1",
      skillIds: ["skill-personnel-security", "skill-access-management", "skill-evidence-quality"],
      topicIds: ["personnel", "access", "evidence"],
      events: [
        { id: "reinforcement-taylor-cip004-14", dueAt: iso(subDays(demoNow, 1)), type: "PRACTICE", activityId: "practice-missing-evidence", state: "AVAILABLE" },
        { id: "reinforcement-taylor-cip004-45", dueAt: iso(addDays(demoNow, 30)), type: "SCENARIO", activityId: "scenario-jordan-role-change-lab", state: "SCHEDULED" }
      ]
    }));
  }

  if (morgan && !data.learningCampaigns.some((campaign) => campaign.id === "campaign-q4-cyber-readiness")) {
    const operations = data.teams.find((team) => team.name.includes("Operations"));
    data.learningCampaigns.push(stamp({
      id: "campaign-q4-cyber-readiness",
      title: "Q4 Cybersecurity Readiness",
      description: "A focused mix of awareness, MFA practice, and incident decision-making.",
      status: "ACTIVE" as const,
      audienceType: "TEAM" as const,
      audienceIds: operations ? [operations.id] : [],
      startAt: iso(demoNow),
      dueAt: iso(addDays(demoNow, 45)),
      createdByUserId: morgan.id,
      items: [
        { id: "campaign-q4-awareness", order: 1, itemType: "COURSE", targetId: "course-annual-awareness", required: true },
        { id: "campaign-q4-mfa", order: 2, itemType: "PRACTICE", targetId: "practice-unexpected-mfa", required: true },
        { id: "campaign-q4-admin-connection", order: 3, itemType: "SCENARIO", targetId: "scenario-unexpected-admin-connection", required: true }
      ]
    }));
  }

  addLearningExperience3Seed(data);
  addLearningExperience4Seed(data);
  addLearningExperience5Seed(data);
  applyLearningExperience6Remediation(data);

  if (!data.applicationSettings.some((setting) => setting.key === "learningIntelligenceVersion")) {
    data.applicationSettings.push(stamp({ id: "setting_learning_intelligence_version", key: "learningIntelligenceVersion", value: 1 }));
  }
  const experienceSetting = data.applicationSettings.find((setting) => setting.key === "learningExperienceVersion");
  if (experienceSetting) {
    experienceSetting.value = 6;
    experienceSetting.updatedAt = iso(demoNow);
  } else {
    data.applicationSettings.push(stamp({ id: "setting_learning_experience_version", key: "learningExperienceVersion", value: 6 }));
  }

  return data;
}

function addLearningExperience5Seed(data: AppData) {
  northValleyStoryEvents().forEach((event) => upsertById(data.trainingWorldEvents, stamp(event)));
  courseExperienceProfiles().forEach((profile) => upsertById(data.courseExperienceProfiles, stamp(profile)));
  courseMissionSeeds(data).forEach((mission) => upsertById(data.courseMissions, stamp(mission)));
  investigationSeeds().forEach((investigation) => upsertById(data.investigationDefinitions, stamp(investigation)));
  activityVariantSeeds().forEach((variant) => upsertById(data.activityVariants, stamp(variant)));
  learningProgramSeeds().forEach((program) => upsertById(data.learningPrograms, stamp(program)));
  assignmentBundleSeeds().forEach((bundle) => upsertById(data.learningAssignmentBundles, stamp(bundle)));
  coachingGuideSeeds().forEach((guide) => upsertById(data.skillCoachingGuides, stamp(guide)));

  buildCapstoneScenarios().forEach((scenario) => upsertById(data.scenarioDefinitions, stamp(scenario)));
  attachCoursePreAssessments(data);
}

function applyLearningExperience6Remediation(data: AppData) {
  publishLearnerCourse(data, "course-cip005-esp-access");
  publishLearnerCourse(data, "course-cip008-incident-response");
  rewriteFormulaicAssessmentPrompts(data);
}

function publishLearnerCourse(data: AppData, courseId: string) {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course || course.status === "DRAFT" || course.status === "ARCHIVED") return;
  course.status = "PUBLISHED";
  course.accessMode = "OPEN";
  course.showInCatalog = true;
  course.allowSelfEnrollment = true;
  course.updatedAt = iso(demoNow);
  data.courseVersions
    .filter((version) => version.courseId === courseId && version.id === course.currentVersionId)
    .forEach((version) => {
      version.status = "PUBLISHED";
      version.immutable = true;
      version.publishedAt = version.publishedAt ?? iso(subDays(demoNow, 5));
      version.updatedAt = iso(demoNow);
    });
}

function rewriteFormulaicAssessmentPrompts(data: AppData) {
  const seenByAssessment = new Map<string, Set<string>>();
  data.assessmentQuestions
    .slice()
    .sort((left, right) => left.position - right.position)
    .forEach((link) => {
      const question = data.questions.find((item) => item.id === link.questionId);
      if (!question) return;
      question.prompt = rewritePrompt(question.prompt);
      const seen = seenByAssessment.get(link.assessmentId) ?? new Set<string>();
      const normalized = normalizePrompt(question.prompt);
      if (seen.has(normalized)) {
        question.prompt = `${question.prompt} Focus on the next best documented action.`;
      }
      seen.add(normalizePrompt(question.prompt));
      seenByAssessment.set(link.assessmentId, seen);
      question.updatedAt = iso(demoNow);
    });
}

function rewritePrompt(prompt: string) {
  const lessonMatch = prompt.match(/^In (CIP-\d{3}|CIP-\d{3} incident-response) lesson \d+, (.+?): what is the strongest learner action\?$/i);
  if (lessonMatch) {
    const standard = lessonMatch[1].replace(" incident-response", "");
    const title = lessonMatch[2];
    if (/evidence|record/i.test(title)) return `Which action creates a traceable record for "${title}"?`;
    if (/access|authorization|privilege/i.test(title)) return `What best supports accountable access decisions in "${title}"?`;
    if (/change|configuration|baseline|drift/i.test(title)) return `What keeps the work in "${title}" controlled and reviewable?`;
    if (/vendor|supplier|contract/i.test(title)) return `What is the strongest supplier-risk action in "${title}"?`;
    if (/incident|alert|timeline|facts/i.test(title)) return `What should the learner do with the facts presented in "${title}"?`;
    if (/recovery|backup|exercise/i.test(title)) return `What makes the recovery activity in "${title}" dependable?`;
    return `What best applies the ${standard} concept taught in "${title}"?`;
  }
  const incidentMatch = prompt.match(/^In CIP-008 incident-response lesson \d+, what should the learner do with the facts presented in (.+?)\?$/i);
  if (incidentMatch) return `What should a responder do first when the facts in "${incidentMatch[1]}" are still incomplete?`;
  return prompt;
}

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function northValleyStoryEvents(): Array<Omit<TrainingWorldEvent, "createdAt" | "updatedAt">> {
  const at = (day: number) => iso(subDays(demoNow, 24 - day));
  return [
    {
      id: "world-event-jordan-role-change",
      worldId: "world-north-valley-energy",
      title: "Jordan Changes Roles",
      description: "Jordan Lee transfers from Control Center Operations to Business Planning.",
      occurredAt: at(1),
      entityIds: ["person-jordan-lee", "person-morgan-chen", "facility-nv-control-center"],
      relatedCourseIds: ["course-cip004-annual-refresher", "course-cip004-foundations"],
      relatedScenarioIds: ["scenario-jordan-role-change-lab"],
      eventType: "PERSONNEL_CHANGE"
    },
    {
      id: "world-event-old-access-persists",
      worldId: "world-north-valley-energy",
      title: "Old Access Persists",
      description: "Jordan retains access that no longer clearly aligns with current responsibilities.",
      occurredAt: at(2),
      entityIds: ["person-jordan-lee", "system-ops-srv-12"],
      relatedCourseIds: ["course-cip004-annual-refresher", "course-cip005-esp-access"],
      relatedScenarioIds: ["scenario-jordan-role-change-lab"],
      eventType: "ACCESS_CHANGE"
    },
    {
      id: "world-event-vendor-temporary-access",
      worldId: "world-north-valley-energy",
      title: "Vendor Temporary Access Remains Active",
      description: "GridTech temporary access remains available after the expected support window.",
      occurredAt: at(3),
      entityIds: ["vendor-gridtech-services", "system-ops-srv-12"],
      relatedCourseIds: ["course-cip005-esp-access", "course-cip013-supply-chain"],
      relatedScenarioIds: ["scenario-emergency-vendor-access", "scenario-vendor-permanent-admin"],
      eventType: "VENDOR_EVENT"
    },
    {
      id: "world-event-ops-srv-12-drift",
      worldId: "world-north-valley-energy",
      title: "OPS-SRV-12 Shows Security Drift",
      description: "Legacy FTP, temporary RDP, a patch constraint, and expired temporary admin access converge on OPS-SRV-12.",
      occurredAt: at(4),
      entityIds: ["system-ops-srv-12", "person-jamie-rivera"],
      relatedCourseIds: ["course-cip007-system-security", "course-cip010-change-vulnerability"],
      relatedScenarioIds: ["scenario-ops-srv-12-review", "scenario-capstone-cyber-ops-night-shift"],
      eventType: "SYSTEM_CHANGE"
    },
    {
      id: "world-event-unexpected-admin-activity",
      worldId: "world-north-valley-energy",
      title: "Unexpected Administrative Activity",
      description: "ENG-WS-22 communicates unexpectedly with OPS-SRV-04 during the night shift.",
      occurredAt: at(5),
      entityIds: ["system-eng-ws-22", "system-ops-srv-04"],
      relatedCourseIds: ["course-cip008-incident-response", "course-cip015-insm"],
      relatedScenarioIds: ["scenario-unexpected-admin-connection", "scenario-capstone-cyber-ops-night-shift"],
      eventType: "SECURITY_EVENT"
    },
    {
      id: "world-event-configuration-difference",
      worldId: "world-north-valley-energy",
      title: "Configuration Difference Found",
      description: "A system state differs from the approved baseline and needs controlled review.",
      occurredAt: at(6),
      entityIds: ["system-ops-srv-12", "system-historian-02"],
      relatedCourseIds: ["course-cip010-change-vulnerability"],
      relatedScenarioIds: ["scenario-unauthorized-configuration-difference"],
      eventType: "SYSTEM_CHANGE"
    },
    {
      id: "world-event-recovery-dependency",
      worldId: "world-north-valley-energy",
      title: "Recovery Dependency Becomes Relevant",
      description: "Recovery planning exposes an undocumented dependency for EMS-APP-04 and HISTORIAN-02.",
      occurredAt: at(7),
      entityIds: ["system-ems-app-04", "system-historian-02"],
      relatedCourseIds: ["course-cip009-recovery-planning"],
      relatedScenarioIds: ["scenario-recovery-procedure-failure"],
      eventType: "RECOVERY_EVENT"
    },
    {
      id: "world-event-audit-evidence-request",
      worldId: "world-north-valley-energy",
      title: "Audit Requests Supporting Evidence",
      description: "The case history becomes evidence that must be reconstructed through records, samples, exceptions, and reviewer questions.",
      occurredAt: at(8),
      entityIds: ["person-casey-nguyen", "facility-corporate-admin"],
      relatedCourseIds: ["course-audit-preparation", "course-cip003-security-management"],
      relatedScenarioIds: ["scenario-audit-evidence-package", "scenario-capstone-audit-readiness"],
      eventType: "AUDIT_EVENT"
    }
  ];
}

function profile(id: string, mode: CourseExperienceProfile["primaryLearningMode"], motif: string, artifacts: string[], interactions: string[], scenario: string, entities: string[]): Omit<CourseExperienceProfile, "createdAt" | "updatedAt"> {
  return { id: `profile-${id.replace(/^course-/, "")}`, courseId: id, primaryLearningMode: mode, visualMotif: motif, primaryArtifactTypes: artifacts, primaryInteractionTypes: interactions, signatureScenarioStyle: scenario, recurringWorldEntityIds: entities };
}

function courseExperienceProfiles(): Array<Omit<CourseExperienceProfile, "createdAt" | "updatedAt">> {
  return [
    profile("course-cip002-categorization", "ANALYZE", "asset/system relationship map", ["CATEGORIZATION_RECORD"], ["categorization matrix", "scope map", "change-trigger investigation"], "decision reconstruction", ["system-ems-app-04"]),
    profile("course-cip003-security-management", "GOVERN", "ownership chain", ["EXCEPTION_RECORD", "EVIDENCE_PACKAGE"], ["responsibility chain", "control lifecycle", "exception review"], "governance casework", ["person-riley-patel", "person-casey-nguyen"]),
    profile("course-cip004-foundations", "DECIDE", "person lifecycle", ["ACCESS_REQUEST", "ACCESS_APPROVAL"], ["personnel lifecycle", "access impact review"], "role-change decision", ["person-jordan-lee"]),
    profile("course-cip004-supervisor-workshop", "DECIDE", "manager decision flow", ["ACCESS_APPROVAL", "ACCOUNT_INVENTORY"], ["approval quality", "trigger recognition", "casework"], "manager/access-owner workshop", ["person-morgan-chen", "person-jordan-lee"]),
    profile("course-cip004-annual-refresher", "DECIDE", "person/access lifecycle", ["ACCESS_APPROVAL", "EVIDENCE_PACKAGE"], ["role-change scenario", "evidence inspection"], "Jordan role-change investigation", ["person-jordan-lee", "person-taylor-morgan"]),
    profile("course-annual-awareness", "DECIDE", "human-security decision map", ["INCIDENT_RECORD"], ["rapid decisions", "phishing/MFA inspection"], "short human decision drills", ["person-taylor-morgan"]),
    profile("course-cip005-esp-access", "TRACE", "network access path", ["ACCESS_REQUEST", "ACCESS_APPROVAL"], ["network path", "remote access review", "vendor session"], "access trace investigation", ["vendor-vector-systems", "vendor-gridtech-services"]),
    profile("course-cip006-physical-security", "INVESTIGATE", "facility floor/access zones", ["VISITOR_LOG"], ["facility map", "visitor entry", "badge decision"], "physical access inspection", ["facility-nv-control-center", "facility-cedar-substation"]),
    profile("course-cip007-system-security", "INVESTIGATE", "system console", ["ACCOUNT_INVENTORY", "PATCH_EVALUATION", "VULNERABILITY_RECORD"], ["system console", "service inspection", "account review", "patch sequence"], "OPS-SRV-12 investigation", ["system-ops-srv-12", "person-jamie-rivera"]),
    profile("course-cip008-incident-response", "INVESTIGATE", "incident console/timeline", ["INCIDENT_TIMELINE", "INCIDENT_RECORD"], ["timeline", "facts-vs-assumptions", "evidence preservation"], "night-shift incident", ["system-eng-ws-22", "system-ops-srv-04"]),
    profile("course-cip009-recovery-planning", "RESTORE", "service dependency map", ["RECOVERY_PLAN", "RECOVERY_EXERCISE"], ["dependency graph", "recovery sequence", "stale procedure"], "recovery gap case", ["system-ems-app-04", "system-historian-02"]),
    profile("course-cip010-change-vulnerability", "COMPARE", "configuration comparison", ["CONFIGURATION_BASELINE", "VULNERABILITY_RECORD"], ["baseline/current comparison", "drift review"], "configuration drift investigation", ["system-ops-srv-12", "system-historian-02"]),
    profile("course-cip011-information-protection", "HANDLE", "information lifecycle", ["INFORMATION_HANDLING_RECORD"], ["classification", "sharing decision", "wrong-recipient case"], "information handling case", ["person-casey-nguyen"]),
    profile("course-cip012-control-center-communications", "TRACE", "communications path", ["COMMUNICATION_PATH_RECORD"], ["path review", "ownership matching", "change impact"], "communication path change", ["facility-nv-control-center", "facility-river-operations"]),
    profile("course-cip013-supply-chain", "ASSESS", "supplier lifecycle", ["VENDOR_SECURITY_REVIEW", "ACCESS_REQUEST"], ["supplier profile", "contract/security review", "vendor access"], "supplier risk review", ["vendor-vector-systems", "vendor-gridtech-services"]),
    profile("course-cip014-physical-risk", "ASSESS", "facility risk map", ["PHYSICAL_RISK_ASSESSMENT"], ["risk model", "mitigation review"], "facility risk case", ["facility-cedar-substation"]),
    profile("course-cip015-insm", "MONITOR", "monitoring topology", ["MONITORING_COVERAGE_MAP", "INCIDENT_TIMELINE"], ["network topology", "coverage map", "alert context"], "monitoring blind spot investigation", ["system-eng-ws-22", "system-ops-srv-04"]),
    profile("course-audit-preparation", "PREPARE", "audit workspace", ["EVIDENCE_PACKAGE", "EXCEPTION_RECORD"], ["evidence package", "population/sample review", "readiness summary"], "audit evidence defense", ["person-casey-nguyen"])
  ];
}

function courseMissionSeeds(data: AppData): Array<Omit<CourseMission, "createdAt" | "updatedAt">> {
  const moduleIds = (courseId: string) => data.modules.filter((module) => data.courses.find((course) => course.id === courseId)?.currentVersionId === module.courseVersionId).sort((a, b) => a.position - b.position).map((module) => module.id);
  const mission = (id: string, courseId: string, moduleId: string | undefined, title: string, objective: string, entities: string[], briefing?: string): Omit<CourseMission, "createdAt" | "updatedAt"> => ({ id, courseId, moduleId, title, objective, briefing, recurringEntityIds: entities });
  const cip007 = moduleIds("course-cip007-system-security");
  const cip008 = moduleIds("course-cip008-incident-response");
  const cip015 = moduleIds("course-cip015-insm");
  return [
    mission("mission-cip007-inspect-system", "course-cip007-system-security", cip007[0], "Mission 1 - Inspect the System", "Inspect OPS-SRV-12 services and identify what deserves review.", ["system-ops-srv-12"], "Start from observed configuration, not assumptions."),
    mission("mission-cip007-evaluate-patch", "course-cip007-system-security", cip007[1], "Mission 2 - Evaluate the Patch", "Separate patch applicability from implementation timing and evidence.", ["system-ops-srv-12", "person-jamie-rivera"]),
    mission("mission-cip007-review-access", "course-cip007-system-security", cip007[2], "Mission 3 - Review Access", "Review temporary, service, and privileged accounts for ownership and need.", ["system-ops-srv-12"]),
    mission("mission-cip007-capstone", "course-cip007-system-security", cip007[3], "Capstone - Secure OPS-SRV-12", "Combine services, patches, accounts, vulnerabilities, and evidence.", ["system-ops-srv-12"]),
    mission("mission-cip008-triage", "course-cip008-incident-response", cip008[0], "Mission 1 - Triage the Event", "Identify known facts and avoid premature conclusions.", ["system-eng-ws-22", "system-ops-srv-04"]),
    mission("mission-cip008-timeline", "course-cip008-incident-response", cip008[1], "Mission 2 - Build the Timeline", "Preserve events and distinguish facts from assumptions.", ["system-eng-ws-22", "system-ops-srv-04"]),
    mission("mission-cip015-map-monitoring", "course-cip015-insm", cip015[0], "Mission 1 - Map Monitoring", "Identify monitored, unmonitored, and changed internal paths.", ["system-eng-ws-22", "system-ops-srv-04", "system-historian-02"]),
    mission("mission-cip015-capstone", "course-cip015-insm", cip015[1], "Capstone - Unexpected Internal Admin Connection", "Use monitoring context to verify, escalate, and document a defensible conclusion.", ["system-eng-ws-22", "system-ops-srv-04"])
  ];
}

function investigationSeeds(): Array<Omit<InvestigationDefinition, "createdAt" | "updatedAt">> {
  return [
    {
      id: "investigation-nv-night-shift",
      title: "North Valley Night Shift Investigation",
      description: "Investigate unexpected administrative activity by combining incident, system, access, network, and maintenance context.",
      availableTools: [
        { id: "tool-incident", label: "Incident Console", toolType: "INCIDENT_CONSOLE", records: [{ id: "event-0212-rdp", title: "02:12 Unexpected RDP", summary: "ENG-WS-22 to OPS-SRV-04 using administrative protocol.", relevantFindingIds: ["finding-unexpected-admin"], evidenceValue: "RELEVANT" }, { id: "event-0214-auth", title: "02:14 Authentication Pattern", summary: "Administrative account used outside normal pattern.", relevantFindingIds: ["finding-auth-context"], evidenceValue: "RELEVANT" }] },
        { id: "tool-access", label: "Access Manager", toolType: "ACCESS_MANAGER", records: [{ id: "access-vendor-temp", title: "vendor-temp", summary: "Temporary access expired yesterday but remains active.", relevantFindingIds: ["finding-expired-account"], evidenceValue: "RELEVANT" }, { id: "access-jrivera-admin", title: "jrivera-admin", summary: "Privileged account with current approval.", evidenceValue: "UNNECESSARY" }] },
        { id: "tool-system", label: "System Console", toolType: "SYSTEM_CONSOLE", records: [{ id: "system-ops-srv-04", title: "OPS-SRV-04", summary: "Operations server receiving administrative connection.", evidenceValue: "RELEVANT" }, { id: "system-ops-srv-12", title: "OPS-SRV-12", summary: "Legacy FTP and temporary RDP enabled.", relevantFindingIds: ["finding-system-drift"], evidenceValue: "RELEVANT" }] },
        { id: "tool-maintenance", label: "Maintenance Schedule", toolType: "MAINTENANCE_SCHEDULE", records: [{ id: "maint-none", title: "No scheduled work", summary: "No approved maintenance window is visible for 02:12.", relevantFindingIds: ["finding-no-maintenance"], evidenceValue: "RELEVANT" }] },
        { id: "tool-network", label: "Network View", toolType: "NETWORK_VIEW", records: [{ id: "network-blind-spot", title: "Monitoring gap", summary: "Engineering-to-operations path has partial sensor visibility.", relevantFindingIds: ["finding-monitoring-gap"], evidenceValue: "RELEVANT" }] }
      ],
      objectives: [
        { id: "night-known-facts", label: "Determine known facts", skillId: "skill-incident-recognition", required: true },
        { id: "night-verify", label: "Verify authorization", skillId: "skill-incident-response", required: true },
        { id: "night-preserve", label: "Preserve useful evidence", skillId: "skill-evidence-quality", required: true }
      ],
      findings: [
        { id: "finding-unexpected-admin", title: "Unexpected administrative connection", description: "The connection is unusual and needs verification.", sourceToolId: "tool-incident", sourceRecordId: "event-0212-rdp", skillId: "skill-incident-recognition" },
        { id: "finding-expired-account", title: "Expired temporary account", description: "Temporary access remains active beyond its expected duration.", sourceToolId: "tool-access", sourceRecordId: "access-vendor-temp", skillId: "skill-account-management" },
        { id: "finding-system-drift", title: "System security drift", description: "Legacy and temporary services need controlled review.", sourceToolId: "tool-system", sourceRecordId: "system-ops-srv-12", skillId: "skill-system-hardening" },
        { id: "finding-no-maintenance", title: "No visible maintenance", description: "No approved maintenance context is visible for the activity.", sourceToolId: "tool-maintenance", sourceRecordId: "maint-none", skillId: "skill-incident-response" },
        { id: "finding-monitoring-gap", title: "Monitoring blind spot", description: "Visibility is partial on a path relevant to the investigation.", sourceToolId: "tool-network", sourceRecordId: "network-blind-spot", skillId: "skill-network-monitoring" }
      ],
      conclusionPrompt: "Document the known facts, open verification items, and escalation path.",
      hypothesisEnabled: true,
      evidenceCollectionEnabled: true,
      notebookEnabled: true,
      relatedCourseIds: ["course-cip007-system-security", "course-cip008-incident-response", "course-cip010-change-vulnerability", "course-cip015-insm"],
      relatedScenarioIds: ["scenario-capstone-cyber-ops-night-shift"],
      skillIds: ["skill-incident-recognition", "skill-account-management", "skill-system-hardening", "skill-patch-management", "skill-network-monitoring", "skill-evidence-quality"]
    },
    {
      id: "investigation-audit-evidence-package",
      title: "Audit Evidence Package Review",
      description: "Review a North Valley evidence package and identify defects without rewriting historical records.",
      availableTools: [
        { id: "tool-procedure", label: "Procedure", toolType: "AUDIT_WORKSPACE", records: [{ id: "procedure-v31", title: "Procedure v3.1 referenced", summary: "Current process package expects v3.2.", relevantFindingIds: ["finding-wrong-procedure"], evidenceValue: "RELEVANT" }] },
        { id: "tool-population", label: "Population", toolType: "AUDIT_WORKSPACE", records: [{ id: "population-42-39", title: "Population mismatch", summary: "System report says 42 users; package contains 39.", relevantFindingIds: ["finding-population-mismatch"], evidenceValue: "RELEVANT" }] },
        { id: "tool-samples", label: "Samples", toolType: "AUDIT_WORKSPACE", records: [{ id: "sample-c", title: "Sample C", summary: "Missing approval evidence.", relevantFindingIds: ["finding-missing-approval"], evidenceValue: "RELEVANT" }] },
        { id: "tool-exception", label: "Exceptions", toolType: "AUDIT_WORKSPACE", records: [{ id: "exception-ex27", title: "EX-27", summary: "Exception expiration is stale.", relevantFindingIds: ["finding-stale-exception"], evidenceValue: "RELEVANT" }] }
      ],
      objectives: [
        { id: "audit-gaps", label: "Identify package defects", skillId: "skill-audit-readiness", required: true },
        { id: "audit-integrity", label: "Preserve factual integrity", skillId: "skill-evidence-quality", required: true }
      ],
      findings: [
        { id: "finding-wrong-procedure", title: "Wrong procedure version", description: "The package references an older procedure version.", sourceToolId: "tool-procedure", sourceRecordId: "procedure-v31", skillId: "skill-audit-readiness" },
        { id: "finding-population-mismatch", title: "Population discrepancy", description: "Population count and evidence package count do not reconcile.", sourceToolId: "tool-population", sourceRecordId: "population-42-39", skillId: "skill-evidence-quality" },
        { id: "finding-missing-approval", title: "Missing sample approval", description: "Sample C does not show who approved the activity.", sourceToolId: "tool-samples", sourceRecordId: "sample-c", skillId: "skill-evidence-quality" },
        { id: "finding-stale-exception", title: "Expired exception", description: "The exception record is past its review/expiration date.", sourceToolId: "tool-exception", sourceRecordId: "exception-ex27", skillId: "skill-control-ownership" }
      ],
      conclusionPrompt: "Create a readiness summary with known gaps, owners, and actions.",
      hypothesisEnabled: false,
      evidenceCollectionEnabled: true,
      notebookEnabled: true,
      relatedCourseIds: ["course-audit-preparation", "course-cip003-security-management"],
      relatedScenarioIds: ["scenario-capstone-audit-readiness"],
      skillIds: ["skill-audit-readiness", "skill-evidence-quality", "skill-control-ownership"]
    },
    {
      id: "investigation-personnel-access-workshop",
      title: "Personnel & Access Decision Workshop",
      description: "Work through personnel events and decide which training, access, approval, and records are needed.",
      availableTools: [
        { id: "tool-person", label: "Personnel", toolType: "ACCESS_MANAGER", records: [{ id: "jordan-transfer", title: "Jordan Lee transfer", summary: "Previous Control Center Operations, current Business Planning.", relevantFindingIds: ["finding-role-change"], evidenceValue: "RELEVANT" }, { id: "contract-end", title: "Contract end", summary: "GridTech project support ends Friday.", relevantFindingIds: ["finding-contract-end"], evidenceValue: "RELEVANT" }] },
        { id: "tool-access-review", label: "Access Review", toolType: "ACCESS_MANAGER", records: [{ id: "ops-access", title: "Operational access active", summary: "Remote administration and restricted workspace remain active.", relevantFindingIds: ["finding-old-access"], evidenceValue: "RELEVANT" }] }
      ],
      objectives: [
        { id: "personnel-trigger", label: "Recognize personnel triggers", skillId: "skill-personnel-security", required: true },
        { id: "access-impact", label: "Determine access impact", skillId: "skill-access-management", required: true }
      ],
      findings: [
        { id: "finding-role-change", title: "Role change trigger", description: "A role change should trigger review of responsibilities and access.", sourceToolId: "tool-person", sourceRecordId: "jordan-transfer", skillId: "skill-personnel-security" },
        { id: "finding-contract-end", title: "Contract end trigger", description: "Contract end may require access, facility, and evidence follow-through.", sourceToolId: "tool-person", sourceRecordId: "contract-end", skillId: "skill-access-management" },
        { id: "finding-old-access", title: "Old operational access", description: "Operational access remains active after current responsibility changed.", sourceToolId: "tool-access-review", sourceRecordId: "ops-access", skillId: "skill-access-management" }
      ],
      conclusionPrompt: "Summarize the personnel triggers and required access review actions.",
      hypothesisEnabled: false,
      evidenceCollectionEnabled: true,
      notebookEnabled: true,
      relatedCourseIds: ["course-cip004-foundations", "course-cip004-annual-refresher", "course-cip005-esp-access", "course-cip006-physical-security"],
      relatedScenarioIds: ["scenario-capstone-personnel-access"],
      skillIds: ["skill-personnel-security", "skill-access-management", "skill-physical-access"]
    }
  ];
}

function activityVariantSeeds(): Array<Omit<ActivityVariantDefinition, "createdAt" | "updatedAt">> {
  return [
    { id: "variant-patch-a", activityId: "practice-patch-constraint", variables: { system: "OPS-SRV-12", patch: "PATCH-2026-042", severity: "High", constraint: "quarter-end freeze", mitigation: "under review" } },
    { id: "variant-patch-b", activityId: "practice-patch-constraint", variables: { system: "EMS-APP-04", patch: "PATCH-2026-118", severity: "Medium", constraint: "vendor validation required", mitigation: "compensating monitoring" } },
    { id: "variant-patch-c", activityId: "practice-patch-constraint", variables: { system: "HISTORIAN-02", patch: "PATCH-2026-205", severity: "High", constraint: "data retention window", mitigation: "scheduled implementation" } },
    { id: "variant-account-a", activityId: "practice-expired-temp-admin", variables: { account: "vendor-temp", owner: "GridTech Services", expires: "yesterday" } },
    { id: "variant-account-b", activityId: "practice-expired-temp-admin", variables: { account: "contractor-admin", owner: "Project Support", expires: "last Friday" } },
    { id: "variant-account-c", activityId: "practice-expired-temp-admin", variables: { account: "temporary-engineer", owner: "Engineering", expires: "two days ago" } }
  ];
}

function learningProgramSeeds(): Array<Omit<LearningProgram, "createdAt" | "updatedAt">> {
  return [
    {
      id: "program-cybersecurity-operations-readiness",
      title: "Cybersecurity Operations Readiness",
      description: "Build operational capability across access, system security, incident response, change, and monitoring, then apply it in a North Valley capstone.",
      status: "PUBLISHED",
      audience: ["Cybersecurity", "Operations", "IT Infrastructure"],
      certificateEnabled: true,
      capstoneScenarioId: "scenario-capstone-cyber-ops-night-shift",
      stages: [
        { id: "ops-foundation", title: "Foundation", items: [{ id: "ops-cip005", type: "COURSE", targetId: "course-cip005-esp-access", required: true }] },
        { id: "ops-system-security", title: "System Security", items: [{ id: "ops-cip007", type: "COURSE", targetId: "course-cip007-system-security", required: true }, { id: "ops-patch-practice", type: "PRACTICE", targetId: "practice-patch-constraint", required: true }, { id: "ops-system-review", type: "SCENARIO", targetId: "scenario-ops-srv-12-review", required: true }] },
        { id: "ops-incident", title: "Incident Response", items: [{ id: "ops-cip008", type: "COURSE", targetId: "course-cip008-incident-response", required: true }, { id: "ops-incident-practice", type: "PRACTICE", targetId: "practice-suspicious-remote-connection", required: true }] },
        { id: "ops-change-monitor", title: "Change & Monitoring", items: [{ id: "ops-cip010", type: "COURSE", targetId: "course-cip010-change-vulnerability", required: true }, { id: "ops-cip015", type: "COURSE", targetId: "course-cip015-insm", required: true }] },
        { id: "ops-capstone", title: "Capstone", items: [{ id: "ops-capstone-night-shift", type: "CAPSTONE", targetId: "scenario-capstone-cyber-ops-night-shift", required: true }] }
      ]
    },
    {
      id: "program-compliance-control-owner",
      title: "Compliance & Control Owner Readiness",
      description: "Practice scope, governance, supervisor decisions, evidence quality, and audit package defense.",
      status: "PUBLISHED",
      audience: ["Compliance", "Managers", "Control Owners"],
      certificateEnabled: true,
      capstoneScenarioId: "scenario-capstone-audit-readiness",
      stages: [
        { id: "cco-scope", title: "Scope & Governance", items: [{ id: "cco-cip002", type: "COURSE", targetId: "course-cip002-categorization", required: true }, { id: "cco-cip003", type: "COURSE", targetId: "course-cip003-security-management", required: true }] },
        { id: "cco-supervisor", title: "Personnel Oversight", items: [{ id: "cco-supervisor", type: "COURSE", targetId: "course-cip004-supervisor-workshop", required: true }] },
        { id: "cco-audit", title: "Audit Readiness", items: [{ id: "cco-audit-course", type: "COURSE", targetId: "course-audit-preparation", required: true }, { id: "cco-evidence-practice", type: "PRACTICE", targetId: "practice-missing-evidence", required: true }, { id: "cco-capstone", type: "CAPSTONE", targetId: "scenario-capstone-audit-readiness", required: true }] }
      ]
    },
    {
      id: "program-personnel-access-readiness",
      title: "Personnel & Access Readiness",
      description: "Connect personnel events, electronic access, physical access, manager decisions, and evidence.",
      status: "PUBLISHED",
      audience: ["Operations", "Managers", "Access Owners"],
      certificateEnabled: true,
      capstoneScenarioId: "scenario-capstone-personnel-access",
      stages: [
        { id: "par-foundation", title: "Personnel Foundation", items: [{ id: "par-foundations", type: "COURSE", targetId: "course-cip004-foundations", required: true }, { id: "par-annual", type: "COURSE", targetId: "course-cip004-annual-refresher", required: false }] },
        { id: "par-access", title: "Access Channels", items: [{ id: "par-cip005", type: "COURSE", targetId: "course-cip005-esp-access", required: true }, { id: "par-cip006", type: "COURSE", targetId: "course-cip006-physical-security", required: true }] },
        { id: "par-capstone", title: "Capstone", items: [{ id: "par-capstone-workshop", type: "CAPSTONE", targetId: "scenario-capstone-personnel-access", required: true }] }
      ]
    }
  ];
}

function assignmentBundleSeeds(): Array<Omit<LearningAssignmentBundle, "createdAt" | "updatedAt">> {
  return [
    {
      id: "bundle-cip007-readiness",
      title: "CIP-007 Readiness",
      description: "A focused bundle for system security training, patch practice, and the OPS-SRV-12 capstone.",
      itemIds: [
        { type: "COURSE", targetId: "course-cip007-system-security", required: true },
        { type: "PRACTICE", targetId: "practice-patch-constraint", required: true },
        { type: "SCENARIO", targetId: "scenario-ops-srv-12-review", required: true }
      ]
    }
  ];
}

function coachingGuideSeeds(): Array<Omit<SkillCoachingGuide, "createdAt" | "updatedAt">> {
  return [
    { id: "coaching-patch-management", skillId: "skill-patch-management", prompts: ["How do you distinguish applicability from implementation?", "What information should be documented when implementation is delayed?", "What would make the patch decision traceable later?"], suggestedPracticeIds: ["practice-patch-constraint"] },
    { id: "coaching-evidence-quality", skillId: "skill-evidence-quality", prompts: ["Could another reviewer reconstruct who did what and when?", "Does the record connect the population, sample, result, and owner?", "What should be documented instead of rewritten?"], suggestedPracticeIds: ["practice-missing-evidence", "practice-access-approval-quality"] },
    { id: "coaching-access-management", skillId: "skill-access-management", prompts: ["What changed about the person's responsibilities?", "Which access still has a current approved need?", "What owner should review and approve changes?"], suggestedPracticeIds: ["practice-access-approval-quality", "practice-expired-temp-admin"] },
    { id: "coaching-network-monitoring", skillId: "skill-network-monitoring", prompts: ["What traffic is expected for this path?", "Where is visibility partial or missing?", "What context is needed before concluding the activity is malicious?"], suggestedPracticeIds: ["practice-monitoring-blind-spot", "practice-suspicious-remote-connection"] }
  ];
}

function buildCapstoneScenarios(): Array<Omit<ScenarioDefinition, "createdAt" | "updatedAt">> {
  const capstone = (id: string, title: string, description: string, relatedCourseIds: string[], skillIds: string[], workspaceType: ScenarioDefinition["workspaceType"], prompt: string, recommended: string): Omit<ScenarioDefinition, "createdAt" | "updatedAt"> => ({
    id,
    title,
    description,
    category: "Capstone",
    difficulty: "ADVANCED",
    estimatedMinutes: id.includes("audit") ? 18 : 20,
    relatedCourseIds,
    skillIds,
    topicIds: skillIds,
    initialState: { mode: "capstone", supportMode: "STANDARD" },
    repeatable: true,
    objectives: skillIds.slice(0, 5).map((skillId, index) => ({ id: `${id}-objective-${index + 1}`, label: ["Determine known facts", "Verify authorization", "Preserve evidence", "Document conclusion", "Escalate appropriately"][index] ?? "Apply the skill", skillId, required: true })),
    workspaceType,
    resultRules: [{ id: `${id}-strong`, result: "STRONG", minRecommendedChoices: 3 }, { id: `${id}-developing`, result: "DEVELOPING", minRecommendedChoices: 2 }],
    steps: [
      { id: `${id}-brief`, stepType: "INFORMATION", title: "Mission briefing", narrative: prompt, choices: [{ id: "begin", label: "Begin investigation", feedback: "Use the available tools before drawing conclusions.", principleTags: ["investigation"], impact: [{ field: "briefed", value: true }], nextStepId: `${id}-facts`, quality: "ACCEPTABLE" }] },
      { id: `${id}-facts`, stepType: "DECISION", title: "Known facts", narrative: "Which action best supports a defensible investigation?", choices: [{ id: "collect", label: "Collect relevant facts across tools before concluding", feedback: "Recommended. Distributed information has to be connected.", principleTags: ["verification", "evidence"], impact: [{ field: "factsCollected", value: true }], nextStepId: `${id}-evidence`, quality: "RECOMMENDED" }, { id: "conclude", label: "Write the conclusion immediately", feedback: "Premature conclusions can miss context.", principleTags: ["verification"], impact: [{ field: "prematureConclusion", value: true }], nextStepId: `${id}-evidence`, quality: "RISKY" }] },
      { id: `${id}-evidence`, stepType: "DECISION", title: "Evidence", narrative: "What should be preserved or summarized?", choices: [{ id: "relevant", label: recommended, feedback: "Recommended. This keeps the conclusion tied to observable information.", principleTags: ["evidence"], impact: [{ field: "evidenceQuality", value: "strong" }], nextStepId: `${id}-conclusion`, quality: "RECOMMENDED" }, { id: "thin", label: "A short note that the activity was handled", feedback: "Too thin. Another reviewer may not understand the basis.", principleTags: ["documentation"], impact: [{ field: "evidenceQuality", value: "thin" }], nextStepId: `${id}-conclusion`, quality: "RISKY" }] },
      { id: `${id}-conclusion`, stepType: "DECISION", title: "Conclusion", narrative: "How should the capstone close?", choices: [{ id: "document", label: "Document known facts, gaps, owner actions, and escalation", feedback: "Recommended. This supports continuity and learning evidence.", principleTags: ["documentation", "escalation"], impact: [{ field: "conclusionQuality", value: "strong" }], quality: "RECOMMENDED" }, { id: "fabricate", label: "Fill in missing details so the package looks complete", feedback: "Never fabricate missing historical evidence. Record factual status and route gaps.", principleTags: ["factual integrity"], impact: [{ field: "factualIntegrityIssue", value: true }], quality: "INCORRECT" }] }
    ]
  });
  return [
    capstone("scenario-capstone-cyber-ops-night-shift", "Cybersecurity Operations Capstone - North Valley Night Shift", "Investigate unexpected connection, expired temporary account, configuration drift, patch constraint, and monitoring blind spot.", ["course-cip005-esp-access", "course-cip007-system-security", "course-cip008-incident-response", "course-cip010-change-vulnerability", "course-cip015-insm"], ["skill-incident-recognition", "skill-account-management", "skill-system-hardening", "skill-patch-management", "skill-network-monitoring", "skill-evidence-quality"], "INCIDENT_CONSOLE", "At 02:12 North Valley detects unusual activity. The relevant facts are split across incident, system, access, network, and maintenance tools.", "Event record, access status, system state, maintenance context, monitoring coverage, and documented conclusion"),
    capstone("scenario-capstone-audit-readiness", "Audit Readiness Capstone - Evidence Package Review", "Review requirement context, procedure, population, samples, evidence, exceptions, and reviewer questions.", ["course-cip002-categorization", "course-cip003-security-management", "course-audit-preparation"], ["skill-audit-readiness", "skill-evidence-quality", "skill-control-ownership"], "AUDIT_WORKSPACE", "A reviewer asks whether a North Valley access-review package is ready. The package includes a population discrepancy, missing approval, stale exception, wrong procedure version, and unsupported narrative claim.", "Known gaps, evidence available, items requiring clarification, owners, and actions"),
    capstone("scenario-capstone-personnel-access", "Personnel & Access Decision Workshop", "Apply access and personnel principles across new hire, role transfer, temporary assignment, contract end, and termination events.", ["course-cip004-foundations", "course-cip004-annual-refresher", "course-cip005-esp-access", "course-cip006-physical-security"], ["skill-personnel-security", "skill-access-management", "skill-physical-access", "skill-evidence-quality"], "ACCESS_MANAGER", "North Valley has multiple personnel events. Each may affect training, electronic access, physical access, approvals, and evidence.", "Trigger, owner, access impact, physical access impact, training review, required evidence, and follow-through")
  ];
}

function attachCoursePreAssessments(data: AppData) {
  const longerCourses = ["course-cip005-esp-access", "course-cip007-system-security", "course-cip008-incident-response", "course-cip010-change-vulnerability", "course-cip013-supply-chain", "course-cip015-insm", "course-audit-preparation"];
  longerCourses.forEach((courseId) => {
    const course = data.courses.find((item) => item.id === courseId);
    if (!course) return;
    course.preAssessmentEnabled = true;
    const version = data.courseVersions.find((item) => item.id === course.currentVersionId);
    if (!version) return;
    const existingBlock = data.contentBlocks.find((block) => block.id === `${courseId}-preassessment-brief`);
    const firstLesson = data.lessons.filter((lesson) => lesson.courseVersionId === version.id).sort((a, b) => a.position - b.position)[0];
    if (!existingBlock && firstLesson) {
      data.contentBlocks.push(stamp({
        id: `${courseId}-preassessment-brief`,
        lessonId: firstLesson.id,
        type: "quick_recall",
        title: "Check Your Starting Point",
        body: "Answer this short practice question to identify focus areas. It does not complete or bypass course requirements.",
        position: 0,
        required: false,
        data: { prompt: "Which statement best describes this course topic?", options: ["Follow a controlled process and retain evidence", "Use informal shortcuts when work is urgent", "Wait for audit to clarify responsibility"], correctResponse: "Follow a controlled process and retain evidence", explanation: "The pre-assessment highlights focus areas only; course requirements remain unchanged." }
      }));
    }
  });
}

function addLearningExperience4Seed(data: AppData) {
  upsertById(data.trainingWorlds, stamp(northValleyWorld));
  northValleyArtifacts.forEach((artifact) => upsertById(data.trainingArtifacts, stamp(artifact)));
  northValleyDiagrams.forEach((diagram) => upsertById(data.learningDiagrams, stamp(diagram)));
  northValleyScenarioSeries.forEach((series) => upsertById(data.scenarioSeries, stamp(series)));

  const storyArcs: Record<string, NonNullable<AppData["courses"][number]["storyArc"]>> = {
    "course-cip002-categorization": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-casey-nguyen"], recurringSystemIds: ["system-ems-app-04"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: [] },
    "course-cip003-security-management": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-riley-patel", "person-casey-nguyen"], recurringSystemIds: [], recurringFacilityIds: ["facility-corporate-admin"], recurringVendorIds: [] },
    "course-cip004-annual-refresher": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jordan-lee", "person-morgan-chen", "person-taylor-morgan"], recurringSystemIds: [], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: [] },
    "course-cip004-foundations": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jordan-lee", "person-taylor-morgan"], recurringSystemIds: [], recurringFacilityIds: [], recurringVendorIds: [] },
    "course-cip004-supervisor-workshop": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-morgan-chen", "person-jordan-lee"], recurringSystemIds: [], recurringFacilityIds: [], recurringVendorIds: [] },
    "course-annual-awareness": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-taylor-morgan"], recurringSystemIds: [], recurringFacilityIds: ["facility-corporate-admin"], recurringVendorIds: [] },
    "course-cip005-esp-access": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-ops-srv-12"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: ["vendor-vector-systems", "vendor-gridtech-services"] },
    "course-cip006-physical-security": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-taylor-morgan"], recurringSystemIds: [], recurringFacilityIds: ["facility-nv-control-center", "facility-cedar-substation"], recurringVendorIds: ["vendor-gridtech-services"] },
    "course-cip007-system-security": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-ops-srv-12", "system-ems-app-04"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: ["vendor-vector-systems"] },
    "course-cip008-incident-response": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera", "person-taylor-morgan"], recurringSystemIds: ["system-eng-ws-22", "system-ops-srv-04"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: [] },
    "course-cip009-recovery-planning": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-ems-app-04", "system-historian-02"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: [] },
    "course-cip010-change-vulnerability": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-ops-srv-12", "system-historian-02"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: [] },
    "course-cip011-information-protection": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-casey-nguyen"], recurringSystemIds: ["system-ems-app-04"], recurringFacilityIds: ["facility-corporate-admin"], recurringVendorIds: [] },
    "course-cip012-control-center-communications": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-ems-app-04"], recurringFacilityIds: ["facility-nv-control-center", "facility-river-operations"], recurringVendorIds: [] },
    "course-cip013-supply-chain": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-riley-patel"], recurringSystemIds: ["system-historian-02"], recurringFacilityIds: [], recurringVendorIds: ["vendor-vector-systems", "vendor-gridtech-services"] },
    "course-cip014-physical-risk": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-casey-nguyen"], recurringSystemIds: [], recurringFacilityIds: ["facility-cedar-substation"], recurringVendorIds: [] },
    "course-cip015-insm": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-jamie-rivera"], recurringSystemIds: ["system-eng-ws-22", "system-ops-srv-04", "system-historian-02"], recurringFacilityIds: ["facility-nv-control-center"], recurringVendorIds: ["vendor-vector-systems"] },
    "course-audit-preparation": { worldId: "world-north-valley-energy", recurringPersonIds: ["person-casey-nguyen"], recurringSystemIds: [], recurringFacilityIds: ["facility-corporate-admin"], recurringVendorIds: [] }
  };

  for (const course of data.courses) {
    course.storyArc = course.storyArc ?? storyArcs[course.id];
    addInstructionalStages(data, course.id);
  }

  addVisualAnchor(data, "course-cip007-system-security", "diagram-cip007-system-lifecycle", "artifact-ops-srv-12-account-inventory", "OPS-SRV-12 System Security Investigation", "Inspect the same North Valley server across services, patches, accounts, and vulnerabilities.");
  addVisualAnchor(data, "course-cip008-incident-response", "diagram-cip008-incident-timeline", "artifact-incident-timeline-admin", "Incident Timeline Investigation", "Work from known facts before drawing conclusions.");
  addVisualAnchor(data, "course-cip009-recovery-planning", "diagram-cip009-dependency-map", "artifact-recovery-exercise-ems", "Recovery Dependency Investigation", "Identify missing dependencies before treating a recovery plan as ready.");
  addVisualAnchor(data, "course-audit-preparation", "diagram-audit-package", "artifact-audit-evidence-package", "Evidence Package Investigation", "Find the defects that would prevent the package from being audit-ready.");

  const taylor = data.users.find((user) => user.email === "learner@gridguard.local");
  if (taylor && !data.learnerGoals.some((goal) => goal.id === "goal-taylor-evidence-quality")) {
    data.learnerGoals.push(stamp({ id: "goal-taylor-evidence-quality", userId: taylor.id, skillId: "skill-evidence-quality", createdAt: iso(subDays(demoNow, 2)), status: "ACTIVE" }));
  }
}

function upsertById<T extends { id: string; updatedAt?: string }>(items: T[], item: T) {
  const existing = items.find((candidate) => candidate.id === item.id);
  if (existing) Object.assign(existing, item);
  else items.push(item);
}

function addInstructionalStages(data: AppData, courseId: string) {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return;
  const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
  for (const lesson of lessons) {
    const blocks = data.contentBlocks.filter((block) => block.lessonId === lesson.id).sort((left, right) => left.position - right.position);
    if (!blocks.length || lesson.instructionalStages?.length) continue;
    const first = blocks[0];
    const last = blocks[blocks.length - 1];
    const visual = blocks.find((block) => ["learning_diagram", "process_diagram", "timeline", "system_inspector", "evidence_inspector", "artifact_review", "investigation_activity"].includes(block.type));
    const activity = blocks.find((block) => ["decision_cards", "classification", "sequence_builder", "matching", "knowledge_check", "quick_recall"].includes(block.type));
    lesson.instructionalStages = [
      { id: `${lesson.id}-stage-understand`, type: "UNDERSTAND" as const, label: "Understand", blockIds: [first.id] },
      { id: `${lesson.id}-stage-see`, type: "SEE" as const, label: "See It", blockIds: visual ? [visual.id] : blocks.slice(1, 2).map((block) => block.id) },
      { id: `${lesson.id}-stage-try`, type: "TRY" as const, label: "Try It", blockIds: activity ? [activity.id] : [] },
      { id: `${lesson.id}-stage-takeaway`, type: "TAKEAWAY" as const, label: "Takeaway", blockIds: [last.id] }
    ].filter((stage) => stage.blockIds.length);
  }
}

function addVisualAnchor(data: AppData, courseId: string, diagramId: string, artifactId: string, title: string, body: string) {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return;
  const lesson = data.lessons
    .filter((item) => item.courseVersionId === course.currentVersionId)
    .sort((left, right) => left.position - right.position)[0];
  if (!lesson) return;
  const blocks = data.contentBlocks.filter((block) => block.lessonId === lesson.id);
  const maxPosition = blocks.reduce((max, block) => Math.max(max, block.position), 0);
  if (!data.contentBlocks.some((block) => block.id === `${lesson.id}-nv-diagram`)) {
    data.contentBlocks.push(stamp({
      id: `${lesson.id}-nv-diagram`,
      lessonId: lesson.id,
      type: "learning_diagram",
      title,
      body,
      data: { diagramId },
      position: maxPosition + 1,
      required: false,
      stageType: "SEE"
    }));
  }
  if (!data.contentBlocks.some((block) => block.id === `${lesson.id}-nv-artifact`)) {
    data.contentBlocks.push(stamp({
      id: `${lesson.id}-nv-artifact`,
      lessonId: lesson.id,
      type: "artifact_review",
      title: title.replace("Investigation", "Artifact Review"),
      body: "Inspect the artifact and distinguish confirmed concerns from items that need more context.",
      data: { artifactId },
      position: maxPosition + 2,
      required: false,
      stageType: "TRY"
    }));
  }
}

function addLearningExperience3Seed(data: AppData) {
  for (const course of data.courses) {
    if (course.id === "course-cip007-system-security") {
      course.relationships = course.relationships ?? { buildsOn: ["course-cip005-esp-access"], related: ["course-cip010-change-vulnerability"], recommendedNext: ["course-cip010-change-vulnerability"] };
    } else if (course.id === "course-cip010-change-vulnerability") {
      course.relationships = course.relationships ?? { buildsOn: ["course-cip007-system-security"], related: ["course-cip015-insm"], recommendedNext: ["course-cip015-insm"] };
    } else if (course.id === "course-cip004-annual-refresher") {
      course.relationships = course.relationships ?? { buildsOn: ["course-cip004-foundations"], related: ["course-cip004-supervisor-workshop"], recommendedNext: ["course-cip005-esp-access"] };
    }
    course.lastContentReviewAt = course.lastContentReviewAt ?? iso(subDays(demoNow, 120));
    course.nextContentReviewAt = course.nextContentReviewAt ?? iso(addDays(demoNow, 245));
  }

  const resourceDefs = [
    resource("resource-personnel-change-checklist", "Personnel Change Checklist", "Review training, electronic access, physical access, role membership, and evidence after a personnel event.", "CHECKLIST", ["course-cip004-annual-refresher", "course-cip004-supervisor-workshop"], ["skill-personnel-security", "skill-access-management"], ["Person and effective date", "Previous and new responsibilities", "Training review", "Electronic access review", "Physical access review", "Required changes and evidence"]),
    resource("resource-remote-access-review", "Remote Access Review Guide", "A job aid for reviewing remote access authorization, scope, duration, approval, and closure.", "JOB_AID", ["course-cip005-esp-access", "course-cip013-supply-chain"], ["skill-electronic-access", "skill-access-management"], ["Requester and sponsor", "System and privilege", "Approved method", "Start and end", "Approval and closure"]),
    resource("resource-system-security-checklist", "System Security Review Checklist", "Review ports, services, configuration, patches, accounts, malicious-code alerts, vulnerabilities, and evidence.", "CHECKLIST", ["course-cip007-system-security", "course-cip010-change-vulnerability"], ["skill-system-hardening", "skill-patch-management", "skill-account-management"], ["Ports and services", "Configuration baseline", "Patch evaluation", "Account ownership", "Vulnerability findings"]),
    resource("resource-incident-capture-guide", "Incident Information Capture Guide", "Capture facts early without turning observations into unsupported conclusions.", "JOB_AID", ["course-cip008-incident-response", "course-cip015-insm"], ["skill-incident-recognition", "skill-incident-response"], ["Date and time", "System", "Account", "Observed behavior", "Known facts", "Actions taken", "People notified"]),
    resource("resource-recovery-exercise-worksheet", "Recovery Exercise Worksheet", "Prepare, execute, validate, document, and remediate recovery exercise results.", "PROCESS_GUIDE", ["course-cip009-recovery-planning"], ["skill-recovery"], ["Plan version", "Scope", "Participants", "Dependencies", "Validation", "Issues", "Corrective actions"]),
    resource("resource-change-evidence-checklist", "Configuration Change Evidence Checklist", "Assemble change records showing reason, review, approval, implementation, validation, and baseline update.", "EVIDENCE_TEMPLATE", ["course-cip010-change-vulnerability"], ["skill-configuration", "skill-evidence-quality"], ["Change ID", "System", "Risk or impact", "Approval", "Implementation", "Verification", "Baseline update"]),
    resource("resource-information-handling-guide", "Information Handling Decision Guide", "Decide what information is, who needs it, where it can be stored, how it can be shared, and how it should be disposed.", "QUICK_REFERENCE", ["course-cip011-information-protection"], ["skill-information-protection"], ["Identify", "Need to know", "Storage", "Transmission", "Retention", "Disposal"]),
    resource("resource-monitoring-coverage-review", "Monitoring Coverage Review", "Review network areas, visibility points, telemetry, ownership, blind spots, validation, and change review.", "CHECKLIST", ["course-cip015-insm"], ["skill-network-monitoring"], ["Network area", "Visibility point", "Telemetry", "Owner", "Blind spot", "Validation"]),
    resource("resource-evidence-quality-rubric", "Evidence Quality Rubric", "Score traceability, completeness, consistency, relevance, readability, and authoritative source quality.", "EVIDENCE_TEMPLATE", ["course-audit-preparation", "course-cip003-security-management"], ["skill-evidence-quality", "skill-audit-readiness"], ["Traceable", "Complete", "Consistent", "Relevant", "Readable", "Authoritative"])
  ];
  const existingResources = new Set((data.learningResources ?? []).map((item) => item.id));
  resourceDefs.forEach((definition) => {
    if (!existingResources.has(definition.id)) data.learningResources.push(stamp(definition));
  });

  const userByEmail = (email: string) => data.users.find((user) => user.email === email);
  const achievements = [
    [userByEmail("learner@gridguard.local")?.id, "achievement-taylor-foundations", "NERC CIP Foundations Complete", "Completed core foundation training and practice."],
    [userByEmail("jamie.rivera@gridguard.local")?.id, "achievement-jamie-first-scenario", "First Scenario Completed", "Completed a Scenario Lab exercise."],
    [userByEmail("priya.shah@gridguard.local")?.id, "achievement-priya-audit", "Audit Readiness Workshop Complete", "Completed audit-readiness training and evidence review."]
  ] as const;
  achievements.forEach(([userId, achievementId, title, description]) => {
    if (userId && !data.learnerAchievements.some((item) => item.id === achievementId)) {
      data.learnerAchievements.push(stamp({ id: achievementId, userId, achievementType: achievementId.replace("achievement-", ""), title, description, earnedAt: iso(subDays(demoNow, 6)) }));
    }
  });

  data.users.forEach((user) => {
    if (!data.learningPreferences.some((item) => item.userId === user.id && item.key === "learningPreferences")) {
      data.learningPreferences.push(stamp({
        id: `learning-preferences-${user.id}`,
        userId: user.id,
        key: "learningPreferences",
        value: { defaultSupportMode: "STANDARD", textSize: "STANDARD", reducedMotion: "SYSTEM", outlineMode: "EXPANDED", scenarioTheme: "SYSTEM" }
      }));
    }
  });
}

function resource(id: string, title: string, description: string, type: LearningResource["type"], relatedCourseIds: string[], relatedSkillIds: string[], bullets: string[]): Omit<LearningResource, "createdAt" | "updatedAt"> {
  return {
    id,
    title,
    description,
    type,
    relatedCourseIds,
    relatedSkillIds,
    relatedStandardIds: [],
    printable: true,
    global: true,
    contentBlocks: [
      { id: `${id}-intro`, type: "paragraph", title: "Purpose", body: description, position: 1 },
      { id: `${id}-items`, type: "checklist", title: "Review Items", body: bullets.map((item) => `- ${item}`).join("\n"), data: { items: bullets }, position: 2 }
    ]
  };
}

function buildScenarios(): Omit<ScenarioDefinition, "createdAt" | "updatedAt">[] {
  const simple = (id: string, title: string, category: string, skillIds: string[], courseId: string, minutes: number, prompt: string, recommended: string) => ({
    id,
    title,
    description: prompt,
    category,
    difficulty: "INTERMEDIATE" as const,
    estimatedMinutes: minutes,
    relatedCourseIds: [courseId],
    skillIds,
    topicIds: skillIds,
    initialState: { status: "open" },
    repeatable: true,
    objectives: [
      { id: `${id}-objective-process`, label: "Choose a controlled process", skillId: skillIds[0], required: true },
      { id: `${id}-objective-evidence`, label: "Retain useful evidence", skillId: skillIds[skillIds.length - 1], required: true }
    ],
    workspaceType: category.includes("System") || category.includes("Configuration")
      ? "SYSTEM_CONSOLE" as const
      : category.includes("Incident") || category.includes("Monitoring")
        ? "INCIDENT_CONSOLE" as const
        : category.includes("Recovery")
          ? "RECOVERY_CONSOLE" as const
          : category.includes("Supply")
            ? "VENDOR_WORKSPACE" as const
            : category.includes("Audit")
              ? "AUDIT_WORKSPACE" as const
              : "ACCESS_MANAGER" as const,
    resultRules: [
      { id: `${id}-strong`, result: "STRONG" as const, minRecommendedChoices: 2 },
      { id: `${id}-developing`, result: "DEVELOPING" as const, minRecommendedChoices: 1 }
    ],
    steps: [
      {
        id: `${id}-step-1`,
        stepType: "DECISION" as const,
        title: "Initial decision",
        narrative: prompt,
        choices: [
          { id: "recommended", label: recommended, feedback: "This response follows a controlled, traceable process.", principleTags: ["process", "evidence"], impact: [{ field: "quality", value: "recommended" }], nextStepId: `${id}-step-2`, quality: "RECOMMENDED" as const },
          { id: "risky", label: "Take the fastest informal action", feedback: "Speed can matter, but bypassing the process can leave risk and weak evidence.", principleTags: ["process"], impact: [{ field: "quality", value: "risky" }], nextStepId: `${id}-step-2`, quality: "RISKY" as const }
        ]
      },
      {
        id: `${id}-step-2`,
        stepType: "DECISION" as const,
        title: "Evidence decision",
        narrative: "What should the final record make clear?",
        choices: [
          { id: "recommended", label: "Who acted, what changed, when, result, and owner", feedback: "This creates a useful learning activity record.", principleTags: ["evidence"], impact: [{ field: "evidence", value: true }], quality: "RECOMMENDED" as const },
          { id: "incorrect", label: "Only that someone intended to handle it", feedback: "Intent alone is not enough to reconstruct the activity.", principleTags: ["evidence"], impact: [{ field: "evidence", value: false }], quality: "INCORRECT" as const }
        ]
      }
    ]
  });

  return [
    simple("scenario-unexpected-mfa", "Unexpected MFA Prompt", "Personnel", ["skill-access-management"], "course-annual-awareness", 3, "A sign-in prompt appears while you are not signing in.", "Deny and report through the approved channel"),
    simple("scenario-jordan-role-change-lab", "Jordan Role Change", "Access", ["skill-personnel-security", "skill-access-management"], "course-cip004-annual-refresher", 7, "Jordan transfers out of Operations and old access remains active.", "Open the approved access review process"),
    simple("scenario-emergency-vendor-access", "Emergency Vendor Access", "Access", ["skill-electronic-access", "skill-supply-chain"], "course-cip005-esp-access", 8, "A vendor requests urgent remote privileged access during degraded operations.", "Use approved remote access with scope, sponsor, duration, and evidence"),
    simple("scenario-after-hours-facility-entry", "After-Hours Facility Entry", "Physical Access", ["skill-physical-access"], "course-cip006-physical-security", 6, "A maintenance team arrives after hours and one person is not on the authorization list.", "Verify through the approved sponsor/security process"),
    simple("scenario-ops-srv-12-review", "OPS-SRV-12 Security Review", "System Security", ["skill-system-hardening", "skill-account-management", "skill-patch-management"], "course-cip007-system-security", 10, "A server has a legacy service, expired temporary admin, and patch awaiting evaluation.", "Prioritize active risk, ownership, lifecycle handling, and documentation"),
    unexpectedAdminConnectionScenario(),
    simple("scenario-recovery-procedure-failure", "Recovery Procedure Failure", "Recovery", ["skill-recovery"], "course-cip009-recovery-planning", 8, "A recovery procedure references retired storage during a restoration exercise.", "Escalate, update, and validate the recovery path"),
    simple("scenario-unauthorized-configuration-difference", "Unauthorized Configuration Difference", "Configuration", ["skill-configuration"], "course-cip010-change-vulnerability", 8, "A configuration difference appears after maintenance but is not in the approved change.", "Preserve the observation and determine whether authorization exists"),
    simple("scenario-wrong-recipient-sensitive-file", "Sensitive File Sent to Wrong Recipient", "Information Protection", ["skill-information-protection"], "course-cip011-information-protection", 5, "A sensitive file was sent to an unintended recipient.", "Promptly follow the applicable handling/reporting process"),
    simple("scenario-communication-circuit-change", "Communication Circuit Change", "Control-Center Communications", ["skill-control-center-comms"], "course-cip012-control-center-communications", 7, "A carrier route changes during a service migration.", "Review path, ownership, security design, and validation"),
    simple("scenario-vendor-permanent-admin", "Vendor Permanent Admin Account", "Supply Chain", ["skill-supply-chain", "skill-electronic-access"], "course-cip013-supply-chain", 7, "A vendor asks for a permanent shared administrator account.", "Route the request through security and access review"),
    simple("scenario-facility-construction-risk", "Facility Construction Risk Change", "Physical Risk", ["skill-physical-risk"], "course-cip014-physical-risk", 8, "Construction changes traffic flow, visibility, and visitor approach.", "Review changed facts, ownership, mitigations, and documentation"),
    simple("scenario-monitoring-blind-spot", "Monitoring Blind Spot", "Monitoring", ["skill-network-monitoring"], "course-cip015-insm", 8, "A critical segment has no clear monitoring visibility owner.", "Track the blind spot and route coverage review"),
    simple("scenario-audit-evidence-package", "Audit Evidence Package", "Audit Readiness", ["skill-audit-readiness", "skill-evidence-quality"], "course-audit-preparation", 12, "An evidence package has a missing approval, stale exception, wrong procedure version, and population mismatch.", "Identify gaps and create factual readiness actions")
  ];
}

function unexpectedAdminConnectionScenario(): Omit<ScenarioDefinition, "createdAt" | "updatedAt"> {
  return {
    id: "scenario-unexpected-admin-connection",
    title: "Unexpected Administrative Connection",
    description: "Work through an unusual internal administrative connection without jumping to unsupported conclusions.",
    category: "Incident Response",
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 10,
    relatedCourseIds: ["course-cip008-incident-response", "course-cip015-insm"],
    skillIds: ["skill-incident-recognition", "skill-network-monitoring", "skill-evidence-quality"],
    topicIds: ["skill-incident-recognition", "skill-network-monitoring"],
    initialState: { time: "02:12", source: "ENG-WS-22", destination: "OPS-SRV-04", protocol: "administrative management", schedule: "none visible" },
    repeatable: true,
    objectives: [
      { id: "admin-objective-preserve", label: "Preserve known event details", skillId: "skill-incident-recognition", required: true },
      { id: "admin-objective-verify", label: "Verify authorization before classification", skillId: "skill-network-monitoring", required: true },
      { id: "admin-objective-escalate", label: "Escalate factual observations", skillId: "skill-incident-response", required: true }
    ],
    workspaceType: "INCIDENT_CONSOLE",
    variantPool: [{ asset: "OPS-SRV-04", source: "ENG-WS-22" }, { asset: "OPS-SRV-17", source: "ENG-LT-08" }],
    resultRules: [
      { id: "admin-strong", result: "STRONG", minRecommendedChoices: 3 },
      { id: "admin-developing", result: "DEVELOPING", minRecommendedChoices: 2 }
    ],
    steps: [
      {
        id: "admin-step-1",
        stepType: "DECISION",
        title: "Initial signal",
        narrative: "Monitoring shows ENG-WS-22 connecting to OPS-SRV-04 at 02:12 using an administrative protocol. No maintenance is visible.",
        workspaceConfig: { facts: ["02:12", "ENG-WS-22", "OPS-SRV-04", "No visible maintenance"] },
        choices: [
          { id: "declare", label: "Immediately declare a confirmed cyber incident", feedback: "That may be premature. You have an unexpected connection, but not enough information for a final classification.", principleTags: ["verification"], impact: [{ field: "incidentDeclaredPrematurely", value: true }], nextStepId: "admin-step-premature", quality: "RISKY" },
          { id: "verify", label: "Preserve the information and verify whether activity is authorized", feedback: "Recommended. You preserve facts and move through an approved escalation/verification path.", principleTags: ["verification", "evidence"], impact: [{ field: "factsPreserved", value: true }], nextStepId: "admin-step-verified", quality: "RECOMMENDED" },
          { id: "ignore", label: "Ignore it unless another alert occurs", feedback: "Delaying escalation can allow important context to disappear.", principleTags: ["timeliness"], impact: [{ field: "delayedEscalation", value: true }], nextStepId: "admin-step-delayed", quality: "INCORRECT" }
        ]
      },
      {
        id: "admin-step-premature",
        stepType: "DECISION",
        narrative: "The response coordinator asks what evidence establishes malicious activity. At this point, the known fact is unexpected administrative activity.",
        choices: [
          { id: "facts", label: "Provide known facts and timestamps, not unsupported conclusions", feedback: "Good recovery. Factual status helps responders classify appropriately.", principleTags: ["factual integrity"], impact: [{ field: "factsProvided", value: true }], nextStepId: "admin-step-final", quality: "RECOMMENDED" },
          { id: "double-down", label: "Repeat that it must be malicious", feedback: "Unsupported conclusions can distract response and weaken the record.", principleTags: ["factual integrity"], impact: [{ field: "unsupportedConclusion", value: true }], nextStepId: "admin-step-final", quality: "RISKY" }
        ]
      },
      {
        id: "admin-step-verified",
        stepType: "DECISION",
        narrative: "The maintenance coordinator reports a vendor requested emergency work, but the normal schedule was not updated.",
        choices: [
          { id: "authorized-path", label: "Continue through approved verification and document the scheduling gap", feedback: "Recommended. The activity may have context, but the gap still needs review and documentation.", principleTags: ["verification", "documentation"], impact: [{ field: "scheduleGapDocumented", value: true }], nextStepId: "admin-step-final", quality: "RECOMMENDED" },
          { id: "close", label: "Close it immediately because a vendor was mentioned", feedback: "A partial explanation is not the same as completed verification.", principleTags: ["verification"], impact: [{ field: "closedEarly", value: true }], nextStepId: "admin-step-final", quality: "RISKY" }
        ]
      },
      {
        id: "admin-step-delayed",
        stepType: "DECISION",
        narrative: "Repeated administrative activity appears on another system. More context is now needed quickly.",
        choices: [
          { id: "escalate-now", label: "Escalate with all known facts and preserve the records", feedback: "This is now the best available response, though the delay reduced timeliness.", principleTags: ["timeliness", "evidence"], impact: [{ field: "lateEscalation", value: true }], nextStepId: "admin-step-final", quality: "ACCEPTABLE" },
          { id: "wait-more", label: "Continue waiting for more alerts", feedback: "Continued waiting increases risk and weakens response.", principleTags: ["timeliness"], impact: [{ field: "continuedDelay", value: true }], nextStepId: "admin-step-final", quality: "INCORRECT" }
        ]
      },
      {
        id: "admin-step-final",
        stepType: "DECISION",
        narrative: "What should the record retain for later review?",
        choices: [
          { id: "traceable-record", label: "Timestamps, systems, observed activity, contacts, actions, result, and open follow-up", feedback: "Recommended. This supports response continuity and later review.", principleTags: ["evidence"], impact: [{ field: "traceableRecord", value: true }], quality: "RECOMMENDED" },
          { id: "thin-record", label: "A note saying the alert was handled", feedback: "Too thin. Another reviewer may not understand what happened or why.", principleTags: ["evidence"], impact: [{ field: "thinRecord", value: true }], quality: "RISKY" }
        ]
      }
    ]
  };
}
