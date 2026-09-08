import { addDays, addMonths, subDays } from "date-fns";
import type { AppData, Course, CourseStatus, QuestionType, Role } from "./schema";
import { addFlagshipCip004Course } from "./flagshipCip004";

const password = "GridGuard-Local-2026!";

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function iso(date = new Date()) {
  return date.toISOString();
}

function record<T extends object>(prefix: string, item: T) {
  const createdAt = iso();
  return { id: makeId(prefix), createdAt, updatedAt: createdAt, ...item };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function emptyData(): AppData {
  return {
    organizations: [],
    users: [],
    userRoles: [],
    teams: [],
    teamMembers: [],
    groups: [],
    groupMembers: [],
    courses: [],
    courseOwners: [],
    courseContributors: [],
    courseVersions: [],
    courseAccessPolicies: [],
    courseAccessGrants: [],
    modules: [],
    lessons: [],
    contentBlocks: [],
    courseResources: [],
    learningObjectives: [],
    skills: [],
    courseSkills: [],
    userSkills: [],
    standards: [],
    standardVersions: [],
    standardReferences: [],
    courseStandardMappings: [],
    learningPaths: [],
    learningPathCourses: [],
    learningPathEnrollments: [],
    assignments: [],
    assignmentAudiences: [],
    enrollments: [],
    courseProgress: [],
    lessonProgress: [],
    assessments: [],
    questions: [],
    questionOptions: [],
    assessmentQuestions: [],
    assessmentAttempts: [],
    assessmentAnswers: [],
    scenarios: [],
    scenarioSteps: [],
    scenarioAttempts: [],
    certifications: [],
    certificationRequirements: [],
    userCertifications: [],
    reviews: [],
    reviewAssignments: [],
    reviewComments: [],
    approvals: [],
    evidenceRecords: [],
    acknowledgements: [],
    notifications: [],
    accessRequests: [],
    courseFeedback: [],
    auditEvents: [],
    applicationSettings: [],
    backupMetadata: [],
    activityTimeline: [],
    standardChangeReviews: []
  };
}

const cipTitles: Record<string, string> = {
  "CIP-002": "BES Cyber System Categorization",
  "CIP-003": "Security Management Controls",
  "CIP-004": "Personnel & Training",
  "CIP-005": "Electronic Security Perimeters",
  "CIP-006": "Physical Security",
  "CIP-007": "System Security Management",
  "CIP-008": "Incident Response",
  "CIP-009": "Recovery Planning",
  "CIP-010": "Configuration Change Management & Vulnerability Assessments",
  "CIP-011": "Information Protection",
  "CIP-012": "Communications Between Control Centers",
  "CIP-013": "Supply Chain Risk Management",
  "CIP-014": "Physical Security",
  "CIP-015": "Internal Network Security Monitoring"
};

export function createSeedData(): AppData {
  const data = emptyData();
  const organization = record("org", {
    name: "GridGuard Energy",
    slug: "gridguard-energy",
    timezone: "America/Los_Angeles",
    supportEmail: "support@gridguard.local",
    certificateOrgName: "GridGuard Learning",
    appSubtitle: "NERC CIP Training & Compliance Readiness",
    accentColor: "#0e7490"
  });
  data.organizations.push(organization);

  const teams = ["Cybersecurity", "Operations", "Compliance", "Physical Security", "IT Infrastructure"].map((name) =>
    record("team", { organizationId: organization.id, name, description: `${name} learning and readiness group.`, managerId: undefined as string | undefined })
  );
  data.teams.push(...teams);
  const teamByName = Object.fromEntries(teams.map((team) => [team.name, team]));

  const groups = ["CIP Compliance", "Privileged Access Users", "Incident Response Team", "New Hires", "Contractors"].map((name) =>
    record("group", { organizationId: organization.id, name, description: `${name} access and assignment group.` })
  );
  data.groups.push(...groups);
  const groupByName = Object.fromEntries(groups.map((group) => [group.name, group]));

  const users = [
    ["Taylor Morgan", "learner@gridguard.local", "Operations Specialist", "Operations", ["LEARNER"]],
    ["Morgan Chen", "manager@gridguard.local", "Operations Training Manager", "Operations", ["LEARNER", "MANAGER", "AUTHOR", "COURSE_OWNER"]],
    ["Riley Patel", "author@gridguard.local", "Course Author", "Cybersecurity", ["LEARNER", "AUTHOR", "COURSE_OWNER"]],
    ["Casey Nguyen", "compliance@gridguard.local", "Compliance Manager", "Compliance", ["LEARNER", "REVIEWER", "COMPLIANCE_MANAGER"]],
    ["Avery Brooks", "admin@gridguard.local", "Learning Administrator", "IT Infrastructure", ["LEARNER", "AUTHOR", "REVIEWER", "COMPLIANCE_MANAGER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]],
    ["Jamie Rivera", "jamie.rivera@gridguard.local", "Security Analyst", "Cybersecurity", ["LEARNER"]],
    ["Alex Harper", "alex.harper@gridguard.local", "Field Technician", "Operations", ["LEARNER"]],
    ["Samira Khan", "samira.khan@gridguard.local", "Physical Security Lead", "Physical Security", ["LEARNER", "MANAGER"]],
    ["Devon Stone", "devon.stone@gridguard.local", "Network Engineer", "IT Infrastructure", ["LEARNER"]],
    ["Priya Shah", "priya.shah@gridguard.local", "Compliance Analyst", "Compliance", ["LEARNER", "REVIEWER"]]
  ] as const;

  for (const [name, email, jobTitle, teamName, roles] of users) {
    const [firstName, ...last] = name.split(" ");
    const user = record("user", {
      organizationId: organization.id,
      email,
      password,
      firstName,
      lastName: last.join(" "),
      name,
      jobTitle,
      teamId: teamByName[teamName].id,
      status: "ACTIVE" as const,
      lastActiveAt: iso(subDays(new Date(), Math.floor(Math.random() * 9)))
    });
    data.users.push(user);
    data.teamMembers.push(record("tm", { teamId: teamByName[teamName].id, userId: user.id }));
    for (const role of roles) data.userRoles.push(record("role", { userId: user.id, role: role as Role }));
  }

  teamByName.Operations.managerId = data.users.find((user) => user.email === "manager@gridguard.local")?.id;
  teamByName.Compliance.managerId = data.users.find((user) => user.email === "compliance@gridguard.local")?.id;

  const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
  const manager = data.users.find((user) => user.email === "manager@gridguard.local")!;
  const author = data.users.find((user) => user.email === "author@gridguard.local")!;
  const compliance = data.users.find((user) => user.email === "compliance@gridguard.local")!;
  const admin = data.users.find((user) => user.email === "admin@gridguard.local")!;
  const priya = data.users.find((user) => user.email === "priya.shah@gridguard.local")!;
  const jamie = data.users.find((user) => user.email === "jamie.rivera@gridguard.local")!;

  for (const user of [learner, manager, compliance, priya]) {
    data.groupMembers.push(record("gm", { groupId: groupByName["CIP Compliance"].id, userId: user.id }));
  }
  for (const user of [jamie, admin]) data.groupMembers.push(record("gm", { groupId: groupByName["Privileged Access Users"].id, userId: user.id }));
  for (const user of [learner, data.users.find((u) => u.email === "alex.harper@gridguard.local")!]) {
    data.groupMembers.push(record("gm", { groupId: groupByName["New Hires"].id, userId: user.id }));
  }

  const skills = ["NERC CIP Awareness", "Personnel Risk", "Evidence Review", "Incident Response", "Access Management", "Configuration Governance"].map((name) =>
    record("skill", { organizationId: organization.id, name, description: `${name} capability demonstrated through training.`, level: "Foundational" })
  );
  data.skills.push(...skills);

  for (const [number, title] of Object.entries(cipTitles)) {
    const standard = record("std", {
      organizationId: organization.id,
      family: "NERC CIP",
      number,
      title,
      internalNotes: `${number} is tracked for course mapping and evidence coverage.`,
      lastReviewedAt: iso(subDays(new Date(), 20))
    });
    data.standards.push(standard);
    const version = record("stdv", {
      standardId: standard.id,
      version: "Current",
      status: "ENFORCED" as const,
      effectiveDate: iso(new Date("2026-01-01")),
      notes: `${number} current training interpretation.`
    });
    data.standardVersions.push(version);
    data.standardReferences.push(
      record("stdr", {
        standardVersionId: version.id,
        label: `${number} reference`,
        url: "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx",
        source: "NERC"
      })
    );
  }

  const getStandardVersion = (number: string) => data.standardVersions.find((v) => data.standards.find((s) => s.id === v.standardId)?.number === number)!;
  const courseMap = new Map<string, Course>();

  const addCourse = (input: {
    title: string;
    description: string;
    standard: string;
    accessMode: Course["accessMode"];
    status?: CourseStatus;
    duration: number;
    category?: string;
    difficulty?: string;
    showInCatalog?: boolean;
    allowSelfEnrollment?: boolean;
    allowAccessRequests?: boolean;
    grants?: Array<{ type: "USER" | "TEAM" | "GROUP" | "ROLE"; name: string }>;
    ownerId?: string;
    modules: Array<{ title: string; lessons: string[] }>;
    flagship?: boolean;
    certificate?: string;
  }) => {
    const course = record("course", {
      organizationId: organization.id,
      slug: slugify(input.title),
      title: input.title,
      shortDescription: input.description,
      category: input.category ?? "NERC CIP",
      difficulty: input.difficulty ?? "Foundational",
      estimatedMinutes: input.duration,
      status: input.status ?? "PUBLISHED",
      accessMode: input.accessMode,
      allowSelfEnrollment: input.accessMode === "OPEN" || Boolean(input.allowSelfEnrollment),
      showInCatalog: input.showInCatalog ?? input.accessMode !== "PRIVATE",
      allowAccessRequests: input.allowAccessRequests ?? input.accessMode === "RESTRICTED",
      requireManagerApproval: false,
      certificateEnabled: Boolean(input.certificate),
      ownerId: input.ownerId ?? author.id,
      icon: "ShieldCheck",
      accent: "#0e7490"
    }) as Course;
    data.courses.push(course);
    courseMap.set(course.title, course);
    data.courseOwners.push(record("owner", { courseId: course.id, userId: input.ownerId ?? author.id }));
    data.courseContributors.push(record("contrib", { courseId: course.id, userId: compliance.id, role: "REVIEWER" as Role }));
    data.courseAccessPolicies.push(record("policy", { courseId: course.id, mode: course.accessMode }));
    for (const grant of input.grants ?? []) {
      const grantId =
        grant.type === "TEAM"
          ? teamByName[grant.name].id
          : grant.type === "GROUP"
            ? groupByName[grant.name].id
            : grant.type === "ROLE"
              ? grant.name
              : data.users.find((user) => user.email === grant.name || user.name === grant.name)!.id;
      data.courseAccessGrants.push(record("grant", { courseId: course.id, grantType: grant.type, grantId }));
    }

    const version = record("version", {
      courseId: course.id,
      version: "1.0",
      status: course.status,
      summary: input.description,
      goal: `Prepare learners to apply ${input.standard} expectations in realistic work.`, 
      publishedAt: course.status === "PUBLISHED" ? iso(subDays(new Date(), 12)) : undefined,
      immutable: course.status === "PUBLISHED",
      completionRules: ["LESSONS", "ASSESSMENT"].concat(input.certificate ? ["CERTIFICATE"] : [])
    });
    data.courseVersions.push(version);
    course.currentVersionId = version.id;
    course.draftVersionId = version.id;

    input.modules.forEach((moduleInput, moduleIndex) => {
      const module = record("module", { courseVersionId: version.id, title: moduleInput.title, position: moduleIndex + 1 });
      data.modules.push(module);
      moduleInput.lessons.forEach((lessonTitle, lessonIndex) => {
        const lesson = record("lesson", {
          moduleId: module.id,
          courseVersionId: version.id,
          title: lessonTitle,
          slug: slugify(lessonTitle),
          position: lessonIndex + 1,
          required: true,
          estimatedMinutes: Math.max(6, Math.round(input.duration / Math.max(1, input.modules.flatMap((m) => m.lessons).length)))
        });
        data.lessons.push(lesson);
        const baseBlocks = input.flagship
          ? [
              ["heading", lessonTitle, `This lesson connects ${input.standard} expectations to day-to-day utility work.`],
              ["why", "Why This Matters", "Reliable evidence, trained personnel, and controlled access reduce compliance gaps before audit windows open."],
              ["objectives", "Learning Objectives", "Identify the requirement, apply the expected control, and recognize evidence that supports compliance readiness."],
              ["definition", "Definition", `${input.standard} terms are interpreted using internal procedures and current NERC guidance.`],
              ["procedure", "Procedure", "Review the work context, select the applicable control, document the decision, and retain evidence in the approved location."],
              ["checklist", "Checklist", "Confirm audience, prerequisite access, training date, assessment result, approval record, and retained evidence."],
              ["knowledge_check", "Knowledge Check", "Select the action that best supports repeatable compliance readiness."],
              ["key_takeaway", "Key Takeaway", "Training is valuable when the learner can perform the action and the organization can prove it later."]
            ]
          : [
              ["heading", lessonTitle, `Core concept for ${input.standard}.`],
              ["compliance_note", "Compliance Note", "Connect the learner action to documented evidence and accountable ownership."],
              ["example", "Example", "A complete record includes the learner, training version, date, result, and mapped requirement."]
            ];
        baseBlocks.forEach(([type, title, body], blockIndex) =>
          data.contentBlocks.push(record("block", { lessonId: lesson.id, type, title, body, position: blockIndex + 1 }))
        );
      });
    });

    const objective = record("obj", {
      courseVersionId: version.id,
      text: `Demonstrate foundational understanding of ${input.standard} ${cipTitles[input.standard] ?? "requirements"}.`,
      position: 1
    });
    data.learningObjectives.push(objective);
    data.courseStandardMappings.push(
      record("mapping", {
        courseId: course.id,
        standardVersionId: getStandardVersion(input.standard).id,
        objectiveId: objective.id,
        evidenceExpectation: "Completion record, assessment score, acknowledgement, and certificate where applicable."
      })
    );

    data.courseResources.push(
      record("resource", {
        courseId: course.id,
        title: `${input.standard} reference`,
        description: "NERC standards reference page.",
        type: "URL",
        url: "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx",
        visibility: "ENROLLED" as const
      })
    );

    const assessment = record("assess", {
      courseVersionId: version.id,
      title: `${input.title} Final Assessment`,
      instructions: "Answer each question. Passing score is 80%.",
      passingScore: 80,
      maxAttempts: 3,
      required: true
    });
    data.assessments.push(assessment);
    addQuestion(data, assessment.id, "MULTIPLE_CHOICE", `Which record best supports ${input.standard} training evidence?`, ["A dated completion record with version and learner", "A calendar invite only", "An unsigned checklist"], [0], "Evidence should identify who completed what, when, and against which version.");
    addQuestion(data, assessment.id, "TRUE_FALSE", "Training evidence should be retained after personnel changes.", ["True", "False"], [0], "Personnel changes do not remove historical evidence obligations.");
    addQuestion(data, assessment.id, "ORDERING", "Order the access lifecycle steps.", ["Authorize", "Train", "Grant access", "Review evidence"], [0, 1, 2, 3], "Access should follow approval and training, then be reviewed.");
    addQuestion(data, assessment.id, "MATCHING", "Match the item to its purpose.", ["Training record", "Standard mapping", "Audit event"], [0, 1, 2], "Each control needs traceable evidence.");

    if (input.certificate) {
      const certification = record("cert", {
        organizationId: organization.id,
        name: input.certificate,
        description: `${input.certificate} issued after required course completion.`,
        validityDays: 365,
        renewalWindowDays: 30,
        status: "ACTIVE" as const
      });
      data.certifications.push(certification);
      data.certificationRequirements.push(record("certreq", { certificationId: certification.id, type: "COURSE" as const, targetId: course.id }));
    }

    return course;
  };

  const cip004 = addFlagshipCip004Course(data, {
    organizationId: organization.id,
    ownerId: manager.id,
    reviewerId: compliance.id,
    operationsTeamId: teamByName.Operations.id,
    cipComplianceGroupId: groupByName["CIP Compliance"].id,
    standardVersionId: getStandardVersion("CIP-004").id
  });
  courseMap.set(cip004.title, cip004);
  courseMap.set("CIP-004 — Personnel & Training", cip004);

  const morganDraft = addCourse({
    title: "NERC CIP-004 Personnel Training Annual Refresher",
    description: "Annual refresher covering personnel risk, access lifecycle duties, training records, and repeatable CIP-004 evidence expectations.",
    standard: "CIP-004",
    accessMode: "RESTRICTED",
    status: "DRAFT",
    duration: 60,
    ownerId: manager.id,
    grants: [
      { type: "TEAM", name: "Operations" },
      { type: "GROUP", name: "CIP Compliance" }
    ],
    modules: [
      { title: "Personnel Risk Context", lessons: ["Annual personnel risk expectations", "Role changes and training triggers"] },
      { title: "Access Lifecycle", lessons: ["Authorization before access", "Revocation and transfer evidence"] },
      { title: "Training Records", lessons: ["Evidence package essentials"] },
      { title: "Final Assessment", lessons: ["Refresher assessment preparation"] }
    ]
  });

  const awareness = addCourse({
    title: "Annual NERC CIP Cybersecurity Awareness",
    description: "Annual cybersecurity awareness for grid operations personnel and supporting teams.",
    standard: "CIP-004",
    accessMode: "OPEN",
    duration: 75,
    flagship: true,
    certificate: "Annual NERC CIP Awareness Certificate",
    modules: [
      { title: "Security Fundamentals", lessons: ["Why Grid Cybersecurity Matters", "User Responsibilities", "Authentication", "Phishing"] },
      { title: "Operational Controls", lessons: ["Physical Security", "Information Handling", "Removable Media", "Remote Access"] },
      { title: "Response & Assurance", lessons: ["Incident Reporting", "Third Party Risk", "Assessment", "Acknowledgement"] }
    ]
  });

  const cip007 = addCourse({
    title: "NERC CIP-007 System Security Management",
    description: "Security patch, malicious code prevention, account management, and vulnerability management training.",
    standard: "CIP-007",
    accessMode: "RESTRICTED",
    ownerId: manager.id,
    duration: 50,
    grants: [
      { type: "TEAM", name: "Cybersecurity" },
      { type: "GROUP", name: "Privileged Access Users" }
    ],
    modules: [
      { title: "System Security Controls", lessons: ["Patch Governance", "Malicious Code Prevention", "Account Review"] },
      { title: "Vulnerability Management", lessons: ["Assessment Cadence", "Evidence Collection"] }
    ]
  });

  const cip005Review = addCourse({
    title: "NERC CIP-005 Electronic Security Perimeter Access",
    description: "Course for electronic security perimeter access authorization, monitoring expectations, and access evidence review.",
    standard: "CIP-005",
    accessMode: "RESTRICTED",
    status: "CHANGES_REQUESTED",
    ownerId: manager.id,
    duration: 55,
    grants: [
      { type: "TEAM", name: "Operations" },
      { type: "GROUP", name: "CIP Compliance" }
    ],
    modules: [
      { title: "ESP Access Context", lessons: ["ESP access authorization", "Interactive remote access considerations"] },
      { title: "Evidence and Review", lessons: ["Access review evidence", "Exception handling"] },
      { title: "Scenario", lessons: ["Access request decision scenario"] }
    ]
  });

  const incidentApproved = addCourse({
    title: "NERC CIP Incident Response Fundamentals",
    description: "Response-team fundamentals for recognizing, escalating, documenting, and learning from cybersecurity incidents.",
    standard: "CIP-008",
    accessMode: "RESTRICTED",
    status: "APPROVED",
    ownerId: manager.id,
    duration: 45,
    grants: [
      { type: "GROUP", name: "Incident Response Team" },
      { type: "GROUP", name: "CIP Compliance" }
    ],
    modules: [
      { title: "Incident Response Context", lessons: ["Recognizing reportable events", "Escalation roles"] },
      { title: "Response Evidence", lessons: ["Incident documentation", "Lessons learned"] },
      { title: "Final Assessment", lessons: ["Response readiness assessment"] }
    ]
  });

  addCourse({
    title: "Audit Preparation Workshop",
    description: "Prepare evidence packages, resolve gaps, and present repeatable compliance narratives.",
    standard: "CIP-003",
    accessMode: "RESTRICTED",
    duration: 45,
    grants: [{ type: "GROUP", name: "CIP Compliance" }],
    modules: [{ title: "Audit Readiness", lessons: ["Evidence Package Review", "Gap Remediation", "Auditor Walkthrough"] }]
  });

  addCourse({
    title: "Internal Draft Procedure Training",
    description: "Private draft procedure course visible only to owners and administrators.",
    standard: "CIP-010",
    accessMode: "PRIVATE",
    status: "DRAFT",
    duration: 30,
    showInCatalog: false,
    modules: [{ title: "Draft Procedure", lessons: ["Draft Handling Expectations"] }]
  });

  for (const number of Object.keys(cipTitles)) {
    if (["CIP-004", "CIP-005", "CIP-007", "CIP-008"].includes(number)) continue;
    addCourse({
      title: `${number} — ${cipTitles[number]}`,
      description: `Foundational course for ${number}: ${cipTitles[number]}.`,
      standard: number,
      accessMode: "OPEN",
      duration: 35,
      modules: [
        { title: `${number} Overview`, lessons: ["Requirement Context", "Control Responsibilities"] },
        { title: "Evidence", lessons: ["Evidence Expectations", "Readiness Review"] }
      ]
    });
  }

  const learningPathNames = [
    "NERC CIP Foundations",
    "BES Cyber System Privileged Access Qualification",
    "NERC CIP Incident Response Team Qualification",
    "NERC CIP Compliance & Audit Readiness",
    "Annual Cybersecurity Awareness"
  ];
  learningPathNames.forEach((title, index) => {
    const path = record("path", {
      organizationId: organization.id,
      title,
      description: `${title} learning sequence with tracked completion and evidence.`,
      slug: slugify(title),
      sequential: index !== 4
    });
    data.learningPaths.push(path);
    [awareness, cip004].forEach((course, position) => data.learningPathCourses.push(record("pathcourse", { learningPathId: path.id, courseId: course.id, required: true, position: position + 1 })));
    data.learningPathEnrollments.push(record("pathenroll", { learningPathId: path.id, userId: learner.id, progress: index === 0 ? 45 : 0, status: index === 0 ? "IN_PROGRESS" : "NOT_STARTED" }));
  });

  const assignment = record("assign", {
    organizationId: organization.id,
    title: "Required CIP-004 Personnel Training",
    targetType: "COURSE" as const,
    targetId: cip004.id,
    createdById: admin.id,
    dueAt: iso(addDays(new Date(), 14)),
    recurrence: "ANNUAL" as const,
    status: "ACTIVE" as const
  });
  data.assignments.push(assignment);
  data.assignmentAudiences.push(record("aud", { assignmentId: assignment.id, audienceType: "USER" as const, audienceId: learner.id }));
  const cip004CurrentLesson = data.lessons.find((lesson) => lesson.courseVersionId === cip004.currentVersionId && lesson.title === "Transfers, Promotions & Role Changes")!;
  data.enrollments.push(record("enroll", { organizationId: organization.id, userId: learner.id, courseId: cip004.id, assignmentId: assignment.id, status: "IN_PROGRESS" as const, startedAt: iso(subDays(new Date(), 6)), lastAccessedAt: iso(), currentLessonId: cip004CurrentLesson.id }));
  const cip004CompletedLessons = new Set(["People Are Part of the Security Boundary", "Your Role in Compliance Readiness", "Personnel Risk Fundamentals", "Roles, Responsibilities & Escalation", "Access Authorization"]);
  data.lessons
    .filter((lesson) => lesson.courseVersionId === cip004.currentVersionId && cip004CompletedLessons.has(lesson.title))
    .forEach((lesson) => data.lessonProgress.push(record("lessonprogress", { userId: learner.id, lessonId: lesson.id, completedAt: iso(subDays(new Date(), 1)) })));
  data.courseProgress.push(record("progress", { userId: learner.id, courseId: cip004.id, courseVersionId: cip004.currentVersionId!, status: "IN_PROGRESS" as const, percentComplete: 46 }));

  const cip007Assignment = record("assign", {
    organizationId: organization.id,
    title: "Required CIP-007 System Security Management",
    targetType: "COURSE" as const,
    targetId: cip007.id,
    createdById: manager.id,
    dueAt: iso(addDays(new Date(), 21)),
    assignedAt: iso(subDays(new Date(), 12)),
    recurrence: "ANNUAL" as const,
    notificationSettings: { notifyLearners: true, reminder7: true, reminder3: true, dueDate: true, managerOverdue: true },
    status: "ACTIVE" as const
  });
  data.assignments.push(cip007Assignment);
  data.assignmentAudiences.push(record("aud", { assignmentId: cip007Assignment.id, audienceType: "TEAM" as const, audienceId: teamByName.Operations.id }));
  const alex = data.users.find((user) => user.email === "alex.harper@gridguard.local")!;
  data.enrollments.push(record("enroll", { organizationId: organization.id, userId: alex.id, courseId: cip007.id, assignmentId: cip007Assignment.id, status: "IN_PROGRESS" as const, startedAt: iso(subDays(new Date(), 5)), lastAccessedAt: iso(subDays(new Date(), 1)), currentLessonId: data.lessons.find((lesson) => lesson.courseVersionId === cip007.currentVersionId)!.id }));
  data.courseProgress.push(record("progress", { userId: alex.id, courseId: cip007.id, courseVersionId: cip007.currentVersionId!, status: "IN_PROGRESS" as const, percentComplete: 45 }));
  completeCourseForSeed(data, organization.id, learner.id, cip007.id, 88);

  for (const completeCourse of [awareness, courseMap.get("CIP-002 — BES Cyber System Categorization")!]) {
    completeCourseForSeed(data, organization.id, learner.id, completeCourse.id, 92);
  }

  const overdue = courseMap.get("CIP-003 — Security Management Controls")!;
  const overdueAssignment = record("assign", {
    organizationId: organization.id,
    title: "Overdue Security Management Controls",
    targetType: "COURSE" as const,
    targetId: overdue.id,
    createdById: admin.id,
    dueAt: iso(subDays(new Date(), 5)),
    recurrence: "NONE" as const,
    status: "ACTIVE" as const
  });
  data.assignments.push(overdueAssignment);
  data.assignmentAudiences.push(record("aud", { assignmentId: overdueAssignment.id, audienceType: "USER" as const, audienceId: learner.id }));
  data.enrollments.push(record("enroll", { organizationId: organization.id, userId: learner.id, courseId: overdue.id, assignmentId: overdueAssignment.id, status: "OVERDUE" as const }));

  const reviewCourse = courseMap.get("Audit Preparation Workshop")!;
  const review = record("review", { courseVersionId: reviewCourse.currentVersionId!, status: "OPEN" as const, dueAt: iso(addDays(new Date(), 6)) });
  data.reviews.push(review);
  data.reviewAssignments.push(record("reviewassign", { reviewId: review.id, userId: compliance.id }));
  data.reviewComments.push(record("comment", { reviewId: review.id, authorId: compliance.id, body: "Add a stronger evidence retention example before publication.", blocking: true, status: "OPEN" as const, replies: [] }));

  const cip005ReviewRecord = record("review", {
    courseVersionId: cip005Review.currentVersionId!,
    status: "CHANGES_REQUESTED" as const,
    dueAt: iso(addDays(new Date(), 3)),
    submittedAt: iso(subDays(new Date(), 4)),
    message: "Please confirm this access course is ready for quarterly rollout.",
    requireAllReviewers: false
  });
  data.reviews.push(cip005ReviewRecord);
  data.reviewAssignments.push(record("reviewassign", { reviewId: cip005ReviewRecord.id, userId: compliance.id }));
  data.reviewAssignments.push(record("reviewassign", { reviewId: cip005ReviewRecord.id, userId: priya.id }));
  data.reviewComments.push(
    record("comment", { reviewId: cip005ReviewRecord.id, authorId: compliance.id, body: "Clarify the first action when access responsibilities change mid-cycle.", location: "Lesson: ESP access authorization", severity: "BLOCKING" as const, blocking: true, status: "OPEN" as const, replies: [] }),
    record("comment", { reviewId: cip005ReviewRecord.id, authorId: priya.id, body: "Add an evidence example showing requester, approver, date, and access scope.", location: "Compliance mapping", severity: "REQUIRED_CHANGE" as const, blocking: false, status: "OPEN" as const, replies: [] })
  );
  data.approvals.push(record("approval", { reviewId: cip005ReviewRecord.id, approverId: compliance.id, decision: "CHANGES_REQUESTED" as const, comment: "Resolve comments before publication." }));

  const incidentReview = record("review", {
    courseVersionId: incidentApproved.currentVersionId!,
    status: "APPROVED" as const,
    dueAt: iso(addDays(new Date(), 2)),
    submittedAt: iso(subDays(new Date(), 2)),
    message: "Ready for incident response rollout.",
    requireAllReviewers: false
  });
  data.reviews.push(incidentReview);
  data.reviewAssignments.push(record("reviewassign", { reviewId: incidentReview.id, userId: compliance.id }));
  data.approvals.push(record("approval", { reviewId: incidentReview.id, approverId: compliance.id, decision: "APPROVED" as const, comment: "Approved for publication." }));

  const changeStandard = data.standards.find((standard) => standard.number === "CIP-015")!;
  data.standardChangeReviews.push(
    record("stdchange", {
      standardId: changeStandard.id,
      oldVersion: "Internal Tracking",
      newVersion: "Future Enforcement",
      effectiveDate: iso(addMonths(new Date(), 6)),
      summary: "Evaluate internal network monitoring course impacts.",
      affectedCourseIds: [courseMap.get("CIP-015 — Internal Network Security Monitoring")!.id],
      ownerId: compliance.id,
      dueAt: iso(addDays(new Date(), 30)),
      status: "IMPACT_REVIEW" as const
    })
  );

  data.notifications.push(
    record("note", { userId: learner.id, type: "COURSE_ASSIGNED", title: "Training assigned", body: "CIP-004 Annual Refresher is due soon.", href: `/courses/${cip004.id}` }),
    record("note", { userId: author.id, type: "REVIEW_COMMENT", title: "Review comment", body: "A reviewer requested an evidence example.", href: `/build/courses/${reviewCourse.id}` }),
    record("note", { userId: compliance.id, type: "STANDARD_CHANGE", title: "Standard change review", body: "CIP-015 impact review is due this month.", href: "/standards" })
  );

  data.applicationSettings.push(
    record("setting", { key: "initialized", value: true }),
    record("setting", { key: "theme", value: "system" }),
    record("setting", { key: "sessionTimeoutHours", value: 8 }),
    record("setting", { key: "version", value: "0.1.0" })
  );

  data.auditEvents.push(
    record("audit", { organizationId: organization.id, actorId: admin.id, action: "DATA_RESTORED", objectType: "Application", objectId: organization.id, summary: "Demo learning environment initialized." }),
    record("audit", { organizationId: organization.id, actorId: author.id, action: "COURSE_PUBLISHED", objectType: "Course", objectId: cip004.id, summary: "Published CIP-004 flagship course." }),
    record("audit", { organizationId: organization.id, actorId: admin.id, action: "ASSIGNMENT_CREATED", objectType: "Assignment", objectId: assignment.id, summary: "Assigned CIP-004 to Taylor Morgan." })
  );

  return data;
}

function addQuestion(data: AppData, assessmentId: string, type: QuestionType, prompt: string, options: string[], correctIndexes: number[], explanation: string) {
  const question = record("question", { type, prompt, explanation, difficulty: "Foundational", tags: ["NERC CIP"] });
  data.questions.push(question);
  options.forEach((text, index) =>
    data.questionOptions.push(
      record("option", {
        questionId: question.id,
        text,
        isCorrect: correctIndexes.includes(index),
        position: index + 1,
        match: type === "MATCHING" ? ["Proof", "Traceability", "Governance"][index] : undefined
      })
    )
  );
  data.assessmentQuestions.push(record("aq", { assessmentId, questionId: question.id, points: 1, position: data.assessmentQuestions.filter((item) => item.assessmentId === assessmentId).length + 1 }));
}

function completeCourseForSeed(data: AppData, organizationId: string, userId: string, courseId: string, score: number) {
  const course = data.courses.find((item) => item.id === courseId)!;
  const version = data.courseVersions.find((item) => item.id === course.currentVersionId)!;
  const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === version.id);
  const completedAt = iso(subDays(new Date(), 18));
  data.enrollments.push(record("enroll", { organizationId, userId, courseId, status: "COMPLETED" as const, startedAt: iso(subDays(new Date(), 22)), lastAccessedAt: completedAt, completedAt }));
  data.courseProgress.push(record("progress", { userId, courseId, courseVersionId: version.id, status: "COMPLETED" as const, percentComplete: 100, completedAt }));
  lessons.forEach((lesson) => data.lessonProgress.push(record("lessonprogress", { userId, lessonId: lesson.id, completedAt })));
  const assessment = data.assessments.find((item) => item.courseVersionId === version.id);
  if (assessment) data.assessmentAttempts.push(record("attempt", { userId, assessmentId: assessment.id, courseId, score, passed: true, submittedAt: completedAt, attemptNumber: 1 }));
  let certificateId: string | undefined;
  const requirement = data.certificationRequirements.find((item) => item.type === "COURSE" && item.targetId === courseId);
  if (requirement) {
    certificateId = `GG-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    data.userCertifications.push(record("usercert", { userId, certificationId: requirement.certificationId, courseId, certificateId, issuedAt: completedAt, expiresAt: iso(addDays(new Date(completedAt), 365)), status: "ACTIVE" as const }));
  }
  const user = data.users.find((item) => item.id === userId)!;
  data.evidenceRecords.push(
    record("evidence", {
      organizationId,
      userId,
      userDisplayName: user.name,
      courseId,
      courseTitle: course.title,
      courseVersionId: version.id,
      completedAt,
      assessmentScore: score,
      certificationId: requirement?.certificationId,
      certificateId,
      acknowledgementText: "I acknowledge my responsibilities for NERC CIP compliance readiness.",
      standardRefs: data.courseStandardMappings.filter((mapping) => mapping.courseId === courseId).map((mapping) => mapping.standardVersionId),
      status: "CURRENT" as const
    })
  );
}
