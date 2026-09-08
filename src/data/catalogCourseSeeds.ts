import { addDays, subDays } from "date-fns";
import type { AppData, Course, CourseStatus, QuestionType, Role } from "./schema";

type EntityMap = Record<string, { id: string }>;

export type CatalogSeedContext = {
  organizationId: string;
  ownerId: string;
  reviewerId: string;
  standardVersionByNumber: (number: string) => { id: string };
  teams: EntityMap;
  groups: EntityMap;
};

type LessonDef = {
  id: string;
  title: string;
  minutes: number;
  blocks: BlockDef[];
};

type BlockDef = {
  type: string;
  title?: string;
  body?: string;
  data?: unknown;
  required?: boolean;
};

type CourseDef = {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle: string;
  description: string;
  standard: string;
  duration: number;
  difficulty: string;
  icon: string;
  accessMode?: Course["accessMode"];
  status?: CourseStatus;
  showInCatalog?: boolean;
  certificate?: string;
  audience: string;
  objectives: string[];
  skills: string[];
  resources: Array<{ title: string; description: string }>;
  grants?: Array<{ type: "TEAM" | "GROUP" | "ROLE"; name: string }>;
  modules: Array<{ title: string; intro: string; lessons: LessonDef[] }>;
  assessmentCount: number;
};

function iso(date = new Date()) {
  return date.toISOString();
}

function stableRecord<T extends object>(idValue: string, item: T) {
  const createdAt = iso(subDays(new Date(), 14));
  return { id: idValue, createdAt, updatedAt: iso(subDays(new Date(), 1)), ...item };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const kc = (question: string, answers: string[], correct: number, explanation: string): BlockDef => ({
  type: "knowledge_check",
  title: "Knowledge Check",
  data: { question, answers, correct, correctFeedback: `Correct. ${explanation}`, incorrectFeedback: explanation, allowRetry: true }
});

const classify = (title: string, instruction: string, items: Array<[string, string]>): BlockDef => ({
  type: "classification",
  title,
  required: true,
  data: { instruction, categories: ["EXPECTED", "REVIEW", "ESCALATE", "DOCUMENT"], items: items.map(([text, correct]) => ({ text, correct })) }
});

const scenario = (title: string, situation: string, steps: Array<{ question: string; options: string[]; correct: number; feedback: string }>): BlockDef => ({
  type: "scenario",
  title,
  required: true,
  data: { label: "APPLIED SCENARIO", situation, steps, result: "You applied the course concepts to a realistic operating decision and selected the action that preserves process integrity and traceability." }
});

const evidence = (prompt: string, options: string[], correct: number[]): BlockDef => ({
  type: "evidence_builder",
  title: "Build the Evidence Record",
  required: true,
  data: { prompt, options, correct, success: "Strong record. The selections preserve who, what, when, outcome, and accountable context.", retry: "Focus on fields that would help another qualified person understand the activity later." }
});

function standardQuestions(course: CourseDef): Array<{ type: QuestionType; prompt: string; options: string[]; correct: number[]; explanation: string; topic: string }> {
  const base = [
    {
      type: "MULTIPLE_CHOICE" as QuestionType,
      prompt: `What is the best reason to use the approved ${course.standard} process described in this course?`,
      options: ["It creates a consistent basis for decisions and records.", "It lets learners skip approvals when work is urgent.", "It replaces the need for responsible owners.", "It makes evidence optional."],
      correct: [0],
      explanation: "Approved processes create repeatable decisions and traceable records.",
      topic: "Process"
    },
    {
      type: "MULTIPLE_CHOICE" as QuestionType,
      prompt: `Which evidence package best supports ${course.standard} readiness?`,
      options: ["A brief note that says done.", "A record with owner, date, scope, result, and supporting reference.", "A screenshot with no date or owner.", "A verbal explanation only."],
      correct: [1],
      explanation: "Useful evidence connects the responsible person, timing, scope, result, and source.",
      topic: "Evidence"
    },
    {
      type: "TRUE_FALSE" as QuestionType,
      prompt: "A learner should escalate uncertainty through the approved path instead of inventing a local workaround.",
      options: ["True", "False"],
      correct: [0],
      explanation: "Escalation protects consistency and allows the right owner to decide.",
      topic: "Escalation"
    },
    {
      type: "SCENARIO" as QuestionType,
      prompt: `${course.title}: a required record is incomplete and the deadline is near. What is the best response?`,
      options: ["Backfill details that cannot be verified.", "Hide the incomplete record.", "Escalate the gap and document the factual status.", "Mark the activity complete without review."],
      correct: [2],
      explanation: "Readiness work should preserve factual integrity and route gaps to accountable owners.",
      topic: "Scenario"
    }
  ];
  return Array.from({ length: course.assessmentCount }, (_, index) => {
    const seed = base[index % base.length];
    return index < base.length ? seed : {
      ...seed,
      prompt: `${course.standard} application ${index + 1}: ${seed.prompt}`,
      topic: `${seed.topic} ${Math.ceil((index + 1) / 3)}`
    };
  });
}

function courseDefinitionList(): CourseDef[] {
  return [
    course("course-cip002-categorization", "CIP-002 — BES Cyber System Categorization", "Understanding impact, scope, and repeatable categorization decisions", "CIP-002", 55, "Intermediate", "Network", "BES Cyber System Categorization", ["operations", "cybersecurity", "asset owners", "system owners", "compliance personnel"], [
      ["Scope Comes First", "Before an organization can apply security requirements consistently, it needs a repeatable understanding of which assets and systems are in scope. Categorization creates that foundation. A decision should follow the organization's approved methodology and applicable criteria.", classify("Scope Decision Inputs", "Classify each input by how it supports categorization.", [["Documented system function", "DOCUMENT"], ["Unknown owner", "REVIEW"], ["Architecture changed last week", "ESCALATE"], ["Current approved methodology", "DOCUMENT"]])],
      ["Asset, System, Function & Impact", "Physical assets perform functions, cyber assets support operations, and systems can consist of related components. Categorization evaluates applicable criteria through organizational procedures.", evidence("Which fields make a categorization record traceable?", ["Asset/system", "Operational function", "Owner", "Assessment date", "Methodology version", "Reviewer", "Favorite browser"], [0, 1, 2, 3, 4, 5])],
      ["Categorization Decision Scenario", "A previously isolated support application is modified to provide a new operational function and gains new connectivity.", scenario("Categorization Reevaluation", "A support application now exchanges operational data and has a new network dependency.", [{ question: "What changed?", options: ["Only the name", "Function and connectivity", "The wallpaper", "No relevant facts"], correct: 1, feedback: "Function and connectivity can affect scope assumptions." }, { question: "What should happen?", options: ["Assume old categorization remains valid", "Route through approved reevaluation", "Delete prior records", "Self-declare impact without review"], correct: 1, feedback: "Changed facts should flow through approved reevaluation." }])]
    ], 10, ["BES Cyber System Categorization", "Asset Scope", "Evidence Review"]),
    course("course-cip003-security-management", "CIP-003 — Security Management Controls", "Governance, ownership, policy, responsibility, and sustainable control execution", "CIP-003", 60, "Intermediate", "ClipboardCheck", "Security Governance", ["control owners", "managers", "security", "compliance"], [
      ["Policy, Process & Accountability", "A policy states organizational expectation. A procedure explains how work is performed. Evidence demonstrates that the expected work occurred. These should reinforce one another.", classify("Policy, Procedure, or Evidence", "Classify each governance artifact.", [["Passwords must meet organizational requirements.", "EXPECTED"], ["Open IAM console and perform the quarterly review.", "DOCUMENT"], ["Quarterly access review completed March 28 by Casey Nguyen.", "DOCUMENT"]])],
      ["Ownership Matters", "Security procedures become sustainable when accountability is explicit. A responsibility chain connects executive accountability, program ownership, control ownership, contributors, and evidence monitoring.", scenario("Unowned Review", "A quarterly review procedure exists, but nobody knows who owns it.", [{ question: "Best next step?", options: ["Assume security owns it", "Establish accountable ownership", "Stop reviewing", "Delete the procedure"], correct: 1, feedback: "Accountable ownership is required for sustainable control operation." }])],
      ["Exceptions & Compensating Decisions", "Exceptions should be intentional, approved, documented, reviewed, and time-bounded where appropriate. Hidden exceptions weaken governance.", kc("Which exception handling approach is strongest?", ["Ignore limitation", "Document approved exception and alternative handling", "Remove evidence", "Let each team decide privately"], 1, "Exceptions need approved, traceable handling.")]
    ], 12, ["Security Governance", "Control Ownership", "Exception Management"]),
    course("course-cip004-foundations", "CIP-004 — Personnel & Training Foundations", "Foundational personnel-security concepts for new employees and contractors", "CIP-004", 35, "Foundational", "UserCheck", "Personnel Security Foundations", ["new employees", "contractors", "support personnel"], [
      ["Why People Matter", "Security controls are operated, approved, maintained, and monitored by people. Personnel security establishes expectations for responsibilities, access, and changes.", kc("Appropriate access should be based primarily on what?", ["Tenure", "Current responsibilities and approved need", "Personal preference", "Whether access still functions"], 1, "Access should reflect current responsibilities and approved need.")],
      ["Training & Awareness", "Awareness helps personnel recognize risks and expectations. Training develops knowledge needed for assigned responsibilities. Evidence demonstrates completion.", evidence("Which fields support a basic training record?", ["Learner", "Course", "Version", "Completion date", "Assessment result", "Lunch preference"], [0, 1, 2, 3, 4])],
      ["Complete, Report, Ask", "Learners support readiness by completing assigned training, reporting relevant changes, and asking when uncertain.", scenario("Inherited Access", "A new employee discovers access inherited from a previous contractor profile.", [{ question: "Best response?", options: ["Use it quietly", "Report through approved process", "Save it for later", "Change the access personally"], correct: 1, feedback: "Unexpected access should be raised through the approved path." }])]
    ], 8, ["Personnel Responsibility", "Training Evidence"]),
    course("course-cip004-supervisor-workshop", "CIP-004 — Supervisor & Access Owner Workshop", "Manager-focused workshop for personnel changes, approvals, and evidence decisions", "CIP-004", 50, "Advanced", "UsersRound", "Personnel Change Workshop", ["supervisors", "managers", "system owners", "access approvers"], [
      ["Events That Require Attention", "New hires, transfers, promotions, temporary assignments, leave, contractor end dates, terminations, and privilege changes can affect training, physical access, electronic access, role assignment, and documentation.", classify("Downstream Process Impact", "Select the strongest action category.", [["Contractor engagement ends", "ESCALATE"], ["Temporary access reaches end date", "REVIEW"], ["New role requires different training", "DOCUMENT"], ["Privilege change requested", "REVIEW"]])],
      ["Manager Approval Is More Than Clicking Approve", "A useful approval demonstrates that the approver understood the request, business need, scope, and responsibility associated with the requested access.", kc("Which approval note is strongest?", ["Approved.", "Looks fine.", "Approved elevated maintenance access to System X for Riley Patel through October 15 to support planned upgrade activity.", "Give access."], 2, "The stronger approval captures who, what, why, and duration.")],
      ["Personnel Change Workshop", "Alex moves from field operations to planning. The supervisor must identify changed responsibilities, access requiring review, training implications, evidence, and closure steps.", scenario("Supervisor Role Change", "Alex moves from field operations to planning and no longer performs field control support.", [{ question: "What should the supervisor identify first?", options: ["Favorite tools", "Changed responsibilities", "Vacation schedule", "Old passwords"], correct: 1, feedback: "Changed responsibilities drive access and training review." }])]
    ], 8, ["Manager Validation", "Access Approval"], "RESTRICTED", "PUBLISHED", undefined),
    course("course-annual-awareness", "Annual NERC CIP Cybersecurity Awareness", "Everyday cybersecurity behavior for personnel supporting reliable grid operations", "CIP-004", 70, "Foundational", "ShieldCheck", "Cybersecurity Awareness", ["broad CIP-aware population"], [
      ["Why Grid Cybersecurity Matters", "Electric reliability depends on interconnected technology and people. Awareness helps personnel recognize behavior or conditions that could put systems, information, or operations at unnecessary risk.", kc("Who has cybersecurity responsibilities?", ["Only security staff", "Everyone according to role", "Only managers", "Only vendors"], 1, "Everyone has responsibilities appropriate to their role.")],
      ["Authentication & Credential Protection", "Unique credentials, approved MFA, password managers where approved, and prompt reporting of unexpected prompts reduce identity risk.", scenario("Unexpected MFA Prompt", "An MFA notification arrives while you are not signing in.", [{ question: "Best response?", options: ["Approve to clear it", "Deny and report", "Ignore forever", "Share password"], correct: 1, feedback: "Unexpected MFA prompts should be denied and reported." }])],
      ["Phishing & Social Engineering", "Suspicious messages often combine urgency, unknown senders, lookalike domains, unexpected attachments, and threats.", classify("Email Red Flags", "Classify each message signal.", [["Unknown sender with urgent password demand", "ESCALATE"], ["Expected meeting invite from known contact", "EXPECTED"], ["Unexpected attachment requiring macros", "ESCALATE"], ["Lookalike domain", "REVIEW"]])],
      ["Awareness Capstone", "Rapid situations require learners to proceed, stop and verify, or report.", scenario("Rapid-Fire Awareness", "You face unexpected MFA, unknown USB media, a suspicious visitor, and a planned remote access session.", [{ question: "Unknown USB found outside the facility.", options: ["Connect it", "Follow reporting process", "Give it away", "Ignore all media controls"], correct: 1, feedback: "Unknown media should not be connected." }])]
    ], 15, ["Credential Protection", "Phishing Recognition", "Incident Reporting"]),
    course("course-cip005-esp-access", "CIP-005 — Electronic Security Perimeter Access", "Controlled electronic access, remote connectivity, and evidence", "CIP-005", 65, "Intermediate", "Network", "Electronic Access Control", ["network engineers", "operations", "cybersecurity", "remote-access administrators"], [
      ["Understanding Electronic Security Boundaries", "Electronic access controls depend on known boundaries, controlled access points, approved pathways, visibility, and ownership.", { type: "process_diagram", title: "Controlled Path", data: { stages: ["Outside / Untrusted", "Controlled Access Point", "Protected Environment"], caption: "Access should use known approved paths." } }],
      ["Interactive Remote Access Considerations", "Remote access should use approved methods, authorization, authentication, session controls, monitoring, and time-bounded support where appropriate.", scenario("Alternate Remote Tool", "A vendor requests an alternate remote tool because the approved service is slow.", [{ question: "Best response?", options: ["Bypass the approved service", "Use approved escalation path", "Share credentials", "Disable logging"], correct: 1, feedback: "Urgency does not justify an unapproved bypass." }])],
      ["Access Review Evidence", "Authorization evidence, access logs, review evidence, exceptions, and configuration records answer different future questions.", evidence("Which fields support remote-access review?", ["User", "Purpose", "Approval", "Access method", "Date", "Review result", "Favorite color"], [0, 1, 2, 3, 4, 5])]
    ], 12, ["Remote Access", "ESP Evidence"], "RESTRICTED", "PUBLISHED"),
    course("course-cip006-physical-security", "CIP-006 — Physical Security of BES Cyber Systems", "Physical access control, visitor handling, monitoring, and access evidence", "CIP-006", 55, "Foundational", "Building2", "Physical Access", ["operations", "physical security", "facility personnel", "authorized visitors"], [
      ["Why Physical Access Matters", "Cybersecurity controls can be undermined when unauthorized physical access exposes systems, ports, media, consoles, or infrastructure.", kc("A coworker forgot a badge and asks you to let them through. Best response?", ["Let them in", "Follow approved access or visitor process", "Loan your badge", "Ignore all entry controls"], 1, "Controlled entry should follow the approved process.")],
      ["Visitor Handling", "Visitor access should have request, approval, identity verification, entry, escort or control as applicable, exit, and record steps.", { type: "timeline", title: "Visitor Access Flow", data: { steps: ["Request", "Approval", "Identity verification", "Entry", "Escort/control", "Exit", "Record"] } }],
      ["Tailgating & Social Pressure", "A familiar vendor carrying equipment asks you to hold a controlled door.", scenario("Controlled Door Decision", "A familiar vendor is behind you at a controlled entry point and asks you to hold the door.", [{ question: "Best response?", options: ["Hold the door", "Use approved visitor/access process", "Wave them through", "Disable alarm"], correct: 1, feedback: "Familiarity does not replace the approved entry process." }])]
    ], 10, ["Physical Access", "Visitor Handling"]),
    course("course-cip007-system-security", "CIP-007 — System Security Management", "Secure system operation from ports and patches to accounts and malicious-code defenses", "CIP-007", 75, "Intermediate", "ServerCog", "System Security Management", ["system administrators", "security engineers", "infrastructure teams", "OT personnel"], [
      ["Ports & Services", "Every enabled service expands what a system can do and what must be managed. A strong process understands which services are required, why, and what happens when need changes.", classify("Service Review Table", "Classify each service entry.", [["SSH - required admin channel", "EXPECTED"], ["Legacy FTP - no owner", "REVIEW"], ["Web admin - approved", "EXPECTED"], ["Unused remote tool", "ESCALATE"]])],
      ["Security Patch Evaluation", "Security patch governance includes identify, evaluate applicability, assess risk, plan, implement or mitigate, verify, and document. Specific timing belongs to the approved procedure.", scenario("Patch Constraint", "A security patch is released for an operational server, but maintenance constraints prevent immediate installation.", [{ question: "Best response?", options: ["Ignore it", "Document evaluation and approved mitigation or plan", "Install unsafely without process", "Delete the notice"], correct: 1, feedback: "Use approved evaluation and risk handling." }])],
      ["Account Review Activity", "Account review identifies active admins with owners, former contractors, service accounts without owners, duplicate privilege, and standard users.", classify("Account Inventory Review", "Flag each account state.", [["Named admin with owner", "EXPECTED"], ["Former contractor", "ESCALATE"], ["Service account no owner", "REVIEW"], ["Duplicate privileged account", "REVIEW"]])],
      ["System Security Evidence Package", "A useful package can include patch evaluation, configuration record, account review, malicious-code control state, and vulnerability assessment.", evidence("Which records belong in a system-security package?", ["Patch evaluation", "Configuration record", "Account review", "Malicious-code control state", "Vulnerability assessment", "Team lunch menu"], [0, 1, 2, 3, 4])]
    ], 15, ["Patch Governance", "Account Management", "Vulnerability Management"], "RESTRICTED", "PUBLISHED"),
    course("course-cip008-incident-response", "CIP-008 — Incident Response Fundamentals", "Recognize, report, coordinate, document, recover, and learn", "CIP-008", 70, "Intermediate", "Siren", "Incident Response", ["incident responders", "operations", "security", "IT", "managers"], [
      ["Event, Alert, Incident?", "Learners should recognize expected events, items requiring investigation, and items that should be escalated without making formal reportability determinations outside their role.", classify("Signal Classifier", "Classify each event signal.", [["Planned maintenance alert", "EXPECTED"], ["Unknown remote connection", "ESCALATE"], ["Failed login spike", "REVIEW"], ["Security-tool test", "EXPECTED"]])],
      ["Preserve Useful Information", "Useful incident information includes timestamps, systems, observed behavior, actions taken, alerts, and responsible people.", evidence("What should an initial incident note capture?", ["Time", "System", "Observed behavior", "Actions taken", "Reporter", "Speculation presented as fact"], [0, 1, 2, 3, 4])],
      ["Incident Timeline", "Incident records are easier to review when detection, report, triage, containment/action, recovery, closure, and lessons learned are ordered.", { type: "timeline", title: "Incident Timeline", data: { steps: ["Detection", "Report", "Triage", "Containment/action", "Recovery", "Closure", "Lessons learned"] } }],
      ["Night Shift Remote Activity", "Unusual remote account activity appears during night shift.", scenario("Incident Response Capstone", "A night-shift operator notices an unexpected remote connection and an authentication alert.", [{ question: "Best first action?", options: ["Wait until morning", "Raise through response process and preserve context", "Delete logs", "Declare final root cause"], correct: 1, feedback: "Early escalation and preserved context support response." }])]
    ], 12, ["Incident Reporting", "Evidence Capture"], "RESTRICTED", "PUBLISHED"),
    course("course-cip009-recovery-planning", "CIP-009 — Recovery Planning", "Preparing for reliable restoration before disruption occurs", "CIP-009", 60, "Intermediate", "LifeBuoy", "Recovery Planning", ["operations", "IT", "system owners", "recovery teams"], [
      ["Recovery Is Planned Before the Event", "A recovery plan is most useful when responsibilities, dependencies, procedures, resources, and validation expectations are understood before disruption.", kc("When is recovery readiness primarily built?", ["During improvisation", "Before disruption", "After evidence is lost", "Only after audit"], 1, "Recovery readiness is planned and validated before disruption.")],
      ["Backup Is Not the Same as Recovery", "A backup is valuable only when it can support the intended recovery objective. Validation connects backup existence to actual restoration capability.", classify("Recovery Dependency Map", "Classify each dependency.", [["Current configuration backup", "DOCUMENT"], ["Retired storage reference", "REVIEW"], ["Unknown identity dependency", "ESCALATE"], ["Validated procedure", "EXPECTED"]])],
      ["Recovery Exercise Evidence", "A recovery exercise record should preserve plan/version, date, participants, scope, result, issues, and corrective actions.", evidence("Which fields support recovery exercise evidence?", ["Plan/version", "Date", "Participants", "Scope", "Result", "Corrective actions", "Office snack"], [0, 1, 2, 3, 4, 5])]
    ], 12, ["Recovery Planning", "Exercise Evidence"]),
    course("course-cip010-change-vulnerability", "CIP-010 — Configuration Change Management & Vulnerability Assessments", "Configuration baselines, controlled change, monitoring, vulnerability assessment, and evidence", "CIP-010", 75, "Advanced", "GitCompare", "Change Management", ["system administrators", "security engineers", "OT engineers", "change managers"], [
      ["Know the Expected State", "A baseline captures approved components, configuration, services, software, security settings, and ownership. Change updates expected state through approved control.", { type: "process_diagram", title: "Configuration State Flow", data: { stages: ["Expected State", "Approved Change", "Validated New State", "Updated Baseline"], caption: "Baseline records should follow approved change." } }],
      ["A Change Is More Than Implementation", "A controlled change includes request, impact/risk review, approval, implementation, verification, documentation, and baseline update.", kc("Which change path is strongest?", ["Implement first and decide later", "Request, review, approve, implement, verify, document", "Skip verification", "Avoid baseline updates"], 1, "Controlled changes preserve approval and validation.")],
      ["Emergency Change Scenario", "A service outage requires urgent configuration change.", scenario("Emergency Change", "Operations needs an urgent configuration change to restore service.", [{ question: "Best response?", options: ["Make invisible change", "Use emergency-change path and document afterward as required", "Delete logs", "Bypass all review permanently"], correct: 1, feedback: "Urgency should use the approved emergency path." }])],
      ["Vulnerability Finding Lifecycle", "Findings move from new to evaluated, assigned, remediation, verified, and closed with ownership and evidence.", { type: "timeline", title: "Finding Lifecycle", data: { steps: ["New", "Evaluated", "Assigned", "Remediation", "Verified", "Closed"] } }]
    ], 15, ["Configuration Baseline", "Vulnerability Management"]),
    course("course-cip011-information-protection", "CIP-011 — Information Protection", "Recognize, handle, protect, and dispose of sensitive BES Cyber System information", "CIP-011", 55, "Foundational", "FileLock2", "Information Protection", ["operations", "security", "engineers", "document owners"], [
      ["Sensitive Information in Everyday Work", "Architecture diagrams, configuration exports, credentials, security settings, logs, recovery details, and access lists may require controlled handling based on organizational classification.", kc("Before sharing a potentially sensitive document, what should you confirm?", ["Who needs it and approved handling path", "Whether it is convenient", "Whether a personal account is faster", "Nothing"], 0, "Sharing should follow approved need and handling rules.")],
      ["Know Before You Share", "Ask what it is, who needs it, where it may be stored, how it may be transmitted, and how long it should remain.", scenario("Wrong Recipient", "A sensitive internal document was emailed to an unintended recipient.", [{ question: "Best response?", options: ["Silently delete local sent copy", "Follow incident/data-handling process promptly", "Forward more copies", "Ignore it"], correct: 1, feedback: "Prompt reporting supports appropriate handling." }])],
      ["Disposal Decision Activity", "Media and records should move through approved handling from create/use to store, transport, reuse, and dispose.", classify("Disposal Handling", "Classify each item.", [["Paper printout with sensitive details", "ESCALATE"], ["Failed drive", "ESCALATE"], ["Old exported report", "REVIEW"], ["Public brochure", "EXPECTED"]])]
    ], 10, ["Information Handling", "Disposal"]),
    course("course-cip012-control-center-communications", "CIP-012 — Communications Between Control Centers", "Protecting sensitive operational communications and understanding communication paths", "CIP-012", 55, "Intermediate", "RadioTower", "Communications Protection", ["network", "telecommunications", "control-center engineering", "security"], [
      ["Control-Center Communications Matter", "Important operational data moves across communication paths. Protection depends on knowing endpoints, path, ownership, technology, controls, and dependencies.", { type: "process_diagram", title: "Communication Path", data: { stages: ["Control Center A", "Communications Security", "Carrier / Network Path", "Communications Security", "Control Center B"], caption: "End-to-end context matters." } }],
      ["Confidentiality & Integrity Concepts", "Confidentiality limits unauthorized disclosure. Integrity protects against unauthorized modification. Authentication provides confidence in participating systems or users where applicable.", kc("Which concept protects against unauthorized modification?", ["Confidentiality", "Integrity", "Convenience", "Retention"], 1, "Integrity focuses on unauthorized modification.")],
      ["Change in Communication Path", "A carrier route changes during service migration.", scenario("Path Change Review", "A communication path changes during migration and documentation has not been updated.", [{ question: "Best response?", options: ["Assume equivalent", "Verify approved design/documentation remains accurate", "Delete old diagrams", "Skip security validation"], correct: 1, feedback: "Path changes should be reviewed against approved design." }])]
    ], 10, ["Communication Path Review", "Integrity Concepts"]),
    course("course-cip013-supply-chain", "CIP-013 — Supply Chain Risk Management", "Security begins before technology reaches production", "CIP-013", 70, "Intermediate", "PackageCheck", "Supply Chain Risk", ["procurement", "cybersecurity", "vendor managers", "system owners"], [
      ["Why Vendors Matter", "Suppliers support hardware, software, cloud services, maintenance, remote access, updates, and expertise. Risk management considers these relationships before, during, and after procurement.", { type: "process_diagram", title: "Supplier Lifecycle", data: { stages: ["Need", "Evaluate", "Select", "Contract", "Implement", "Operate", "Monitor", "Renew / Exit"], caption: "Risk changes throughout the relationship." } }],
      ["Third-Party Access", "Vendor access should identify sponsor, business need, scope, method, duration, privilege, monitoring, and termination.", scenario("Permanent Vendor Admin", "A vendor requests a permanent administrator account for convenience.", [{ question: "Best response?", options: ["Approve convenience access", "Identify concerns and route through approved review", "Share a group account", "Skip duration"], correct: 1, feedback: "Vendor access should be scoped and reviewed." }])],
      ["Contract Ends", "Exit activities can include accounts, remote access, data, credentials, equipment, documentation, and support channels.", classify("Vendor Exit Checklist", "Classify each exit item.", [["Disable remote access", "DOCUMENT"], ["Return equipment", "DOCUMENT"], ["Unclear data retention", "REVIEW"], ["Shared credential still active", "ESCALATE"]])]
    ], 12, ["Vendor Risk", "Third-Party Access"]),
    course("course-cip014-physical-risk", "CIP-014 — Physical Security Risk Management", "Understanding risk, threats, vulnerability, planning, and coordinated protection", "CIP-014", 65, "Intermediate", "ShieldAlert", "Physical Risk Management", ["physical security", "operations leadership", "facility owners", "compliance"], [
      ["Risk Starts With Consequence", "Physical-security risk management evaluates operational significance and exposure through a methodical, documented process. Learners support the process without becoming threat analysts.", kc("What should a repeatable risk review make visible?", ["Only opinions", "Assumptions, scope, consequence, and ownership", "No records", "Hidden exceptions"], 1, "Repeatable reviews document assumptions and ownership.")],
      ["Threat, Vulnerability & Consequence", "Threat asks what could occur, vulnerability asks where exposure could exist, and consequence asks what could result.", classify("Risk Triangle Matching", "Classify each example.", [["Camera blind spot", "REVIEW"], ["Changed traffic flow", "REVIEW"], ["Unowned mitigation", "ESCALATE"], ["Documented assessment scope", "DOCUMENT"]])],
      ["Facility Risk Scenario", "New construction changes traffic flow near a facility and creates a camera blind spot.", scenario("Facility Reassessment", "Construction changes access patterns and one mitigation has no owner.", [{ question: "Best response?", options: ["Assume old assessment still applies", "Route reassessment and assign ownership", "Ignore until audit", "Remove all documentation"], correct: 1, feedback: "Changed facts and unowned mitigation require review." }])]
    ], 12, ["Physical Risk", "Security Planning"]),
    course("course-cip015-insm", "CIP-015 — Internal Network Security Monitoring Foundations", "Using internal visibility to detect activity that perimeter controls alone may not reveal", "CIP-015", 75, "Advanced", "Activity", "Internal Network Monitoring", ["SOC", "cybersecurity", "network engineering", "OT security"], [
      ["Beyond the Perimeter", "Boundary controls manage traffic entering or leaving protected environments, but suspicious activity can also occur inside trusted areas. Internal monitoring adds visibility.", kc("What does internal monitoring add?", ["Visibility inside network areas", "Guaranteed proof of compromise", "Replacement for response", "No need for ownership"], 0, "Monitoring adds visibility for evaluation.")],
      ["Know What You Need to See", "Monitoring design considers network context, systems, communication paths, visibility points, telemetry, ownership, and retention.", classify("Coverage Map Activity", "Classify each coverage observation.", [["Known sensor location", "DOCUMENT"], ["Critical segment blind spot", "ESCALATE"], ["Unknown telemetry owner", "REVIEW"], ["Current retention setting", "DOCUMENT"]])],
      ["Expected vs Unusual", "Baselines help compare expected communication with unusual traffic. Unusual activity requires evaluation, not instant conclusions.", scenario("Unexpected Admin Connection", "An unexpected administrative connection appears between systems that do not normally communicate.", [{ question: "Best response?", options: ["Capture context and escalate", "Declare final breach alone", "Delete telemetry", "Disable monitoring"], correct: 0, feedback: "Monitoring information should be captured and evaluated." }])]
    ], 15, ["Network Visibility", "Monitoring Coverage"], "RESTRICTED", "PUBLISHED"),
    course("course-audit-preparation", "NERC CIP Audit Preparation Workshop", "Build evidence packages, identify gaps, and present coherent control narratives", "CIP-003", 75, "Advanced", "SearchCheck", "Audit Readiness", ["compliance", "control owners", "evidence owners", "managers", "SMEs"], [
      ["Can Another Person Understand the Record?", "A reviewer should be able to answer who, what, when, result, and why the record supports the control without relying on memory.", evidence("Which fields strengthen an evidence package?", ["Who", "What", "When", "Result", "Control connection", "Personal preference"], [0, 1, 2, 3, 4])],
      ["Evidence vs Narrative", "Evidence records what happened. Narrative explains how process and evidence connect. Neither should contradict the other.", kc("What should a narrative do?", ["Contradict records", "Connect process and evidence", "Replace missing activity", "Hide gaps"], 1, "Narrative explains, it does not replace evidence.")],
      ["Gap Triage", "Readiness reviews should find gaps early while preserving factual integrity. Do not modify records to make historical activity appear to have occurred.", classify("Gap Triage", "Classify each issue.", [["Missing approval", "ESCALATE"], ["Stale procedure reference", "REVIEW"], ["Complete signed record", "EXPECTED"], ["Population mismatch", "REVIEW"]])],
      ["Capstone Evidence Package", "A fictional package includes two complete records, one missing approval, one stale reference, and one unexplained population difference.", scenario("Audit Walkthrough", "A control owner is preparing to answer evidence questions.", [{ question: "Best response to an unknown detail?", options: ["Guess", "Answer factually and verify", "Invent support", "Contradict evidence"], correct: 1, feedback: "Concise factual responses protect credibility." }])]
    ], 12, ["Evidence Review", "Audit Readiness"], "RESTRICTED", "PUBLISHED"),
    course("course-internal-procedure-authoring", "Internal Procedure Authoring & Change Training", "Private draft training for writing executable, reviewable procedures", "CIP-010", 45, "Intermediate", "FilePenLine", "Procedure Authoring", ["authors", "reviewers", "control owners"], [
      ["A Procedure Should Be Usable", "A procedure should help a qualified person perform work consistently. It identifies trigger, scope, roles, inputs, steps, outputs, evidence, and escalation.", kc("Which procedure instruction is stronger?", ["Review access regularly.", "Review the identified access population using the approved process and document reviewer, date, result, and follow-up.", "Do things carefully.", "Handle access."], 1, "The stronger instruction describes action and evidence without inventing timing.")],
      ["Every Important Step Should Leave the Right Record", "Procedure authors should connect important steps to expected evidence so execution can be verified later.", classify("Step to Evidence", "Classify each authoring issue.", [["Step has no output", "REVIEW"], ["Approval step has approver/date", "DOCUMENT"], ["Screenshot outdated", "REVIEW"], ["Exception path missing", "ESCALATE"]])],
      ["Procedure Change Scenario", "A system workflow changed and the procedure must be revised while preserving old version history.", scenario("Procedure Version Change", "Screens and roles changed after a system workflow update.", [{ question: "Best sequence?", options: ["Overwrite history", "Draft update, review impact, approve, publish new version, preserve history", "Delete old evidence", "Skip communication"], correct: 1, feedback: "Versioned procedure changes should preserve history." }])]
    ], 8, ["Procedure Design", "Version Control"], "PRIVATE", "DRAFT", false)
  ];
}

function course(idValue: string, title: string, subtitle: string, standard: string, duration: number, difficulty: string, icon: string, primarySkill: string, audienceItems: string[], lessonSeeds: Array<[string, string, BlockDef]>, assessmentCount: number, skills: string[], accessMode: Course["accessMode"] = "OPEN", status: CourseStatus = "PUBLISHED", showInCatalog = true): CourseDef {
  return {
    id: idValue,
    title,
    shortTitle: title.split(" — ")[0],
    subtitle,
    description: `${subtitle}. This course teaches practical responsibilities, decision points, and evidence expectations using realistic NERC CIP learning activities.`,
    standard,
    duration,
    difficulty,
    icon,
    accessMode,
    status,
    showInCatalog,
    certificate: showInCatalog && status !== "DRAFT" && !title.includes("Supervisor") ? `${title} Certificate` : undefined,
    audience: audienceItems.join(", "),
    objectives: [
      `Explain the purpose of ${primarySkill}.`,
      "Recognize operational decisions that require review or escalation.",
      "Identify evidence that makes completed activities traceable.",
      "Apply the course concepts to a realistic scenario."
    ],
    skills: [primarySkill, ...skills],
    resources: [
      { title: "Course Glossary", description: `Key terms for ${title}.` },
      { title: "Quick Reference", description: `Practical checklist for ${primarySkill}.` },
      { title: "NERC Standards Reference", description: "Public NERC CIP standards reference." }
    ],
    grants: accessMode === "RESTRICTED" ? [{ type: "GROUP", name: "CIP Compliance" }, { type: "TEAM", name: "Cybersecurity" }] : undefined,
    modules: [
      {
        title: `${standard} Orientation`,
        intro: subtitle,
        lessons: [
          lesson(`${idValue}-orientation`, lessonSeeds[0][0], Math.max(7, Math.round(duration / 7)), [
            { type: "heading", body: lessonSeeds[0][0] },
            { type: "rich_text", body: lessonSeeds[0][1] },
            { type: "why", title: "Why This Matters", body: `A repeatable ${primarySkill.toLowerCase()} approach helps personnel make consistent decisions and preserve useful records.` },
            lessonSeeds[0][2],
            kc(`What principle best supports ${primarySkill}?`, ["Use the approved process and retain traceable evidence.", "Use personal judgment without records.", "Skip owners when busy.", "Treat every exception as invisible."], 0, "Approved process and evidence support consistent readiness."),
            { type: "key_takeaway", body: `${primarySkill} is strongest when decisions are intentional, owned, and traceable.` }
          ]),
          lesson(`${idValue}-context`, lessonSeeds[1][0], Math.max(7, Math.round(duration / 7)), [
            { type: "heading", body: lessonSeeds[1][0] },
            { type: "paragraph", body: lessonSeeds[1][1] },
            { type: "two_column", data: { leftTitle: "Strong practice", left: ["clear scope", "known owner", "documented decision", "timely escalation"], rightTitle: "Needs attention", right: ["unclear ownership", "missing record", "unsupported assumption", "stale reference"] } },
            lessonSeeds[1][2],
            { type: "audit_tip", title: "Audit Tip", body: "A future reviewer should be able to understand the decision without relying on memory." }
          ])
        ]
      },
      {
        title: "Applied Practice",
        intro: "Learners now apply the concept to a practical operating situation.",
        lessons: [
          lesson(`${idValue}-practice`, lessonSeeds[2][0], Math.max(9, Math.round(duration / 6)), [
            { type: "heading", body: lessonSeeds[2][0] },
            { type: "paragraph", body: lessonSeeds[2][1] },
            lessonSeeds[2][2],
            { type: "compliance_note", title: "Compliance Connection", body: `This activity is mapped to ${standard} learning context and produces local training-completion evidence after course completion.` },
            { type: "key_takeaway", body: "When facts change, preserve the record and route uncertainty through the approved process." }
          ]),
          lesson(`${idValue}-evidence`, "Evidence and Readiness Record", Math.max(7, Math.round(duration / 8)), [
            { type: "heading", body: "Evidence and Readiness Record" },
            { type: "paragraph", body: `A ${standard} training record should identify the learner, course version, completion date, assessment result, required activities, and mapped standard context.` },
            evidence(`Which fields would help demonstrate completion of ${title}?`, ["Learner", "Course/version", "Completion date", "Assessment score", "Required activity result", "Certificate if enabled", "Favorite color"], [0, 1, 2, 3, 4, 5])
          ])
        ]
      },
      {
        title: "Final Assessment",
        intro: "Verify understanding and create completion evidence.",
        lessons: [lesson(`${idValue}-assessment`, "Final Assessment", 12, [{ type: "assessment", title: "Final Assessment", body: "Complete required lessons and activities before submitting the final assessment." }])]
      },
      {
        title: "Completion",
        intro: "Review completion and training record.",
        lessons: [lesson(`${idValue}-completion`, "Completion Summary", 2, [{ type: "completion", title: "Completion Summary" }])]
      }
    ],
    assessmentCount
  };
}

function lesson(idValue: string, title: string, minutes: number, blocks: BlockDef[]): LessonDef {
  return { id: idValue, title, minutes, blocks };
}

export function addRebuiltCatalogCourses(data: AppData, ctx: CatalogSeedContext) {
  const courses: Record<string, Course> = {};
  for (const definition of courseDefinitionList()) {
    courses[definition.id] = addCatalogCourse(data, ctx, definition);
  }
  return courses;
}

function addCatalogCourse(data: AppData, ctx: CatalogSeedContext, definition: CourseDef): Course {
  const course = stableRecord(definition.id, {
    organizationId: ctx.organizationId,
    slug: slugify(definition.title),
    title: definition.title,
    shortTitle: definition.shortTitle,
    subtitle: definition.subtitle,
    shortDescription: definition.description,
    category: "NERC CIP",
    subcategory: definition.standard,
    difficulty: definition.difficulty,
    estimatedMinutes: definition.duration,
    delivery: definition.title.includes("Workshop") ? "Workshop" : "Self-paced",
    language: "English",
    recurrence: definition.title.includes("Annual") ? "Annual" : "As assigned",
    sequencing: "Recommended sequential progression. Lessons may be revisited at any time.",
    audienceDescription: `Designed for ${definition.audience}. Organization-specific procedures remain authoritative.`,
    status: definition.status ?? "PUBLISHED",
    accessMode: definition.accessMode ?? "OPEN",
    allowSelfEnrollment: definition.accessMode !== "PRIVATE",
    showInCatalog: definition.showInCatalog ?? definition.accessMode !== "PRIVATE",
    allowAccessRequests: definition.accessMode === "RESTRICTED",
    requireManagerApproval: false,
    certificateEnabled: Boolean(definition.certificate),
    ownerId: ctx.ownerId,
    icon: definition.icon,
    accent: "#0e7490",
    coverVisual: `${definition.standard} visual model`,
    completionEvidence: ["Course completion", "Assessment score", "Required activity"],
    completionDeadlineDays: 30,
    requireAllLessons: true,
    requireFinalAssessment: true,
    requireScenarios: true,
    requireAcknowledgement: false,
    requireManagerValidation: false,
    finalAssessmentEnabled: true,
    attemptsAllowed: 3,
    failedAttemptBehavior: "RETRY_IMMEDIATELY" as const,
    randomizeQuestions: false,
    randomizeAnswers: false,
    showAnswersAfterAttempt: true,
    certificateName: definition.certificate,
    certificateExpirationMonths: 12
  }) as Course;
  data.courses.push(course);
  data.courseOwners.push(stableRecord(`${definition.id}-owner`, { courseId: course.id, userId: ctx.ownerId }));
  data.courseContributors.push(stableRecord(`${definition.id}-reviewer`, { courseId: course.id, userId: ctx.reviewerId, role: "REVIEWER" as Role }));
  data.courseAccessPolicies.push(stableRecord(`${definition.id}-policy`, { courseId: course.id, mode: course.accessMode }));
  for (const grant of definition.grants ?? []) {
    const grantId = grant.type === "TEAM" ? ctx.teams[grant.name]?.id : grant.type === "GROUP" ? ctx.groups[grant.name]?.id : grant.name;
    if (grantId) data.courseAccessGrants.push(stableRecord(`${definition.id}-grant-${grant.type}-${slugify(grant.name)}`, { courseId: course.id, grantType: grant.type, grantId }));
  }

  const version = stableRecord(`${definition.id}-v1`, {
    courseId: course.id,
    version: "1.0",
    status: course.status,
    summary: definition.description,
    goal: definition.subtitle,
    publishedAt: course.status === "PUBLISHED" ? iso(subDays(new Date(), 10)) : undefined,
    publishedById: course.status === "PUBLISHED" ? ctx.ownerId : undefined,
    versionNotes: "Complete rebuilt catalog course package.",
    immutable: course.status === "PUBLISHED",
    completionRules: ["LESSONS", "ACTIVITIES", "ASSESSMENT"].concat(definition.certificate ? ["CERTIFICATE"] : [])
  });
  data.courseVersions.push(version);
  course.currentVersionId = version.id;
  course.draftVersionId = version.id;

  const objectiveIds = definition.objectives.map((text, index) => {
    const objective = stableRecord(`${definition.id}-obj-${index + 1}`, { courseVersionId: version.id, text, position: index + 1 });
    data.learningObjectives.push(objective);
    return objective.id;
  });
  data.courseStandardMappings.push(stableRecord(`${definition.id}-mapping-primary`, { courseId: course.id, standardVersionId: ctx.standardVersionByNumber(definition.standard).id, objectiveId: objectiveIds[0], requirementText: `Mapped to ${definition.standard}`, trainingRelevance: definition.subtitle, evidenceExpectation: "Completion record, final assessment score, required activity state, and certificate where enabled." }));

  definition.skills.forEach((name, index) => {
    const skillId = `${definition.id}-skill-${slugify(name)}`;
    data.skills.push(stableRecord(skillId, { organizationId: ctx.organizationId, name, description: `${name} demonstrated through ${definition.title}.`, level: index === 0 ? definition.difficulty : "Foundational" }));
    data.courseSkills.push(stableRecord(`${definition.id}-courseskill-${index + 1}`, { courseId: course.id, skillId, level: index === 0 ? definition.difficulty : "Foundational" }));
  });

  definition.resources.forEach((resource, index) => data.courseResources.push(stableRecord(`${definition.id}-resource-${index + 1}`, { courseId: course.id, title: resource.title, description: resource.description, type: index === 2 ? "URL" : "INTERNAL", url: index === 2 ? "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx" : `gridguard://resources/${definition.id}/${index + 1}`, visibility: "ENROLLED" as const })));

  definition.modules.forEach((moduleDef, moduleIndex) => {
    const moduleId = `${definition.id}-m${moduleIndex + 1}`;
    data.modules.push(stableRecord(moduleId, { courseVersionId: version.id, title: moduleDef.title, position: moduleIndex + 1, intro: moduleDef.intro }));
    moduleDef.lessons.forEach((lessonDef, lessonIndex) => {
      const lessonId = lessonDef.id;
      const isRequired = !lessonDef.title.includes("Completion Summary");
      data.lessons.push(stableRecord(lessonId, { moduleId, courseVersionId: version.id, title: lessonDef.title, slug: slugify(lessonDef.title), position: lessonIndex + 1, required: isRequired, estimatedMinutes: lessonDef.minutes }));
      lessonDef.blocks.forEach((block, blockIndex) => data.contentBlocks.push(stableRecord(`${lessonId}-b${blockIndex + 1}`, { lessonId, type: block.type, title: block.title, body: block.body, data: block.data, required: block.required, position: blockIndex + 1 })));
    });
  });

  const assessment = stableRecord(`${definition.id}-assessment`, { courseVersionId: version.id, title: `${definition.title} Final Assessment`, instructions: "Answer each question. Passing score is 80%. Correct answers are shown after submission.", passingScore: 80, maxAttempts: 3, timeLimitMinutes: Math.max(10, definition.assessmentCount), required: true });
  data.assessments.push(assessment);
  standardQuestions(definition).forEach((seed, index) => {
    const questionId = `${definition.id}-q${index + 1}`;
    data.questions.push(stableRecord(questionId, { type: seed.type, prompt: seed.prompt, explanation: seed.explanation, difficulty: definition.difficulty, tags: ["NERC CIP", definition.standard, seed.topic] }));
    seed.options.forEach((text, optionIndex) => data.questionOptions.push(stableRecord(`${questionId}-opt${optionIndex + 1}`, { questionId, text, isCorrect: seed.correct.includes(optionIndex), position: optionIndex + 1 })));
    data.assessmentQuestions.push(stableRecord(`${definition.id}-aq${index + 1}`, { assessmentId: assessment.id, questionId, points: 1, position: index + 1 }));
  });

  if (definition.certificate) {
    const certId = `${definition.id}-certification`;
    data.certifications.push(stableRecord(certId, { organizationId: ctx.organizationId, name: definition.certificate, description: `Certificate issued after completion of ${definition.title}.`, validityDays: 365, renewalWindowDays: 30, status: "ACTIVE" as const }));
    data.certificationRequirements.push(stableRecord(`${definition.id}-certreq`, { certificationId: certId, type: "COURSE" as const, targetId: course.id }));
  }
  return course;
}
