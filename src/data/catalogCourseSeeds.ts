import { subDays } from "date-fns";
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
  assessment: Array<{ type: QuestionType; prompt: string; options: string[]; correct: number[]; explanation: string; topic: string; lessonId: string }>;
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

const question = (type: QuestionType, prompt: string, options: string[], correct: number[], explanation: string, topic: string, lessonId: string) => ({ type, prompt, options, correct, explanation, topic, lessonId });

function courseDefinitionList(): CourseDef[] {
  return [
    course("course-cip002-categorization", "CIP-002 — BES Cyber System Categorization", "Understanding scope, operational impact, categorization decisions, and repeatable evidence", "CIP-002", 60, "Intermediate", "Network", "BES Cyber System Categorization", ["operations", "cybersecurity", "asset owners", "system owners", "compliance personnel"], [
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
    ], 10, ["Manager Validation", "Access Approval"], "RESTRICTED", "PUBLISHED", undefined),
    course("course-annual-awareness", "Annual NERC CIP Cybersecurity Awareness", "Everyday cybersecurity behavior for personnel supporting reliable grid operations", "CIP-004", 70, "Foundational", "ShieldCheck", "Cybersecurity Awareness", ["broad CIP-aware population"], [
      ["Why Grid Cybersecurity Matters", "Electric reliability depends on interconnected technology and people. Awareness helps personnel recognize behavior or conditions that could put systems, information, or operations at unnecessary risk.", kc("Who has cybersecurity responsibilities?", ["Only security staff", "Everyone according to role", "Only managers", "Only vendors"], 1, "Everyone has responsibilities appropriate to their role.")],
      ["Authentication & Credential Protection", "Unique credentials, approved MFA, password managers where approved, and prompt reporting of unexpected prompts reduce identity risk.", scenario("Unexpected MFA Prompt", "An MFA notification arrives while you are not signing in.", [{ question: "Best response?", options: ["Approve to clear it", "Deny and report", "Ignore forever", "Share password"], correct: 1, feedback: "Unexpected MFA prompts should be denied and reported." }])],
      ["Phishing & Social Engineering", "Suspicious messages often combine urgency, unknown senders, lookalike domains, unexpected attachments, and threats.", classify("Email Red Flags", "Classify each message signal.", [["Unknown sender with urgent password demand", "ESCALATE"], ["Expected meeting invite from known contact", "EXPECTED"], ["Unexpected attachment requiring macros", "ESCALATE"], ["Lookalike domain", "REVIEW"]])],
      ["Awareness Capstone", "Rapid situations require learners to proceed, stop and verify, or report.", scenario("Rapid-Fire Awareness", "You face unexpected MFA, unknown USB media, a suspicious visitor, and a planned remote access session.", [{ question: "Unknown USB found outside the facility.", options: ["Connect it", "Follow reporting process", "Give it away", "Ignore all media controls"], correct: 1, feedback: "Unknown media should not be connected." }])]
    ], 15, ["Credential Protection", "Phishing Recognition", "Incident Reporting"]),
    course("course-cip005-esp-access", "CIP-005 — Electronic Security Perimeter Access", "Controlled electronic access, remote connectivity, and evidence", "CIP-005", 70, "Intermediate", "Network", "Electronic Access Control", ["network engineers", "operations", "cybersecurity", "remote-access administrators"], [
      ["Understanding Electronic Security Boundaries", "Electronic access controls depend on known boundaries, controlled access points, approved pathways, visibility, and ownership.", { type: "process_diagram", title: "Controlled Path", data: { stages: ["Outside / Untrusted", "Controlled Access Point", "Protected Environment"], caption: "Access should use known approved paths." } }],
      ["Interactive Remote Access Considerations", "Remote access should use approved methods, authorization, authentication, session controls, monitoring, and time-bounded support where appropriate.", scenario("Alternate Remote Tool", "A vendor requests an alternate remote tool because the approved service is slow.", [{ question: "Best response?", options: ["Bypass the approved service", "Use approved escalation path", "Share credentials", "Disable logging"], correct: 1, feedback: "Urgency does not justify an unapproved bypass." }])],
      ["Access Review Evidence", "Authorization evidence, access logs, review evidence, exceptions, and configuration records answer different future questions.", evidence("Which fields support remote-access review?", ["User", "Purpose", "Approval", "Access method", "Date", "Review result", "Favorite color"], [0, 1, 2, 3, 4, 5])]
    ], 12, ["Remote Access", "ESP Evidence"], "RESTRICTED", "PUBLISHED"),
    course("course-cip006-physical-security", "CIP-006 — Physical Security of BES Cyber Systems", "Physical access control, visitor handling, monitoring, and access evidence", "CIP-006", 60, "Foundational", "Building2", "Physical Access", ["operations", "physical security", "facility personnel", "authorized visitors"], [
      ["Why Physical Access Matters", "Cybersecurity controls can be undermined when unauthorized physical access exposes systems, ports, media, consoles, or infrastructure.", kc("A coworker forgot a badge and asks you to let them through. Best response?", ["Let them in", "Follow approved access or visitor process", "Loan your badge", "Ignore all entry controls"], 1, "Controlled entry should follow the approved process.")],
      ["Visitor Handling", "Visitor access should have request, approval, identity verification, entry, escort or control as applicable, exit, and record steps.", { type: "timeline", title: "Visitor Access Flow", data: { steps: ["Request", "Approval", "Identity verification", "Entry", "Escort/control", "Exit", "Record"] } }],
      ["Tailgating & Social Pressure", "A familiar vendor carrying equipment asks you to hold a controlled door.", scenario("Controlled Door Decision", "A familiar vendor is behind you at a controlled entry point and asks you to hold the door.", [{ question: "Best response?", options: ["Hold the door", "Use approved visitor/access process", "Wave them through", "Disable alarm"], correct: 1, feedback: "Familiarity does not replace the approved entry process." }])]
    ], 10, ["Physical Access", "Visitor Handling"]),
    course("course-cip007-system-security", "CIP-007 — System Security Management", "Secure system operation from ports and patches to accounts and malicious-code defenses", "CIP-007", 90, "Advanced", "ServerCog", "System Security Management", ["system administrators", "security engineers", "infrastructure teams", "OT personnel"], [
      ["Ports & Services", "Every enabled service expands what a system can do and what must be managed. A strong process understands which services are required, why, and what happens when need changes.", classify("Service Review Table", "Classify each service entry.", [["SSH - required admin channel", "EXPECTED"], ["Legacy FTP - no owner", "REVIEW"], ["Web admin - approved", "EXPECTED"], ["Unused remote tool", "ESCALATE"]])],
      ["Security Patch Evaluation", "Security patch governance includes identify, evaluate applicability, assess risk, plan, implement or mitigate, verify, and document. Specific timing belongs to the approved procedure.", scenario("Patch Constraint", "A security patch is released for an operational server, but maintenance constraints prevent immediate installation.", [{ question: "Best response?", options: ["Ignore it", "Document evaluation and approved mitigation or plan", "Install unsafely without process", "Delete the notice"], correct: 1, feedback: "Use approved evaluation and risk handling." }])],
      ["Account Review Activity", "Account review identifies active admins with owners, former contractors, service accounts without owners, duplicate privilege, and standard users.", classify("Account Inventory Review", "Flag each account state.", [["Named admin with owner", "EXPECTED"], ["Former contractor", "ESCALATE"], ["Service account no owner", "REVIEW"], ["Duplicate privileged account", "REVIEW"]])],
      ["System Security Evidence Package", "A useful package can include patch evaluation, configuration record, account review, malicious-code control state, and vulnerability assessment.", evidence("Which records belong in a system-security package?", ["Patch evaluation", "Configuration record", "Account review", "Malicious-code control state", "Vulnerability assessment", "Team lunch menu"], [0, 1, 2, 3, 4])]
    ], 15, ["Patch Governance", "Account Management", "Vulnerability Management"], "RESTRICTED", "PUBLISHED"),
    course("course-cip008-incident-response", "CIP-008 — Incident Response Fundamentals", "Recognize, report, coordinate, document, recover, and learn", "CIP-008", 75, "Intermediate", "Siren", "Incident Response", ["incident responders", "operations", "security", "IT", "managers"], [
      ["Event, Alert, Incident?", "Learners should recognize expected events, items requiring investigation, and items that should be escalated without making formal reportability determinations outside their role.", classify("Signal Classifier", "Classify each event signal.", [["Planned maintenance alert", "EXPECTED"], ["Unknown remote connection", "ESCALATE"], ["Failed login spike", "REVIEW"], ["Security-tool test", "EXPECTED"]])],
      ["Preserve Useful Information", "Useful incident information includes timestamps, systems, observed behavior, actions taken, alerts, and responsible people.", evidence("What should an initial incident note capture?", ["Time", "System", "Observed behavior", "Actions taken", "Reporter", "Speculation presented as fact"], [0, 1, 2, 3, 4])],
      ["Incident Timeline", "Incident records are easier to review when detection, report, triage, containment/action, recovery, closure, and lessons learned are ordered.", { type: "timeline", title: "Incident Timeline", data: { steps: ["Detection", "Report", "Triage", "Containment/action", "Recovery", "Closure", "Lessons learned"] } }],
      ["Night Shift Remote Activity", "Unusual remote account activity appears during night shift.", scenario("Incident Response Capstone", "A night-shift operator notices an unexpected remote connection and an authentication alert.", [{ question: "Best first action?", options: ["Wait until morning", "Raise through response process and preserve context", "Delete logs", "Declare final root cause"], correct: 1, feedback: "Early escalation and preserved context support response." }])]
    ], 12, ["Incident Reporting", "Evidence Capture"], "RESTRICTED", "PUBLISHED"),
    course("course-cip009-recovery-planning", "CIP-009 — Recovery Planning", "Preparing for reliable restoration before disruption occurs", "CIP-009", 65, "Intermediate", "LifeBuoy", "Recovery Planning", ["operations", "IT", "system owners", "recovery teams"], [
      ["Recovery Is Planned Before the Event", "A recovery plan is most useful when responsibilities, dependencies, procedures, resources, and validation expectations are understood before disruption.", kc("When is recovery readiness primarily built?", ["During improvisation", "Before disruption", "After evidence is lost", "Only after audit"], 1, "Recovery readiness is planned and validated before disruption.")],
      ["Backup Is Not the Same as Recovery", "A backup is valuable only when it can support the intended recovery objective. Validation connects backup existence to actual restoration capability.", classify("Recovery Dependency Map", "Classify each dependency.", [["Current configuration backup", "DOCUMENT"], ["Retired storage reference", "REVIEW"], ["Unknown identity dependency", "ESCALATE"], ["Validated procedure", "EXPECTED"]])],
      ["Recovery Exercise Evidence", "A recovery exercise record should preserve plan/version, date, participants, scope, result, issues, and corrective actions.", evidence("Which fields support recovery exercise evidence?", ["Plan/version", "Date", "Participants", "Scope", "Result", "Corrective actions", "Office snack"], [0, 1, 2, 3, 4, 5])]
    ], 12, ["Recovery Planning", "Exercise Evidence"]),
    course("course-cip010-change-vulnerability", "CIP-010 — Configuration Change Management & Vulnerability Assessments", "Configuration baselines, controlled change, monitoring, vulnerability assessment, and evidence", "CIP-010", 90, "Advanced", "GitCompare", "Change Management", ["system administrators", "security engineers", "OT engineers", "change managers"], [
      ["Know the Expected State", "A baseline captures approved components, configuration, services, software, security settings, and ownership. Change updates expected state through approved control.", { type: "process_diagram", title: "Configuration State Flow", data: { stages: ["Expected State", "Approved Change", "Validated New State", "Updated Baseline"], caption: "Baseline records should follow approved change." } }],
      ["A Change Is More Than Implementation", "A controlled change includes request, impact/risk review, approval, implementation, verification, documentation, and baseline update.", kc("Which change path is strongest?", ["Implement first and decide later", "Request, review, approve, implement, verify, document", "Skip verification", "Avoid baseline updates"], 1, "Controlled changes preserve approval and validation.")],
      ["Emergency Change Scenario", "A service outage requires urgent configuration change.", scenario("Emergency Change", "Operations needs an urgent configuration change to restore service.", [{ question: "Best response?", options: ["Make invisible change", "Use emergency-change path and document afterward as required", "Delete logs", "Bypass all review permanently"], correct: 1, feedback: "Urgency should use the approved emergency path." }])],
      ["Vulnerability Finding Lifecycle", "Findings move from new to evaluated, assigned, remediation, verified, and closed with ownership and evidence.", { type: "timeline", title: "Finding Lifecycle", data: { steps: ["New", "Evaluated", "Assigned", "Remediation", "Verified", "Closed"] } }]
    ], 15, ["Configuration Baseline", "Vulnerability Management"]),
    course("course-cip011-information-protection", "CIP-011 — Information Protection", "Recognize, handle, protect, and dispose of sensitive BES Cyber System information", "CIP-011", 60, "Foundational", "FileLock2", "Information Protection", ["operations", "security", "engineers", "document owners"], [
      ["Sensitive Information in Everyday Work", "Architecture diagrams, configuration exports, credentials, security settings, logs, recovery details, and access lists may require controlled handling based on organizational classification.", kc("Before sharing a potentially sensitive document, what should you confirm?", ["Who needs it and approved handling path", "Whether it is convenient", "Whether a personal account is faster", "Nothing"], 0, "Sharing should follow approved need and handling rules.")],
      ["Know Before You Share", "Ask what it is, who needs it, where it may be stored, how it may be transmitted, and how long it should remain.", scenario("Wrong Recipient", "A sensitive internal document was emailed to an unintended recipient.", [{ question: "Best response?", options: ["Silently delete local sent copy", "Follow incident/data-handling process promptly", "Forward more copies", "Ignore it"], correct: 1, feedback: "Prompt reporting supports appropriate handling." }])],
      ["Disposal Decision Activity", "Media and records should move through approved handling from create/use to store, transport, reuse, and dispose.", classify("Disposal Handling", "Classify each item.", [["Paper printout with sensitive details", "ESCALATE"], ["Failed drive", "ESCALATE"], ["Old exported report", "REVIEW"], ["Public brochure", "EXPECTED"]])]
    ], 10, ["Information Handling", "Disposal"]),
    course("course-cip012-control-center-communications", "CIP-012 — Communications Between Control Centers", "Protecting sensitive operational communications and understanding communication paths", "CIP-012", 60, "Intermediate", "RadioTower", "Communications Protection", ["network", "telecommunications", "control-center engineering", "security"], [
      ["Control-Center Communications Matter", "Important operational data moves across communication paths. Protection depends on knowing endpoints, path, ownership, technology, controls, and dependencies.", { type: "process_diagram", title: "Communication Path", data: { stages: ["Control Center A", "Communications Security", "Carrier / Network Path", "Communications Security", "Control Center B"], caption: "End-to-end context matters." } }],
      ["Confidentiality & Integrity Concepts", "Confidentiality limits unauthorized disclosure. Integrity protects against unauthorized modification. Authentication provides confidence in participating systems or users where applicable.", kc("Which concept protects against unauthorized modification?", ["Confidentiality", "Integrity", "Convenience", "Retention"], 1, "Integrity focuses on unauthorized modification.")],
      ["Change in Communication Path", "A carrier route changes during service migration.", scenario("Path Change Review", "A communication path changes during migration and documentation has not been updated.", [{ question: "Best response?", options: ["Assume equivalent", "Verify approved design/documentation remains accurate", "Delete old diagrams", "Skip security validation"], correct: 1, feedback: "Path changes should be reviewed against approved design." }])]
    ], 10, ["Communication Path Review", "Integrity Concepts"]),
    course("course-cip013-supply-chain", "CIP-013 — Supply Chain Risk Management", "Security begins before technology reaches production", "CIP-013", 75, "Intermediate", "PackageCheck", "Supply Chain Risk", ["procurement", "cybersecurity", "vendor managers", "system owners"], [
      ["Why Vendors Matter", "Suppliers support hardware, software, cloud services, maintenance, remote access, updates, and expertise. Risk management considers these relationships before, during, and after procurement.", { type: "process_diagram", title: "Supplier Lifecycle", data: { stages: ["Need", "Evaluate", "Select", "Contract", "Implement", "Operate", "Monitor", "Renew / Exit"], caption: "Risk changes throughout the relationship." } }],
      ["Third-Party Access", "Vendor access should identify sponsor, business need, scope, method, duration, privilege, monitoring, and termination.", scenario("Permanent Vendor Admin", "A vendor requests a permanent administrator account for convenience.", [{ question: "Best response?", options: ["Approve convenience access", "Identify concerns and route through approved review", "Share a group account", "Skip duration"], correct: 1, feedback: "Vendor access should be scoped and reviewed." }])],
      ["Contract Ends", "Exit activities can include accounts, remote access, data, credentials, equipment, documentation, and support channels.", classify("Vendor Exit Checklist", "Classify each exit item.", [["Disable remote access", "DOCUMENT"], ["Return equipment", "DOCUMENT"], ["Unclear data retention", "REVIEW"], ["Shared credential still active", "ESCALATE"]])]
    ], 12, ["Vendor Risk", "Third-Party Access"]),
    course("course-cip014-physical-risk", "CIP-014 — Physical Security Risk Management", "Understanding risk, threats, vulnerability, planning, and coordinated protection", "CIP-014", 70, "Intermediate", "ShieldAlert", "Physical Risk Management", ["physical security", "operations leadership", "facility owners", "compliance"], [
      ["Risk Starts With Consequence", "Physical-security risk management evaluates operational significance and exposure through a methodical, documented process. Learners support the process without becoming threat analysts.", kc("What should a repeatable risk review make visible?", ["Only opinions", "Assumptions, scope, consequence, and ownership", "No records", "Hidden exceptions"], 1, "Repeatable reviews document assumptions and ownership.")],
      ["Threat, Vulnerability & Consequence", "Threat asks what could occur, vulnerability asks where exposure could exist, and consequence asks what could result.", classify("Risk Triangle Matching", "Classify each example.", [["Camera blind spot", "REVIEW"], ["Changed traffic flow", "REVIEW"], ["Unowned mitigation", "ESCALATE"], ["Documented assessment scope", "DOCUMENT"]])],
      ["Facility Risk Scenario", "New construction changes traffic flow near a facility and creates a camera blind spot.", scenario("Facility Reassessment", "Construction changes access patterns and one mitigation has no owner.", [{ question: "Best response?", options: ["Assume old assessment still applies", "Route reassessment and assign ownership", "Ignore until audit", "Remove all documentation"], correct: 1, feedback: "Changed facts and unowned mitigation require review." }])]
    ], 12, ["Physical Risk", "Security Planning"]),
    course("course-cip015-insm", "CIP-015 — Internal Network Security Monitoring Foundations", "Using internal visibility to detect activity that perimeter controls alone may not reveal", "CIP-015", 90, "Advanced", "Activity", "Internal Network Monitoring", ["SOC", "cybersecurity", "network engineering", "OT security"], [
      ["Beyond the Perimeter", "Boundary controls manage traffic entering or leaving protected environments, but suspicious activity can also occur inside trusted areas. Internal monitoring adds visibility.", kc("What does internal monitoring add?", ["Visibility inside network areas", "Guaranteed proof of compromise", "Replacement for response", "No need for ownership"], 0, "Monitoring adds visibility for evaluation.")],
      ["Know What You Need to See", "Monitoring design considers network context, systems, communication paths, visibility points, telemetry, ownership, and retention.", classify("Coverage Map Activity", "Classify each coverage observation.", [["Known sensor location", "DOCUMENT"], ["Critical segment blind spot", "ESCALATE"], ["Unknown telemetry owner", "REVIEW"], ["Current retention setting", "DOCUMENT"]])],
      ["Expected vs Unusual", "Baselines help compare expected communication with unusual traffic. Unusual activity requires evaluation, not instant conclusions.", scenario("Unexpected Admin Connection", "An unexpected administrative connection appears between systems that do not normally communicate.", [{ question: "Best response?", options: ["Capture context and escalate", "Declare final breach alone", "Delete telemetry", "Disable monitoring"], correct: 0, feedback: "Monitoring information should be captured and evaluated." }])]
    ], 15, ["Network Visibility", "Monitoring Coverage"], "RESTRICTED", "PUBLISHED"),
    course("course-audit-preparation", "NERC CIP Audit Preparation Workshop", "Build evidence packages, identify gaps, and present coherent control narratives", "CIP-003", 90, "Advanced", "SearchCheck", "Audit Readiness", ["compliance", "control owners", "evidence owners", "managers", "SMEs"], [
      ["Can Another Person Understand the Record?", "A reviewer should be able to answer who, what, when, result, and why the record supports the control without relying on memory.", evidence("Which fields strengthen an evidence package?", ["Who", "What", "When", "Result", "Control connection", "Personal preference"], [0, 1, 2, 3, 4])],
      ["Evidence vs Narrative", "Evidence records what happened. Narrative explains how process and evidence connect. Neither should contradict the other.", kc("What should a narrative do?", ["Contradict records", "Connect process and evidence", "Replace missing activity", "Hide gaps"], 1, "Narrative explains, it does not replace evidence.")],
      ["Gap Triage", "Readiness reviews should find gaps early while preserving factual integrity. Do not modify records to make historical activity appear to have occurred.", classify("Gap Triage", "Classify each issue.", [["Missing approval", "ESCALATE"], ["Stale procedure reference", "REVIEW"], ["Complete signed record", "EXPECTED"], ["Population mismatch", "REVIEW"]])],
      ["Capstone Evidence Package", "A fictional package includes two complete records, one missing approval, one stale reference, and one unexplained population difference.", scenario("Audit Walkthrough", "A control owner is preparing to answer evidence questions.", [{ question: "Best response to an unknown detail?", options: ["Guess", "Answer factually and verify", "Invent support", "Contradict evidence"], correct: 1, feedback: "Concise factual responses protect credibility." }])]
    ], 12, ["Evidence Review", "Audit Readiness"], "RESTRICTED", "PUBLISHED"),
    course("course-internal-procedure-authoring", "Internal Procedure Authoring & Change Training", "Private draft training for writing executable, reviewable procedures", "CIP-010", 50, "Intermediate", "FilePenLine", "Procedure Authoring", ["authors", "reviewers", "control owners"], [
      ["A Procedure Should Be Usable", "A procedure should help a qualified person perform work consistently. It identifies trigger, scope, roles, inputs, steps, outputs, evidence, and escalation.", kc("Which procedure instruction is stronger?", ["Review access regularly.", "Review the identified access population using the approved process and document reviewer, date, result, and follow-up.", "Do things carefully.", "Handle access."], 1, "The stronger instruction describes action and evidence without inventing timing.")],
      ["Every Important Step Should Leave the Right Record", "Procedure authors should connect important steps to expected evidence so execution can be verified later.", classify("Step to Evidence", "Classify each authoring issue.", [["Step has no output", "REVIEW"], ["Approval step has approver/date", "DOCUMENT"], ["Screenshot outdated", "REVIEW"], ["Exception path missing", "ESCALATE"]])],
      ["Procedure Change Scenario", "A system workflow changed and the procedure must be revised while preserving old version history.", scenario("Procedure Version Change", "Screens and roles changed after a system workflow update.", [{ question: "Best sequence?", options: ["Overwrite history", "Draft update, review impact, approve, publish new version, preserve history", "Delete old evidence", "Skip communication"], correct: 1, feedback: "Versioned procedure changes should preserve history." }])]
    ], 8, ["Procedure Design", "Version Control"], "PRIVATE", "DRAFT", false)
  ];
}

const additionalLessons: Record<string, Array<[string, string, BlockDef]>> = {
  "course-cip002-categorization": [
    ["Impact Is About Function", "Categorization focuses on applicable criteria and the role an asset or system plays in the operational context. Learners should avoid informal impact judgments based on appearance, cost, or user count alone.", kc("Which statement is strongest?", ["Applicable criteria and operational context support the decision.", "User count alone determines categorization.", "Hardware age determines categorization.", "Every server has identical impact."], 0, "Operational context and approved criteria support the decision.")],
    ["When Prior Assumptions Change", "A prior categorization remains reliable only while the facts supporting it remain accurate. New functionality, connectivity, consolidation, ownership change, or retirement can require review.", classify("Change Trigger Review", "Classify each categorization change signal.", [["System name changed only", "REVIEW"], ["New operational function", "ESCALATE"], ["New network dependency", "ESCALATE"], ["Owner changed", "DOCUMENT"]])],
    ["Escalating Scope Uncertainty", "Learners should not guess when system context, ownership, or criteria are unclear. Uncertain scope questions should be routed to the designated categorization owner or reviewer with the facts known so far.", kc("What should happen when categorization applicability is unclear?", ["Escalate to the designated owner or reviewer with factual context.", "Guess based on device cost.", "Wait until audit.", "Delete the question."], 0, "Scope uncertainty belongs in the approved review process.")],
    ["Preserve the Decision Path", "A strong categorization record lets another qualified person reconstruct who reviewed the system, what methodology was used, which criteria were considered, and why the decision was supported.", evidence("Which fields preserve the decision path?", ["Reviewer", "Methodology", "Criteria considered", "Decision date", "Decision rationale", "Favorite browser"], [0, 1, 2, 3, 4])],
    ["Categorization Readiness Review", "GridGuard reviews a record for Operations Data Gateway. The function and assessment date are present, but methodology, reviewer, and explanatory basis are missing.", classify("Mock Record Gaps", "Identify the strongest category for each field.", [["Methodology blank", "ESCALATE"], ["Reviewer blank", "ESCALATE"], ["Architecture diagram attached", "DOCUMENT"], ["Decision rationale missing", "REVIEW"]])]
  ],
  "course-cip003-security-management": [
    ["Control Lifecycle", "Controls move through definition, implementation, operation, monitoring, review, and improvement. A mature program watches whether the control continues to operate as intended.", { type: "timeline", title: "Control Lifecycle", data: { steps: ["Define", "Implement", "Operate", "Monitor", "Review", "Improve"] } }],
    ["Exceptions", "A legitimate exception should be identified, justified, approved, documented, monitored, and reevaluated. Hidden exceptions weaken governance and make future review unreliable.", kc("Which exception is strongest?", ["Approved exception with owner, reason, review date, and alternative handling.", "Undocumented legacy bypass.", "A private team decision.", "A note that says not applicable."], 0, "Exceptions need ownership, approval, and review.")],
    ["Evidence of Management Oversight", "Oversight evidence can include approvals, review records, exception decisions, corrective action tracking, and monitoring results that show accountable review occurred.", evidence("Which items support oversight evidence?", ["Approval", "Review result", "Exception owner", "Corrective action", "Monitoring result", "Unverified memory"], [0, 1, 2, 3, 4])],
    ["When a Control Misses", "If a quarterly control activity is incomplete near the deadline, the right response is to establish factual status, escalate, and document remediation rather than backfilling unverifiable work.", scenario("Missed Control Activity", "Population is incomplete, the owner is unavailable, and some activity cannot be verified.", [{ question: "What is the strongest response?", options: ["Backfill", "Hide the issue", "Document factual status and escalate", "Mark complete"], correct: 2, feedback: "Preserve integrity and escalate the gap." }])],
    ["Governance Capstone", "A control has policy, stale procedure, unclear owner, missed prior review, open exception, and incomplete evidence. Learners order practical remediation steps.", classify("Governance Remediation", "Classify each action.", [["Identify accountable owner", "ESCALATE"], ["Establish factual state", "DOCUMENT"], ["Review open exception", "REVIEW"], ["Update stale procedure", "DOCUMENT"]])]
  ],
  "course-cip004-foundations": [
    ["Access Has a Reason", "Access should connect a person, purpose, scope, approval, appropriate privilege, and review trigger. Access that still works may no longer be appropriate.", kc("Appropriate access should reflect what?", ["Current responsibilities and approved need.", "Personal preference.", "Whether the account still works.", "Tenure."], 0, "Access should match current responsibilities.")],
    ["Changes Matter", "New hire, transfer, promotion, temporary duty, leave, contract end, and termination events can all affect training or access responsibilities.", classify("Personnel Change Signals", "Classify each event.", [["Transfer to new department", "REVIEW"], ["Temporary duty ended", "REVIEW"], ["Contract ended", "ESCALATE"], ["No responsibility change", "DOCUMENT"]])],
    ["Report Concerns and Ask", "Learners contribute by reporting relevant changes and asking when instructions or responsibilities are unclear. Timely questions help the responsible owner correct access, training, or documentation issues.", evidence("Which actions support learner responsibility?", ["Complete training", "Report access concern", "Ask when unsure", "Acknowledge accurately", "Retain unnecessary access"], [0, 1, 2, 3])],
    ["Foundation Scenario", "A contractor account contains permissions associated with a former project member. The learner stops, reports, and lets the responsible owner review.", scenario("Inherited Contractor Permissions", "A new contractor profile appears to include old project privileges.", [{ question: "Best flow?", options: ["Use the access", "Stop, report, allow owner review", "Ignore it", "Change permissions personally"], correct: 1, feedback: "Unexpected access should enter the approved review process." }])]
  ],
  "course-cip004-supervisor-workshop": [
    ["Communicate the Change", "A strong personnel-change notice identifies the person, old role, new role, effective date, and access or training areas requiring review.", kc("Which change notice is strongest?", ["Alex changed jobs.", "Alex Harper transferred from Field Operations to Planning effective September 7; field admin and restricted-site access need review.", "Planning hired someone.", "Access might be wrong."], 1, "Specific notices enable downstream action.")],
    ["Approval Should Mean Something", "Approvers should understand who is requesting access, what is requested, why, scope, duration, privilege, conditions, and how the approval will be retained.", evidence("Which fields strengthen an approval?", ["Requester", "Scope", "Business need", "Approver", "Duration", "Lunch order"], [0, 1, 2, 3, 4])],
    ["Temporary and Elevated Access", "Temporary elevated access should identify start, end, owner, reason, approval, and review so the access does not silently become permanent.", scenario("Fourteen-Day Remediation Access", "Priya needs elevated access for a remediation project.", [{ question: "What should the manager configure?", options: ["Permanent broad admin", "Scoped access with start, end, owner, approval, and review", "Shared password", "No record"], correct: 1, feedback: "Temporary access needs bounds and evidence." }])],
    ["Training Implications", "Managers should consider whether a role change also changes required training, awareness, or acknowledgement obligations. Access review and training review often need to move together.", kc("What should a supervisor consider during a personnel change?", ["Whether training requirements changed along with access needs.", "Only the employee's title.", "Only parking assignment.", "Whether old access still works."], 0, "Personnel changes can affect both access and training requirements.")],
    ["Manager Evidence Record", "A personnel-change evidence record should show the change event, effective date, manager, access reviewed, training reviewed, actions, and completion.", classify("Personnel Change Evidence", "Classify each field.", [["Effective date", "DOCUMENT"], ["Training review missing", "REVIEW"], ["Unowned action", "ESCALATE"], ["Completion date", "DOCUMENT"]])]
  ],
  "course-annual-awareness": [
    ["Your Everyday Security Responsibilities", "Awareness connects everyday behavior to reliable operations: protect credentials, use approved systems, handle information carefully, protect physical access, and report concerns.", kc("Security is primarily whose responsibility?", ["Everyone within responsibilities of their role.", "Only the security team.", "Only executives.", "Only vendors."], 0, "Everyone has role-appropriate responsibilities.")],
    ["Credentials and MFA", "Personal credentials should not be shared. MFA prompts should only be approved for sign-ins the learner initiated, and unexpected prompts should be denied and reported.", scenario("Unexpected MFA", "A sign-in approval appears from a city where you are not signing in.", [{ question: "Best response?", options: ["Approve", "Deny and report", "Ignore forever", "Share password"], correct: 1, feedback: "Unexpected MFA may indicate credential misuse." }])],
    ["Social Engineering Pressure", "Social engineering may use urgency, authority pressure, fear, curiosity, or helpfulness to push people into bypassing normal verification.", classify("Social Engineering Signals", "Classify each signal.", [["Urgent credential request", "ESCALATE"], ["Independent approved verification", "DOCUMENT"], ["Authority pressure", "REVIEW"], ["Expected helpdesk ticket", "EXPECTED"]])],
    ["Inspect Before Acting", "A mock account-suspension email contains a lookalike sender, urgency, unexpected attachment, and credential request. Learners identify red flags without opening unsafe content.", evidence("Which red flags are present?", ["Lookalike sender", "Urgency", "Unexpected attachment", "Credential request", "Normal newsletter"], [0, 1, 2, 3])],
    ["When the Message Looks Real", "Business email compromise can use familiar names. Unusual payment, credential, or access requests should be verified through an independent approved channel.", kc("How should an unusual vendor access request be verified?", ["Through an independent approved channel.", "By replying to the same suspicious message.", "By skipping verification.", "By sending credentials."], 0, "Use trusted verification paths.")],
    ["Removable Media", "Unknown USB media should not be connected. Follow the reporting process so responsible teams can handle the item.", scenario("Parking Lot USB", "You find an unknown USB drive near the facility.", [{ question: "Best response?", options: ["Connect it", "Report through approved process", "Give it to a coworker", "Ignore all media rules"], correct: 1, feedback: "Unknown media should not be connected." }])],
    ["Controlled Entry", "Familiarity does not replace controlled entry. Badge problems and visitor exceptions should follow the approved access or visitor process.", kc("A familiar coworker has a broken badge. What is strongest?", ["Use approved access or visitor process.", "Prop the door.", "Loan your badge.", "Disable entry control."], 0, "Controlled entry requires approved handling.")],
    ["Handle Information Carefully", "Information handling depends on classification and procedure. Learners practice distinguishing public, internal, sensitive, and restricted handling examples.", classify("Information Handling", "Classify each item.", [["Public press release", "EXPECTED"], ["Credential export", "ESCALATE"], ["Network security diagram", "REVIEW"], ["Internal operations schedule", "REVIEW"]])],
    ["Remote Access", "Remote work should use approved methods, MFA, appropriate environment, no credential sharing, and prompt reporting of unusual behavior.", kc("Which remote access practice is strongest?", ["Use approved method and report unexpected prompts.", "Share credentials for speed.", "Use unknown remote tool.", "Approve every prompt."], 0, "Approved access methods and reporting protect accountability.")],
    ["Report Early", "Reporting is not the same as declaring an incident. Early factual reporting allows responsible teams to evaluate and respond.", scenario("Rapid-Fire Awareness", "You see unexpected MFA, unknown USB, suspicious visitor, and sensitive email sent incorrectly.", [{ question: "Which items should be reported?", options: ["Only planned updates", "Unexpected MFA, unknown USB, suspicious visitor, and wrong-recipient sensitive email", "Nothing until confirmed incident", "Only emails"], correct: 1, feedback: "Early reporting supports evaluation." }])]
  ],
  "course-cip005-esp-access": [
    ["Electronic Access Points", "Access paths can include approved gateways, remote support paths, network services, and unapproved bypasses. Learners identify which paths require review.", classify("Network Path Review", "Classify each path.", [["Approved gateway", "DOCUMENT"], ["Unknown modem", "ESCALATE"], ["Remote vendor connection", "REVIEW"], ["Firewall path with owner", "DOCUMENT"]])],
    ["Who, What, Why, How Long", "An access request should identify requester, sponsor, system, privilege, reason, method, start, end, and approver.", evidence("Which fields are missing from a weak remote access request?", ["Sponsor", "System", "Privilege", "End date", "Approver", "Favorite color"], [0, 1, 2, 3, 4])],
    ["Least Necessary Access", "If a vendor needs to restart one service, a request for domain administrator should be reviewed for narrower appropriate access.", kc("What should happen to broad access requested for narrow work?", ["Review for least necessary appropriate access.", "Approve broad access for convenience.", "Share admin credential.", "Skip sponsor review."], 0, "Scope should match need.")],
    ["Vendor Access Lifecycle", "Vendor access moves from request to sponsor, authorize, provision, use, review, expire or remove.", { type: "timeline", title: "Vendor Access Lifecycle", data: { steps: ["Request", "Sponsor", "Authorize", "Provision", "Use", "Review", "Expire/remove"] } }],
    ["Vendor Ends Engagement", "Closure can include disabling accounts, removing remote authorization, reviewing credentials, recovering equipment, reviewing retained data, and documenting closure.", classify("Closure Checklist", "Classify each closure item.", [["Remote authorization removed", "DOCUMENT"], ["Credential still active", "ESCALATE"], ["Equipment recovered", "DOCUMENT"], ["Unclear retained data", "REVIEW"]])],
    ["Different Records Answer Different Questions", "Authorization records explain why access was permitted. Technical logs show whether access was used. Review records show whether access remains appropriate. Exception and configuration records explain controlled deviations.", kc("Which record best explains why remote access was allowed?", ["Authorization record.", "Unlabeled packet count.", "A lunch calendar.", "A screenshot with no date."], 0, "Authorization records capture approved purpose and scope.")],
    ["Emergency Vendor Support", "Degraded operations may require urgent support, but urgency does not justify invisible access. Sponsorship, approved method, scope, duration, evidence, and closure still matter.", scenario("Emergency Remote Support", "A grid application is degraded and a vendor requests urgent privileged remote access.", [{ question: "Best principle?", options: ["Use sponsor, approved method, scoped privilege, duration, evidence, and closure", "Bypass controls", "Share internal credentials", "Disable logs"], correct: 0, feedback: "Urgency still requires controlled access." }])]
  ],
  "course-cip006-physical-security": [
    ["Controlled Areas", "Physical access should connect an authorized person, authorized area, valid purpose, and approved entry method.", kc("Which entry is strongest?", ["Authorized person uses their own credential for approved area and purpose.", "Coworker shares a badge.", "Door is propped open.", "Unverified visitor follows inside."], 0, "Entry should be authorized and traceable.")],
    ["Badge and Access Credentials", "Use your own badge, report lost credentials, and follow entry processes. Do not share badges, prop doors, or permit unverified entry.", classify("Credential Choices", "Classify each action.", [["Report lost badge", "DOCUMENT"], ["Share badge", "ESCALATE"], ["Use own badge", "EXPECTED"], ["Prop controlled door", "ESCALATE"]])],
    ["Lost Badge Scenario", "A missing access credential should be reported promptly through the approved process so deactivation or other action can occur.", scenario("Lost Credential", "You discover your badge is missing after leaving a controlled facility.", [{ question: "Best response?", options: ["Wait a week", "Promptly use approved reporting process", "Borrow a coworker's badge", "Ignore it"], correct: 1, feedback: "Prompt reporting supports access control." }])],
    ["Visitor Lifecycle", "Visitor access commonly includes request, approval, identity verification, entry, escort/control, exit, and record.", { type: "timeline", title: "Visitor Lifecycle", data: { steps: ["Request", "Approval", "Verify", "Enter", "Escort/control", "Exit", "Record"] } }],
    ["Physical Access Records", "Badge events, visitor logs, alarm events, and investigation records answer different questions about physical access.", evidence("Which fields help physical access review?", ["Person", "Area", "Time", "Result", "Visitor sponsor", "Favorite entrance"], [0, 1, 2, 3, 4])],
    ["After-Hours Maintenance", "A maintenance team arrives after hours and only two of three people appear on the authorization list. The learner verifies, escalates, and documents rather than bypassing.", scenario("After-Hours Entry", "Three people arrive for approved work, but one is not on the list.", [{ question: "Best response?", options: ["Let everyone in", "Verify through approved sponsor/security process", "Loan badge", "Delete visitor record"], correct: 1, feedback: "Unlisted access should be verified." }])]
  ],
  "course-cip007-system-security": [
    ["Secure Configuration", "Secure configuration starts with an approved baseline, documented settings, accountable ownership, validation, and controlled handling of deviations. A baseline gives teams a reference point for expected state.", kc("What does a configuration baseline provide?", ["A reference for expected approved state.", "A replacement for ownership.", "A reason to skip validation.", "A guarantee that drift cannot occur."], 0, "Baselines support validation and drift review.")],
    ["Patch Identification", "Patch work begins by identifying the affected product, version, source, owner, and environment. The first question is whether the patch is relevant to the assets in scope.", classify("Patch Intake", "Classify each intake detail.", [["Affected product identified", "DOCUMENT"], ["No asset owner", "REVIEW"], ["Untrusted patch source", "ESCALATE"], ["Version confirmed", "DOCUMENT"]])],
    ["Patch Evidence", "A useful patch record can show patch identifier, affected asset, applicability decision, operational risk, owner, planned response, completion state, and verification result.", evidence("Which fields belong in patch evidence?", ["Patch ID", "Affected asset", "Applicability", "Owner", "Verification", "Favorite shell"], [0, 1, 2, 3, 4])],
    ["Prevention and Detection", "Malicious-code defenses may include approved protective technology, monitoring, updates, alert handling, and exception processes. The exact technology follows the organization's approved design.", kc("What should happen when a protective control alerts?", ["Follow response process and preserve useful context.", "Disable it immediately.", "Delete logs.", "Assume every alert is false."], 0, "Alerts need evaluation and traceable handling.")],
    ["Unexpected Detection", "A security control reports a suspicious executable on an operational server. The learner should preserve context, notify the appropriate response path, and avoid silencing the control to make the alert disappear.", scenario("Suspicious Executable", "A malicious-code control alerts on OPS-SRV-12 during normal operations.", [{ question: "What is the strongest first response?", options: ["Follow response process and preserve alert context", "Disable the tool", "Delete the alert", "Ignore because operations are busy"], correct: 0, feedback: "Preserving context supports evaluation and response." }])],
    ["Account Types", "Named user, privileged, service, shared where formally controlled, and temporary accounts all require appropriate ownership and review. Service accounts are not exempt from accountability.", classify("Account Type Review", "Classify each account condition.", [["Named admin with owner", "DOCUMENT"], ["Service account owner unknown", "REVIEW"], ["Shared account with no control", "ESCALATE"], ["Temporary account still current", "DOCUMENT"]])],
    ["Privilege and Authentication", "Privilege should match approved need. Administrative credentials deserve special care because they can change systems, access, logs, or security posture.", kc("Why avoid broad shared administrator use for convenience?", ["It weakens accountability and privilege control.", "It makes evidence more precise.", "It improves review quality.", "It eliminates risk."], 0, "Shared broad privilege can obscure who did what.")],
    ["Vulnerability Assessment Context", "A vulnerability assessment identifies potential weaknesses for evaluation. A finding is not automatically proof of exploitation, but it does need ownership and disposition.", { type: "process_diagram", title: "Finding Lifecycle", data: { stages: ["Discover", "Validate", "Evaluate", "Assign", "Remediate/Mitigate", "Verify", "Close"], caption: "Findings should move through accountable disposition." } }],
    ["Finding Lifecycle", "Findings should move from new to evaluated, assigned, remediation or mitigation, verification, and closure. Stalled findings need ownership attention.", classify("Finding Board", "Classify each finding state.", [["New finding without owner", "REVIEW"], ["Verified closure", "DOCUMENT"], ["Critical finding ignored", "ESCALATE"], ["Mitigation assigned", "DOCUMENT"]])],
    ["OPS-SRV-12 Capstone", "OPS-SRV-12 has a legacy FTP service with no owner, a security patch awaiting evaluation, a temporary admin account past expiration, a malware alert, and a vulnerability finding with no owner. Learners prioritize active response, expired privilege, ownership, lifecycle handling, and documentation.", scenario("System Security Capstone", "Multiple system-security concerns appear on OPS-SRV-12.", [{ question: "Which principle is strongest?", options: ["Prioritize active alert and expired privilege while routing other issues through accountable owners", "Ignore until audit", "Delete unclear records", "Assume all conditions are harmless"], correct: 0, feedback: "System security requires risk-aware action and traceable ownership." }])]
  ],
  "course-cip008-incident-response": [
    ["Report Early", "Reporting is not admitting failure. It gives qualified responders the opportunity to determine what happened.", kc("What should someone do with credible suspicious activity?", ["Report factual observations promptly.", "Wait for certainty.", "Destroy logs.", "Declare final cause alone."], 0, "Early factual reporting supports response.")],
    ["Who Does What", "Reporter, incident lead, technical responder, operations, management, compliance, and evidence owner each play different roles during response.", classify("Response Roles", "Classify each action.", [["Reporter captures facts", "DOCUMENT"], ["Incident lead coordinates", "EXPECTED"], ["Unapproved public post", "ESCALATE"], ["Evidence owner retains records", "DOCUMENT"]])],
    ["Escalation", "A night operator sees an unusual connection but is unsure. The best action is to report with factual observations.", scenario("Night Operator Escalation", "Unexpected remote connection appears during night shift.", [{ question: "Best next step?", options: ["Report facts", "Wait until morning", "Delete logs", "Declare final incident category"], correct: 0, feedback: "Uncertainty should still be escalated." }])],
    ["Capture Facts", "Useful records include time, system, user/account, observed behavior, alert source, actions taken, and reporter.", evidence("Which fields belong in an initial incident note?", ["Time", "System", "Observed behavior", "Alert source", "Actions taken", "Speculation as fact"], [0, 1, 2, 3, 4])],
    ["What Not To Do", "Do not destroy logs, alter evidence, silence alerts to reduce noise, make unsupported claims, or post sensitive details publicly.", kc("Which action weakens response?", ["Deleting logs to clean up.", "Preserving context.", "Escalating facts.", "Following responder direction."], 0, "Destroying context weakens response.")],
    ["Incident Timeline", "Response records are easier to understand when detection, report, triage, response action, recovery, closure, and lessons learned are ordered.", { type: "timeline", title: "Incident Timeline", data: { steps: ["Detection", "Report", "Triage", "Response action", "Recovery", "Closure", "Lessons learned"] } }],
    ["Status Updates", "Good status updates identify what happened, known scope, actions taken, open questions, and when the next update is expected.", kc("Which status update is strongest?", ["Known facts, actions, open questions, next update.", "Everything is probably fine.", "No update until final.", "Speculation only."], 0, "Concise factual updates support coordination.")],
    ["Lessons Learned", "Lessons learned identify what worked, what did not, owners, due dates, actions, and verification.", evidence("Which fields support lessons learned?", ["Action owner", "Due date", "Verification", "What worked", "What failed", "Rumor"], [0, 1, 2, 3, 4])]
  ],
  "course-cip009-recovery-planning": [
    ["Recovery Objectives", "Recovery planning identifies what must be restored, dependencies, required information, and sequencing. The internal procedure owns exact objectives.", kc("What should recovery planning clarify?", ["What must be restored and dependencies.", "Only who is on call.", "Only backup size.", "Nothing until disruption."], 0, "Recovery planning reduces uncertainty.")],
    ["Backup Exists vs Recovery Works", "A backup exists when a file is copied. Recovery readiness means it can be found, accessed, restored, and validated in the required context.", kc("Which statement is strongest?", ["A backup is useful when it supports validated recovery.", "Backup existence always proves recovery.", "Recovery never needs testing.", "Documentation is irrelevant."], 0, "Validation connects backup to recovery.")],
    ["Dependency Map", "Operations applications may depend on database, identity, network, configuration, certificates, storage, documentation, and people.", classify("Recovery Dependencies", "Classify each item.", [["Database backup", "DOCUMENT"], ["Identity dependency missing", "ESCALATE"], ["Retired storage reference", "REVIEW"], ["Validated procedure", "DOCUMENT"]])],
    ["Make Procedures Executable", "Executable recovery procedures identify roles, prerequisites, source, sequence, validation, and escalation rather than saying only restore system.", evidence("Which fields make recovery procedure usable?", ["Role", "Prerequisites", "Source", "Sequence", "Validation", "Guesswork"], [0, 1, 2, 3, 4])],
    ["Stale Procedure Scenario", "A recovery plan references a retired storage platform. The learner escalates and updates/validates instead of pretending the document remains reliable.", scenario("Stale Recovery Plan", "The recovery plan points to retired storage.", [{ question: "Best response?", options: ["Escalate, update, and validate", "Pretend it is current", "Delete the plan", "Improvise without control"], correct: 0, feedback: "Stale plans need controlled update." }])],
    ["Recovery Exercise", "Exercises prepare, execute, observe, validate, document, remediate, and retest.", { type: "timeline", title: "Recovery Exercise", data: { steps: ["Prepare", "Execute", "Observe", "Validate", "Document", "Remediate", "Retest"] } }]
  ],
  "course-cip010-change-vulnerability": [
    ["Baseline Record", "A baseline record should identify system, owner, date, version, approved components, configuration, services, software, and security settings.", evidence("Which missing baseline fields matter?", ["Owner", "Date", "Version", "System", "Approved state", "Favorite editor"], [0, 1, 2, 3, 4])],
    ["Change Is a Lifecycle", "Controlled change includes request, impact/risk review, approval, implementation, validation, documentation, and baseline update.", { type: "timeline", title: "Change Lifecycle", data: { steps: ["Request", "Impact/risk review", "Approval", "Implementation", "Validation", "Documentation", "Baseline update"] } }],
    ["Change Quality", "A strong change record captures reason, scope, approver, implementation, validation, and result.", kc("Which change note is strongest?", ["Reason, scope, approver, implementation, validation, result.", "Changed firewall.", "Done.", "Ask later."], 0, "Change quality requires traceability.")],
    ["Expected vs Unexpected Change", "Approved patches and scheduled tool updates are expected when documented. Unapproved service creation or unknown admin accounts require investigation.", classify("Configuration Change Review", "Classify each change.", [["Approved patch", "EXPECTED"], ["Unapproved service creation", "ESCALATE"], ["Scheduled tool update", "DOCUMENT"], ["Unknown local admin", "ESCALATE"]])],
    ["Drift", "Drift can indicate approved undocumented change, misconfiguration, automation issue, or unauthorized change. It requires evaluation rather than assumption.", kc("What is the best response to drift?", ["Evaluate and route through process.", "Always declare breach.", "Always ignore.", "Delete evidence."], 0, "Drift needs evaluation.")],
    ["What a Vulnerability Assessment Does", "An assessment discovers potential weakness for evaluation; it does not automatically prove exploitation.", kc("A finding means what?", ["Potential weakness requiring evaluation.", "Confirmed exploit every time.", "No action possible.", "No owner needed."], 0, "Findings require ownership and evaluation.")],
    ["Findings Need Owners", "Findings should identify affected asset, severity/context, owner, decision, planned action, target according to procedure, and verification.", evidence("Which fields support finding management?", ["Affected asset", "Owner", "Decision", "Planned action", "Verification", "Unassigned note"], [0, 1, 2, 3, 4])],
    ["Vulnerability Finding Lifecycle", "Findings move through discovery, validation, evaluation, assignment, remediation or mitigation, verification, and closure.", { type: "timeline", title: "Finding Lifecycle", data: { steps: ["Discover", "Validate", "Evaluate", "Assign", "Remediate/mitigate", "Verify", "Close"] } }],
    ["Change Evidence Package", "A change evidence package includes request, review, approval, implementation, verification, and baseline update.", evidence("Which records belong in a change evidence package?", ["Request", "Risk review", "Approval", "Validation", "Baseline update", "Unrelated chat"], [0, 1, 2, 3, 4])],
    ["Post-Maintenance Difference", "After maintenance, a configuration difference is found that is not listed in the approved change. The learner preserves the observation, checks for authorization, escalates, and resolves records.", scenario("Unauthorized Difference", "Post-maintenance review finds an unlisted configuration difference.", [{ question: "Best response?", options: ["Preserve, verify authorization, escalate, document resolution", "Ignore", "Delete evidence", "Assume approved"], correct: 0, feedback: "Unexpected differences need controlled review." }])]
  ],
  "course-cip011-information-protection": [
    ["Before You Share", "Before sharing, ask what it is, who needs it, where it may be stored, how it may be transmitted, and how it should be retained or disposed.", kc("What is strongest before sharing sensitive information?", ["Confirm need and approved handling.", "Use personal cloud storage.", "Send broadly.", "Assume all recipients need it."], 0, "Sharing should follow approved need and handling.")],
    ["Storage and Transmission", "Use approved repositories, approved transfer methods, recipient verification, and access limits.", scenario("Personal Cloud Drive", "An employee copies a sensitive configuration file to personal cloud storage to work from home.", [{ question: "Best response?", options: ["Use approved method instead", "Continue for convenience", "Share public link", "Delete audit records"], correct: 0, feedback: "Personal storage can bypass approved handling." }])],
    ["Wrong Recipient", "When sensitive information is sent to the wrong recipient, promptly follow applicable reporting and handling process rather than silently deleting the local copy.", kc("What should happen after a wrong-recipient sensitive email?", ["Promptly follow reporting/handling process.", "Pretend nothing happened.", "Forward more copies.", "Delete only sent copy."], 0, "Timely reporting supports containment.")],
    ["Media Lifecycle", "Information on media moves through create, use, store, transport, reuse, and dispose.", { type: "timeline", title: "Media Lifecycle", data: { steps: ["Create", "Use", "Store", "Transport", "Reuse", "Dispose"] } }],
    ["Information Scenario", "A vendor asks for network diagram, admin usernames, and configuration export to troubleshoot. Learners verify need, classification, approved sharing route, and minimum necessary information.", scenario("Vendor Information Request", "A vendor requests sensitive operational details for troubleshooting.", [{ question: "Best response?", options: ["Verify need and approved sharing route", "Send everything", "Use personal email", "Skip classification"], correct: 0, feedback: "Sensitive sharing requires verification and approved handling." }])]
  ],
  "course-cip012-control-center-communications": [
    ["Ownership", "Each communication-path component has technical ownership, service provider context, security responsibility, and change process.", classify("Communication Ownership", "Classify each component issue.", [["Endpoint owner known", "DOCUMENT"], ["Carrier change unreviewed", "REVIEW"], ["Security validation missing", "ESCALATE"], ["Approved design reference", "DOCUMENT"]])],
    ["Confidentiality", "Confidentiality limits unauthorized disclosure of sensitive operational communication where applicable.", kc("What does confidentiality address?", ["Unauthorized disclosure.", "Unauthorized modification.", "Physical badge loss.", "Patch inventory."], 0, "Confidentiality focuses on disclosure.")],
    ["Integrity", "Integrity protects against unauthorized modification so operational communication remains trustworthy.", kc("What does integrity address?", ["Unauthorized modification.", "Storage cost.", "Training attendance.", "Visitor logs."], 0, "Integrity focuses on modification.")],
    ["Authentication Context", "Authentication provides confidence in communicating endpoints or users where applicable. It should be implemented according to approved design.", kc("Why is authentication context useful?", ["It supports confidence in participating endpoints or users.", "It replaces documentation.", "It removes owners.", "It proves every route is approved."], 0, "Authentication supports trusted communication context.")],
    ["Communication Path Change", "Carrier route or transport changes should not be assumed equivalent without review of architecture, approved controls, documentation, and validation.", scenario("Carrier Path Change", "A carrier changes transport during migration.", [{ question: "Best response?", options: ["Review approved design and validation", "Assume equivalent", "Delete diagrams", "Skip owner review"], correct: 0, feedback: "Path changes need review." }])],
    ["New Circuit Scenario", "A new circuit is activated quickly for resiliency, but diagram and validation are incomplete. The learner routes through approved review before treating it as complete.", evidence("Which records support communication-path evidence?", ["Design", "Ownership", "Configuration reference", "Validation", "Change record", "Unverified assumption"], [0, 1, 2, 3, 4])]
  ],
  "course-cip013-supply-chain": [
    ["Risk Starts Before Purchase", "Security questions begin before selection: product purpose, vendor access, vulnerability communication, update delivery, support lifecycle, and data handling.", kc("When should supplier security questions begin?", ["Before purchase and through the relationship.", "Only after deployment.", "Only after audit.", "Never."], 0, "Supply-chain risk exists throughout the lifecycle.")],
    ["Product Security Considerations", "Security considerations include update mechanism, support lifecycle, authentication, remote access, vulnerability communication, dependencies, and incident notification.", classify("Supplier Profile Review", "Classify each profile item.", [["Signed updates", "DOCUMENT"], ["Persistent remote admin", "REVIEW"], ["Unknown vulnerability process", "ESCALATE"], ["Known support end date", "DOCUMENT"]])],
    ["Vendor Evaluation", "A supplier profile with persistent remote admin, unknown vulnerability process, and missing security contact needs questions resolved before approval.", evidence("Which supplier questions matter?", ["Remote access", "Updates", "Vulnerability process", "Security contact", "Data handling", "Logo color"], [0, 1, 2, 3, 4])],
    ["Vendor Access", "Vendor access should identify sponsor, scope, purpose, method, duration, privilege, monitoring/review, and termination.", kc("What should vendor access include?", ["Sponsor, scope, method, duration, privilege, and review.", "Permanent broad access.", "Shared account for speed.", "No end condition."], 0, "Vendor access should be scoped and reviewable.")],
    ["Permanent Admin Request", "A vendor requests a permanent shared domain administrator account for fastest support. The learner routes it through security/access review rather than approving convenience access.", scenario("Permanent Vendor Admin", "Vendor requests shared permanent administrator access.", [{ question: "Best response?", options: ["Route through security/access review", "Approve for convenience", "Share password", "Skip duration"], correct: 0, feedback: "Convenience does not justify uncontrolled access." }])],
    ["Vendor Changes", "Acquisition, support model changes, new cloud services, remote methods, end-of-life, or vendor incidents can trigger reassessment.", classify("Relationship Change Triggers", "Classify each supplier change.", [["Product end-of-life", "REVIEW"], ["New remote method", "ESCALATE"], ["Security contact updated", "DOCUMENT"], ["Vendor acquisition", "REVIEW"]])],
    ["Vulnerability Notification", "When a vendor reports a vulnerability, teams identify affected products, ownership, evaluation, and action tracking.", kc("What should a vendor vulnerability notice trigger?", ["Affected product and owner evaluation.", "Immediate deletion of records.", "No action.", "Permanent exception."], 0, "Notices need ownership and evaluation.")],
    ["Exit Planning", "Exit should address accounts, remote access, data, credentials, equipment, support links, and documentation.", evidence("Which fields belong in an exit checklist?", ["Accounts", "Remote access", "Data", "Credentials", "Support links", "Unrelated preference"], [0, 1, 2, 3, 4])]
  ],
  "course-cip014-physical-risk": [
    ["Threat, Vulnerability and Consequence", "Threat is what could cause harm, vulnerability is a condition that could be exploited, and consequence is the potential result.", classify("Risk Relationship", "Classify each item.", [["Camera blind spot", "REVIEW"], ["Changed traffic flow", "REVIEW"], ["Unowned mitigation", "ESCALATE"], ["Documented consequence", "DOCUMENT"]])],
    ["Structured Assessment", "A structured assessment identifies scope, information, threat considerations, vulnerabilities, consequences, recommendations, and review.", { type: "timeline", title: "Assessment Flow", data: { steps: ["Scope", "Information", "Threat considerations", "Vulnerabilities", "Consequences", "Recommendations", "Review"] } }],
    ["Assumptions", "Assumptions should be visible. A statement that Gate B remains staffed continuously should be verified when staffing changes.", kc("Why document assumptions?", ["So later reviewers know what facts the assessment relied on.", "To hide weak points.", "To replace review.", "To avoid ownership."], 0, "Visible assumptions support reevaluation.")],
    ["Mitigation Ownership", "Risk findings should lead to mitigation, owner, priority, timeframe according to process, and validation.", evidence("Which fields make mitigation traceable?", ["Mitigation", "Owner", "Priority", "Validation", "Due target", "Favorite camera brand"], [0, 1, 2, 3, 4])],
    ["Unowned Mitigation", "A camera blind spot is identified but no owner is assigned. Unowned mitigation is not completed risk treatment.", scenario("Camera Blind Spot", "A mitigation exists in concept but no owner is assigned.", [{ question: "Best response?", options: ["Assign/escalate ownership", "Assume complete", "Delete finding", "Wait indefinitely"], correct: 0, feedback: "Risk treatment needs ownership." }])],
    ["Validation", "Risk treatment is stronger when mitigation is validated. Validation may confirm that a camera view covers the intended area, a gate process works as designed, or an assigned action was completed.", kc("What does validation add to mitigation?", ["Confidence that the intended protection was implemented.", "Permission to leave owners blank.", "A replacement for assessment.", "A reason to delete findings."], 0, "Validation connects planned mitigation to actual completion.")],
    ["Coordination", "Physical risk management often involves operations, engineering, cybersecurity, emergency management, leadership, and physical security.", classify("Coordination Map", "Classify each role.", [["Operations consequence input", "DOCUMENT"], ["Cybersecurity dependency", "REVIEW"], ["No mitigation owner", "ESCALATE"], ["Leadership approval", "DOCUMENT"]])],
    ["Construction Change Capstone", "Construction changes traffic flow, fencing, camera visibility, and visitor approach. Because the existing assessment predates the change, learners route reassessment and mitigation ownership through the approved process.", scenario("Construction Change", "Facility construction changes facts used by the prior physical risk assessment.", [{ question: "Best response?", options: ["Route reassessment and assign mitigation owners", "Assume old assessment remains complete", "Ignore camera impact", "Remove records"], correct: 0, feedback: "Changed facts can affect physical risk assumptions." }])]
  ],
  "course-cip015-insm": [
    ["What Monitoring Can Reveal", "Monitoring may reveal unexpected communication pairs, unusual protocol, new administrative path, unexpected volume, internal scanning, or lateral-movement indicators.", kc("What does unusual traffic prove?", ["It requires evaluation, not instant proof of compromise.", "Confirmed compromise every time.", "No action ever.", "Monitoring is unnecessary."], 0, "Unusual activity requires evaluation.")],
    ["Know the Environment", "Monitoring design depends on network context, segments, critical systems, expected communications, visibility points, and telemetry owner.", evidence("Which fields support monitoring design?", ["Segments", "Critical systems", "Expected communications", "Visibility points", "Telemetry owner", "Unverified map"], [0, 1, 2, 3, 4])],
    ["Coverage", "A coverage map should identify operations segment, engineering segment, admin segment, critical servers, DMZ, and sensor visibility. Learners identify blind spots.", classify("Coverage Review", "Classify each observation.", [["Known sensor location", "DOCUMENT"], ["Critical segment blind spot", "ESCALATE"], ["Unknown telemetry owner", "REVIEW"], ["Current validation", "DOCUMENT"]])],
    ["Telemetry", "Telemetry may include network metadata, flows, packet-derived metadata where used, security events, and device telemetry. The design should avoid prescribing a single tool.", kc("Which telemetry statement is strongest?", ["Telemetry should match approved monitoring design.", "One technology is always required.", "Telemetry has no owner.", "Retention never matters."], 0, "Telemetry choices follow design and procedure.")],
    ["Baseline", "Baseline means understanding expected patterns well enough to recognize important change without promising perfect anomaly detection.", kc("What is a baseline useful for?", ["Recognizing potentially important change.", "Guaranteeing no incidents.", "Replacing response.", "Removing owners."], 0, "Baselines support evaluation.")],
    ["Expected vs Unusual", "Scheduled backup traffic may be expected, while new admin connections at unusual times or protocols between unrelated zones should be investigated.", classify("Traffic Review", "Classify each traffic example.", [["Scheduled backup", "EXPECTED"], ["New admin connection at 02:00", "REVIEW"], ["Approved new service", "DOCUMENT"], ["New protocol between unrelated zones", "ESCALATE"]])],
    ["Alert Context", "A strong alert includes time, source, destination, activity, reason, and related context. A weak alert says only something weird happened.", evidence("Which fields strengthen an alert?", ["Time", "Source", "Destination", "Activity", "Reason", "Rumor"], [0, 1, 2, 3, 4])],
    ["Investigation Handoff", "Monitoring identifies information. Incident response evaluates and coordinates subsequent action.", kc("How do monitoring and response relate?", ["Monitoring identifies; response evaluates and acts.", "Monitoring replaces response.", "Response deletes telemetry.", "No handoff is needed."], 0, "Monitoring feeds response processes.")],
    ["Unexpected Internal Administrative Connection", "An engineering workstation connects administratively to an operations server at 02:12 with no known maintenance. Learners preserve context and escalate.", scenario("Internal Admin Connection", "Unexpected administrative connection appears between internal systems.", [{ question: "Best response?", options: ["Preserve context, check expected change, escalate", "Declare final breach alone", "Delete telemetry", "Disable monitoring"], correct: 0, feedback: "Unexpected traffic needs context and escalation." }])],
    ["Monitoring Evidence", "Monitoring evidence includes coverage map, sensor/config reference, validation record, alert handling, and review.", evidence("Which records support monitoring assurance?", ["Coverage map", "Sensor reference", "Validation record", "Alert handling", "Review", "Unowned blind spot"], [0, 1, 2, 3, 4])]
  ],
  "course-audit-preparation": [
    ["Evidence Is Not Narrative", "Evidence records activity. Narrative explains how process and evidence connect. Strong audit packages use both appropriately without contradiction.", kc("What should narrative do?", ["Connect process and evidence.", "Replace missing activity.", "Contradict records.", "Hide gaps."], 0, "Narrative explains; evidence demonstrates.")],
    ["Quality Dimensions", "Evidence quality can be scored for traceability, completeness, relevance, consistency, readability, and authoritative source.", evidence("Which quality dimensions matter?", ["Traceable", "Complete", "Relevant", "Consistent", "Readable", "Decorative"], [0, 1, 2, 3, 4])],
    ["Sample Review", "Training records are reviewed: one complete, one missing course version, one conflicting completion date, and one complete. Learners identify defects.", classify("Training Record Samples", "Classify each sample.", [["Complete record", "DOCUMENT"], ["Missing course version", "REVIEW"], ["Conflicting completion date", "ESCALATE"], ["Complete signed record", "DOCUMENT"]])],
    ["Know the Population", "A sample only makes sense when the population is known. Five screenshots do not answer how many users were subject to a review.", kc("What strengthens a sample response?", ["Population plus requested sample IDs.", "Screenshots with no population.", "Verbal memory.", "No reconciliation."], 0, "Population context supports sample review.")],
    ["Population Mismatch", "A system report says 42 users while the evidence package says 39. Learners investigate and document the discrepancy rather than hiding it.", scenario("Population Difference", "Population report and package count do not match.", [{ question: "Best response?", options: ["Investigate and document discrepancy", "Hide the difference", "Change numbers without basis", "Ignore it"], correct: 0, feedback: "Differences should be reconciled factually." }])],
    ["Gap Categories", "Gaps can include missing evidence, incomplete evidence, control not performed, ownership unclear, procedure mismatch, and population issue.", classify("Gap Triage", "Classify each gap.", [["Missing approval", "ESCALATE"], ["Wrong procedure version", "REVIEW"], ["Complete sample", "DOCUMENT"], ["Unclear owner", "ESCALATE"]])],
    ["Preserve Factual Integrity", "Never modify historical records merely to make an activity appear to have occurred. Establish factual status, escalate, and remediate appropriately.", kc("What should happen when activity cannot be verified?", ["Record factual status and escalate.", "Backfill details.", "Delete evidence.", "Mark complete anyway."], 0, "Integrity matters more than cosmetic completeness.")],
    ["Explain the Control", "A control walkthrough should explain purpose, owner, trigger/frequency, process, evidence, exceptions, and monitoring.", evidence("Which fields support a control walkthrough?", ["Purpose", "Owner", "Trigger", "Evidence", "Exceptions", "Speculation"], [0, 1, 2, 3, 4])],
    ["Answer the Question Asked", "Strong responses are concise, factual, supported, and verify unknowns. Avoid guessing, overexplaining, inventing, or contradicting evidence.", kc("How should unknown details be handled?", ["Say what is known and verify unknowns.", "Guess confidently.", "Invent support.", "Contradict records."], 0, "Factual response protects credibility.")],
    ["Full Audit Simulation", "A package includes missing approval, stale exception, wrong procedure reference, and population discrepancy. Learners identify defects and create a readiness summary.", scenario("Audit Workspace Simulation", "Reviewer asks whether the package is audit-ready.", [{ question: "Best answer?", options: ["Not yet; gaps need resolution or factual escalation", "Yes because most samples are complete", "Hide the gaps", "Change historical records"], correct: 0, feedback: "Readiness requires addressing gaps honestly." }])]
  ],
  "course-internal-procedure-authoring": [
    ["Avoid Ambiguity", "Weak procedures say review accounts regularly. Strong procedures identify population, approved criteria, reviewer, date, required changes, and retained record without inventing schedule.", kc("Which instruction is clearer?", ["Obtain population, review by approved criteria, document reviewer/date/result.", "Review regularly.", "Handle accounts.", "Do the thing."], 0, "Procedures should be executable.")],
    ["Steps and Records", "Important steps should map to records: approval step to approval record, review step to completed review, change step to change record, exception to exception record.", classify("Step to Evidence", "Classify each mapping.", [["Approval step has record", "DOCUMENT"], ["Review step no output", "REVIEW"], ["Exception path missing", "ESCALATE"], ["Change record linked", "DOCUMENT"]])],
    ["Evidence Should Be Designed In", "If a procedure requires management approval but defines no way to capture it, evidence ambiguity is built into the process.", evidence("Which fields should approval evidence capture?", ["Approver", "Date", "Decision", "Scope", "Reference", "Memory only"], [0, 1, 2, 3, 4])],
    ["Version History", "Procedure records should preserve version, effective date, change summary, reviewer, approver, retired date, and historical record.", kc("Why does procedure version matter?", ["Evidence must connect to the procedure in effect at the time.", "Versions are decorative.", "Old versions should be deleted.", "Version history replaces approval."], 0, "Version traceability supports historical review.")],
    ["Procedure Change Scenario", "System UI and roles changed. The learner drafts an update, reviews impact, updates visuals, approves, publishes a new version, preserves old version, and communicates.", scenario("Procedure Change", "Screens and responsibilities changed after a workflow update.", [{ question: "Best sequence?", options: ["Draft, review impact, update, approve, publish new version, preserve history", "Overwrite history", "Delete evidence", "Skip communication"], correct: 0, feedback: "Procedure changes need review and version control." }])]
  ]
};

function course(idValue: string, title: string, subtitle: string, standard: string, duration: number, difficulty: string, icon: string, primarySkill: string, audienceItems: string[], lessonSeeds: Array<[string, string, BlockDef]>, assessmentCount: number, skills: string[], accessMode: Course["accessMode"] = "OPEN", status: CourseStatus = "PUBLISHED", showInCatalog = true): CourseDef {
  const authoredLessons = [...lessonSeeds, ...(additionalLessons[idValue] ?? [])];
  const lessonDefs = authoredLessons.map(([lessonTitle, body, activity], index) => lesson(`${idValue}-lesson-${index + 1}`, lessonTitle, Math.max(5, Math.round(duration / Math.max(1, authoredLessons.length))), [
    { type: "heading", body: lessonTitle },
    { type: "rich_text", body },
    { type: "why", title: "Why This Matters", body: domainWhy(standard, lessonTitle) },
    domainVisualBlock(idValue, lessonTitle),
    activity,
    { type: "audit_tip", title: "Evidence Connection", body: evidenceConnection(standard, lessonTitle) },
    { type: "key_takeaway", body: keyTakeaway(lessonTitle) }
  ]));
  const moduleSize = Math.ceil(lessonDefs.length / 4);
  const modules = Array.from({ length: 4 }, (_, index) => {
    const lessonsForModule = lessonDefs.slice(index * moduleSize, (index + 1) * moduleSize);
    return {
      title: moduleTitle(standard, index),
      intro: index === 0 ? subtitle : `Apply ${standard} concepts through focused examples and practice.`,
      lessons: lessonsForModule
    };
  }).filter((module) => module.lessons.length);
  modules.push(
    { title: "Final Assessment", intro: "Verify understanding and create completion evidence.", lessons: [lesson(`${idValue}-assessment`, "Final Assessment", 12, [{ type: "assessment", title: "Final Assessment", body: "Complete required lessons and activities before submitting the final assessment." }])] },
    { title: "Completion", intro: "Review completion and training record.", lessons: [lesson(`${idValue}-completion`, "Completion Summary", 2, [{ type: "completion", title: "Completion Summary" }])] }
  );
  return {
    id: idValue,
    title,
    shortTitle: title.split(" — ")[0],
    subtitle,
    description: `${subtitle}. Learners practice decisions, reviews, and record quality using examples specific to ${standard}.`,
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
    modules,
    assessment: authoredAssessment(idValue, standard, authoredLessons, assessmentCount)
  };
}

function moduleTitle(standard: string, index: number) {
  const titles = ["Foundations", "Operating Practice", "Applied Review", "Evidence and Readiness"];
  return `${standard} ${titles[index]}`;
}

function domainWhy(standard: string, lessonTitle: string) {
  return `${lessonTitle} matters because ${standard} activities only remain reliable when people can connect the decision, owner, timing, and evidence to the approved process.`;
}

function evidenceConnection(standard: string, lessonTitle: string) {
  return `For ${standard}, ${lessonTitle.toLowerCase()} should leave enough context for another qualified person to understand what occurred and why it was appropriate.`;
}

function keyTakeaway(lessonTitle: string) {
  return `${lessonTitle} is strongest when the learner can recognize the trigger, choose the controlled response, and preserve the record.`;
}

function domainVisualBlock(idValue: string, lessonTitle: string): BlockDef {
  if (idValue.includes("annual-awareness") && (lessonTitle.includes("MFA") || lessonTitle.includes("Authentication"))) return { type: "decision_cards", title: "MFA Prompt Simulation", data: { question: "An approval request appears while you are not signing in. What should you do?", options: ["Approve", "Deny and report", "Ignore the prompt", "Share credentials"], correct: 1, feedback: "Unexpected MFA prompts should be denied and reported through the approved channel." } };
  if (idValue.includes("annual-awareness") && (lessonTitle.includes("Rapid") || lessonTitle.includes("Report Early"))) return { type: "rapid_decisions", title: "Security Decisions", data: { actions: ["PROCEED", "VERIFY", "REPORT"], cards: [{ prompt: "Unexpected MFA approval request.", correct: "REPORT" }, { prompt: "Approved scheduled VPN login.", correct: "PROCEED" }, { prompt: "Urgent credential request from an executive account.", correct: "VERIFY" }, { prompt: "Unknown USB found near the facility.", correct: "REPORT" }] } };
  if (idValue.includes("cip005") || idValue.includes("cip012") || idValue.includes("cip015")) return { type: "network_explorer", title: idValue.includes("cip015") ? "Monitoring Coverage Map" : "Access Path Explorer", data: { nodes: idValue.includes("cip015") ? ["Operations Segment", "Engineering Segment", "Admin Segment", "Critical Servers", "Blind Spot"] : ["External", "Gateway", "Protected Network", "Approved Server", "Unknown Path"], expected: [4], prompt: "Explore the path and identify what needs review." } };
  if (idValue.includes("cip007") && (lessonTitle.includes("Ports") || lessonTitle.includes("Account") || lessonTitle.includes("OPS-SRV"))) return { type: "system_inspector", title: "OPS-SRV-12 Inspector", data: { prompt: "Select the rows that deserve further review.", rows: [["SSH 22", "Admin management", "Approved"], ["FTP 21", "Legacy transfer", "Owner Missing"], ["RDP 3389", "Temporary project", "Expired"], ["VendorSvc 9000", "Monitoring", "Approved"]], expected: [1, 2] } };
  if (idValue.includes("cip007") && lessonTitle.includes("Patch")) return { type: "sequence_builder", title: "Patch Evaluation Sequence", data: { prompt: "Put the patch response steps in a controlled order.", steps: ["Identify", "Determine Applicability", "Assess Risk", "Plan Response", "Implement/Mitigate", "Verify", "Document"] } };
  if (idValue.includes("cip010") && (lessonTitle.includes("Change") || lessonTitle.includes("Baseline"))) return { type: "before_after", title: "Configuration State Compare", data: { beforeTitle: "Uncontrolled change", before: ["Changed setting", "No approver", "No validation"], afterTitle: "Controlled change", after: ["Approved request", "Validated result", "Updated baseline"], improvements: ["owner", "approval", "verification", "baseline"] } };
  if (idValue.includes("cip008")) return { type: "sequence_builder", title: "Incident Timeline Builder", data: { prompt: "Arrange the response timeline.", steps: ["Detection", "Report", "Triage", "Response Action", "Recovery", "Closure", "Lessons Learned"] } };
  if (idValue.includes("audit-preparation")) return { type: "evidence_inspector", title: "Evidence Package Inspector", data: { prompt: "Select the evidence package items that need attention.", fields: [{ label: "Sample A", value: "Complete training record", expected: false }, { label: "Sample C", value: "Missing approval", expected: true }, { label: "Exception", value: "Expired review date", expected: true }, { label: "Procedure Reference", value: "Wrong version", expected: true }] } };
  if (idValue.includes("cip014")) return { type: "matching", title: "Threat, Vulnerability, Consequence", data: { pairs: [{ left: "Threat", right: "What could cause harm." }, { left: "Vulnerability", right: "Condition that could be exploited." }, { left: "Consequence", right: "Potential operational result." }] } };
  if (lessonTitle.includes("Lifecycle") || lessonTitle.includes("Flow") || idValue.includes("cip013")) return { type: "process_diagram", title: "Lifecycle View", data: { stages: ["Need", "Review", "Approve", "Operate", "Monitor", "Close"], caption: "The control remains reliable when each stage has ownership and evidence." } };
  if (lessonTitle.includes("Timeline") || lessonTitle.includes("Incident") || idValue.includes("cip008")) return { type: "timeline", title: "Decision Timeline", data: { steps: ["Observe", "Record facts", "Escalate", "Coordinate", "Document result"] } };
  return { type: "two_column", data: { leftTitle: "Strong practice", left: ["known owner", "clear scope", "approved path", "traceable result"], rightTitle: "Needs attention", right: ["unclear owner", "stale record", "unsupported assumption", "unresolved exception"] } };
}

function authoredAssessment(idValue: string, standard: string, lessonSeeds: Array<[string, string, BlockDef]>, count: number): CourseDef["assessment"] {
  const topicTitles = lessonSeeds.map(([title]) => title);
  const topicFor = (index: number) => topicTitles[index % topicTitles.length];
  const banks: Record<string, CourseDef["assessment"]> = {
    "course-cip002-categorization": [
      question("MULTIPLE_CHOICE", "Why is categorization foundational to the CIP program?", ["It establishes applicable scope.", "It replaces evidence retention.", "It makes every system high impact.", "It eliminates asset ownership."], [0], "Categorization establishes the scope used by later controls.", "Scope", "course-cip002-categorization-orientation"),
      question("MULTIPLE_CHOICE", "What information is most useful when reviewing a new system?", ["Function, dependencies, ownership, and applicable criteria.", "Hardware cost only.", "The number of desktop shortcuts.", "Whether the server name sounds important."], [0], "Function and context support a repeatable categorization decision.", "Context", "course-cip002-categorization-context"),
      question("TRUE_FALSE", "Hardware cost alone is enough to determine categorization.", ["True", "False"], [1], "Cost alone does not establish function or applicable criteria.", "Context", "course-cip002-categorization-context"),
      question("SCENARIO", "A reporting system begins exchanging operational control information. What should happen?", ["Ignore the change.", "Route the changed facts through approved reevaluation.", "Delete the old record.", "Assume the old determination remains complete."], [1], "New operational function and connectivity can change assumptions.", "Reevaluation", "course-cip002-categorization-practice"),
      question("MULTIPLE_SELECT", "Which fields strengthen a categorization record? Select all that apply.", ["System name", "Operational function", "Methodology used", "Reviewer", "Decision date", "Favorite browser"], [0, 1, 2, 3, 4], "Traceable records preserve decision path and outcome.", "Evidence", "course-cip002-categorization-evidence"),
      question("MULTIPLE_CHOICE", "Who should resolve uncertain scope questions?", ["The designated categorization owner or reviewer through the approved process.", "The newest learner.", "No one until audit.", "Anyone with spreadsheet access."], [0], "Uncertainty should go to the accountable process owner.", "Escalation", "course-cip002-categorization-practice"),
      question("MULTIPLE_CHOICE", "Which event is least likely by itself to alter functional categorization?", ["Cosmetic hostname display change with no functional or context change.", "New operational function.", "New network dependency.", "System consolidation."], [0], "Cosmetic changes may require documentation review but usually do not change function alone.", "Change", "course-cip002-categorization-practice"),
      question("MULTIPLE_CHOICE", "What should be retained after categorization?", ["Decision path and outcome.", "Only the final label.", "Only screenshots with no date.", "Nothing once approved."], [0], "The decision path makes later review possible.", "Evidence", "course-cip002-categorization-evidence"),
      question("SCENARIO", "GridView gains new connectivity and operational ownership. What is the best response?", ["Reevaluate using approved methodology.", "Preserve only the old low-scope note.", "Assume connectivity is irrelevant.", "Remove ownership records."], [0], "Changed function, connectivity, and ownership should trigger review.", "Scenario", "course-cip002-categorization-practice"),
      question("MULTIPLE_CHOICE", "Which summary best describes categorization?", ["A repeatable, evidence-supported scope decision.", "A one-time informal label.", "A hardware price exercise.", "A replacement for technical inventory."], [0], "Categorization is a repeatable process supported by evidence.", "Summary", "course-cip002-categorization-orientation")
    ],
    "course-cip007-system-security": [
      question("MULTIPLE_CHOICE", "Which service review item most clearly needs investigation?", ["Legacy FTP with no owner.", "Approved HTTPS application port.", "Documented SSH administration channel.", "Known vendor service with current approval."], [0], "Unowned legacy services expand exposure without clear business need.", "Ports and Services", "course-cip007-system-security-orientation"),
      question("MULTIPLE_CHOICE", "What is the purpose of a secure configuration baseline?", ["Describe expected approved state.", "Replace change approval.", "Make drift impossible.", "Eliminate owners."], [0], "A baseline gives teams a reference for validation and drift review.", "Configuration", "course-cip007-system-security-context"),
      question("SCENARIO", "A security patch applies but immediate installation conflicts with an operating constraint. What is strongest?", ["Document evaluation and follow approved response or mitigation process.", "Ignore the patch.", "Install unsafely without coordination.", "Delete the notification."], [0], "Patch governance balances applicability, risk, operational impact, and documentation.", "Patch Governance", "course-cip007-system-security-practice"),
      question("MULTIPLE_SELECT", "Which fields belong in patch evidence? Select all that apply.", ["Patch identifier", "Affected asset", "Applicability decision", "Owner", "Planned action", "Verification", "Favorite editor"], [0, 1, 2, 3, 4, 5], "Patch evidence should explain evaluation, decision, and result.", "Patch Evidence", "course-cip007-system-security-evidence"),
      question("MULTIPLE_CHOICE", "A malicious-code tool reports a suspicious executable. What should not happen?", ["Disable the tool to make the alert disappear.", "Follow response process.", "Preserve context.", "Escalate the observation."], [0], "Silencing controls can destroy useful context.", "Malicious Code", "course-cip007-system-security-practice"),
      question("MULTIPLE_CHOICE", "Which account review item needs action?", ["Contractor account after contract ended.", "Named active administrator with owner.", "Standard current user account.", "Service account with documented owner."], [0], "Former contractor access should be reviewed or removed through process.", "Account Management", "course-cip007-system-security-practice"),
      question("TRUE_FALSE", "A vulnerability finding automatically proves exploitation occurred.", ["True", "False"], [1], "Findings require evaluation and ownership; they do not by themselves prove exploitation.", "Vulnerability Management", "course-cip007-system-security-evidence"),
      question("MULTIPLE_CHOICE", "Which evidence package best supports system security management?", ["Patch evaluation, configuration record, account review, malicious-code control state, and vulnerability assessment.", "A note that says secure.", "A screenshot without date.", "A list of hostnames only."], [0], "System security evidence should cover the operated control areas.", "Evidence", "course-cip007-system-security-evidence"),
      question("SCENARIO", "OPS-SRV-12 has a malware alert, expired temporary admin account, and legacy FTP. What principle is strongest?", ["Address active security response and expired privilege while routing other items through owners.", "Ignore everything until audit.", "Delete records.", "Assume all conditions are harmless."], [0], "Prioritize active risk while preserving process and ownership.", "Capstone", "course-cip007-system-security-practice"),
      question("MULTIPLE_CHOICE", "Why should privileges match current need?", ["Excess privileges create avoidable exposure.", "It makes records shorter.", "It eliminates authentication.", "It lets accounts remain anonymous."], [0], "Privilege should be tied to current approved responsibilities.", "Privilege", "course-cip007-system-security-context"),
      question("MULTIPLE_CHOICE", "What does verification add after a change or patch?", ["Confidence that the expected result occurred.", "Permission to skip evidence.", "A replacement for approval.", "An excuse to remove owners."], [0], "Verification connects implementation to result.", "Verification", "course-cip007-system-security-evidence"),
      question("SCENARIO", "A service account has no owner. What is the best response?", ["Review ownership and purpose through the approved process.", "Share it broadly.", "Ignore it because it is not human.", "Delete evidence."], [0], "Service accounts need accountable ownership.", "Account Management", "course-cip007-system-security-practice"),
      question("MULTIPLE_CHOICE", "What is configuration drift?", ["Difference from expected state that needs evaluation.", "Always confirmed compromise.", "Always approved change.", "A training certificate."], [0], "Drift can have several causes and should be evaluated.", "Configuration", "course-cip007-system-security-context"),
      question("MULTIPLE_CHOICE", "Which lifecycle is best for vulnerability findings?", ["Discover, validate, evaluate, assign, remediate or mitigate, verify, close.", "Discover, hide, forget.", "Declare exploited, close.", "Assign no owner."], [0], "Findings need evaluation, ownership, action, and closure.", "Vulnerability Management", "course-cip007-system-security-evidence"),
      question("MULTIPLE_CHOICE", "What best summarizes CIP-007 learning?", ["System security requires operated controls, accountable review, and traceable evidence.", "One tool solves every system issue.", "Evidence replaces control operation.", "Only audits require system security."], [0], "The course connects operation, accountability, and evidence.", "Summary", "course-cip007-system-security-orientation")
    ]
  };
  if (banks[idValue]) return banks[idValue];
  const starters = lessonSeeds.map(([title, body], index) => question(
    index % 4 === 2 ? "TRUE_FALSE" : index % 4 === 3 ? "SCENARIO" : "MULTIPLE_CHOICE",
    authoredPromptFor(idValue, standard, title, index),
    authoredOptionsFor(title, body, index),
    index % 4 === 2 ? [1] : [0],
    authoredExplanationFor(title),
    topicFor(index),
    `${idValue}-${index < 2 ? (index === 0 ? "orientation" : "context") : "practice"}`
  ));
  const evidenceQuestion = question("MULTIPLE_SELECT", `Which fields make ${standard} course evidence more traceable?`, ["Learner", "Course version", "Completion date", "Assessment result", "Required activity result", "Unrelated preference"], [0, 1, 2, 3, 4], "Traceable evidence connects the learner, activity, version, timing, and result.", "Evidence", `${idValue}-evidence`);
  const result = [...starters, evidenceQuestion];
  while (result.length < count) {
    const topic = topicFor(result.length);
    result.push(question("MULTIPLE_CHOICE", `${topic}: which action best reflects the lesson principle?`, [`Apply the approved ${standard} process and document the result.`, "Use an informal shortcut with no owner.", "Wait for an audit before acting.", "Remove supporting records."], [0], `${topic} requires accountable action and traceable records.`, topic, `${idValue}-practice`));
  }
  return result.slice(0, count);
}

function authoredPromptFor(idValue: string, standard: string, title: string, index: number) {
  if (idValue.includes("annual-awareness") && title.includes("Phishing")) return "Which red flag is strongest in an urgent account-suspension email from a lookalike domain?";
  if (idValue.includes("cip005") && title.includes("Remote")) return "A vendor asks to use an unapproved remote tool because the approved service is slow. What should happen?";
  if (idValue.includes("cip006") && title.includes("Tailgating")) return "A familiar technician asks you to hold a controlled door while carrying equipment. What is the best response?";
  if (idValue.includes("cip008") && title.includes("Incident")) return `In ${standard} incident-response lesson ${index + 1}, what should the learner do with the facts presented in ${title}?`;
  if (idValue.includes("cip010") && title.includes("Emergency")) return "A service outage requires urgent configuration change. What keeps the action controlled?";
  if (idValue.includes("cip015") && title.includes("Monitoring")) return "What does internal monitoring provide when an unexpected administrative connection appears?";
  return `In ${standard} lesson ${index + 1}, ${title}: what is the strongest learner action?`;
}

function authoredOptionsFor(title: string, _body: string, index: number) {
  if (index % 4 === 2) return ["True", "False"];
  if (title.includes("Evidence") || title.includes("Record")) return ["Retain owner, date, scope, result, and supporting reference.", "Keep only a verbal explanation.", "Remove records after completion.", "Use screenshots with no context."];
  if (title.includes("Scenario") || title.includes("Capstone")) return ["Escalate through the approved process with factual context.", "Invent a local workaround.", "Assume no action is needed.", "Backfill unverifiable details."];
  return ["Use the approved process and preserve traceable evidence.", "Skip ownership when urgent.", "Wait until audit to decide.", "Treat exceptions as invisible."];
}

function authoredExplanationFor(title: string) {
  if (title.includes("Evidence") || title.includes("Record")) return "Useful records preserve who, what, when, outcome, and connection to the process.";
  if (title.includes("Scenario") || title.includes("Capstone")) return "Scenario decisions should preserve process integrity and route uncertainty to the accountable owner.";
  return "The strongest response follows the approved process and retains enough context for later review.";
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

  const assessment = stableRecord(`${definition.id}-assessment`, { courseVersionId: version.id, title: `${definition.title} Final Assessment`, instructions: "Answer each question. Passing score is 80%. Correct answers are shown after submission.", passingScore: 80, maxAttempts: 3, timeLimitMinutes: Math.max(10, definition.assessment.length), required: true });
  data.assessments.push(assessment);
  definition.assessment.forEach((seed, index) => {
    const questionId = `${definition.id}-q${index + 1}`;
    data.questions.push(stableRecord(questionId, { type: seed.type, prompt: seed.prompt, explanation: seed.explanation, difficulty: definition.difficulty, tags: ["NERC CIP", definition.standard, seed.topic, seed.lessonId] }));
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
