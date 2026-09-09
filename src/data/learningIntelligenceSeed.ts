import { addDays, subDays } from "date-fns";
import type { AppData, PracticeActivity, ScenarioDefinition, Skill } from "./schema";

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
        recommendationWeight: 1
      }));
    }
  });

  const scenarioDefs = buildScenarios();
  const existingScenarios = new Set(data.scenarioDefinitions.map((scenario) => scenario.id));
  scenarioDefs.forEach((scenario) => {
    if (!existingScenarios.has(scenario.id)) data.scenarioDefinitions.push(stamp(scenario));
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

  if (!data.applicationSettings.some((setting) => setting.key === "learningIntelligenceVersion")) {
    data.applicationSettings.push(stamp({ id: "setting_learning_intelligence_version", key: "learningIntelligenceVersion", value: 1 }));
  }

  return data;
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
