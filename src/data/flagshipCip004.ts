import { addDays, subDays } from "date-fns";
import type { AppData, Course, QuestionType, Role } from "./schema";

type SeedContext = {
  organizationId: string;
  ownerId: string;
  reviewerId: string;
  operationsTeamId: string;
  cipComplianceGroupId: string;
  standardVersionId: string;
};

type LessonSeed = {
  title: string;
  minutes: number;
  blocks: Array<{ type: string; title?: string; body?: string; data?: unknown; required?: boolean }>;
};

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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const objectives = [
  "Explain why personnel security is part of a strong cybersecurity and compliance program.",
  "Describe the relationship between assigned responsibilities and authorized access.",
  "Recognize events that should trigger access review or modification.",
  "Identify the purpose of personnel risk, training, and access-management activities.",
  "Distinguish between performing an activity and retaining evidence that proves it occurred.",
  "Recognize the characteristics of clear, traceable, audit-ready training and access evidence.",
  "Apply personnel-security concepts to realistic transfer, termination, and temporary-access scenarios.",
  "Identify personal responsibility for escalating access, training, and documentation concerns."
];

const acknowledgementText = `I acknowledge that I completed the NERC CIP-004 Personnel Security & Training - Annual Refresher course.

I understand that I am responsible for following the policies, procedures, access requirements, training expectations, and personnel-security responsibilities applicable to my role.

I understand that changes in my employment status, responsibilities, assignment, or access needs may require review or action through approved organizational processes.

I agree to raise questions or concerns through the appropriate management, security, support, or compliance channel rather than knowingly retaining access that I believe is unnecessary or inappropriate.`;

function knowledgeCheck(question: string, answers: string[], correct: number, correctFeedback: string, incorrectFeedback = "Not quite. Review the principle and try again.") {
  return {
    type: "knowledge_check",
    title: "Knowledge Check",
    required: true,
    data: { question, answers, correct, correctFeedback, incorrectFeedback, allowRetry: true }
  };
}

function moduleSummary(title: string, items: string[]) {
  return { type: "module_summary", title, data: { items } };
}

const courseModules: Array<{ title: string; intro?: string; lessons: LessonSeed[] }> = [
  {
    title: "Why Personnel Security Matters",
    intro: "Cybersecurity safeguards are often discussed in terms of systems, networks, tools, and controls. But people determine how those safeguards are used, maintained, approved, changed, and documented.",
    lessons: [
      {
        title: "People Are Part of the Security Boundary",
        minutes: 7,
        blocks: [
          { type: "heading", body: "People Are Part of the Security Boundary" },
          { type: "rich_text", body: "Organizations invest heavily in technical safeguards such as identity systems, network controls, logging, endpoint protection, physical security, and monitoring.\n\nThose controls are most effective when the people using and administering them understand what access they should have, what responsibilities apply to their roles, and when a change needs to be reported.\n\nPersonnel security connects the human side of operations to the organization's cybersecurity and compliance processes." },
          { type: "why", title: "Why This Matters", body: "Access that was appropriate yesterday may not be appropriate today.\n\nA person may change teams, complete a temporary project, leave the organization, or take on a new responsibility. When access is not reviewed as circumstances change, unnecessary privileges can remain in place.\n\nThat creates avoidable security and compliance risk." },
          { type: "definition", title: "Appropriate Access", body: "Access is appropriate when it is authorized, supports a current business or operational responsibility, and remains consistent with the organization's approved access-management process.", data: { note: "Appropriate access is not simply access that still works. It should have a current reason to exist." } },
          { type: "two_column", data: { leftTitle: "Access aligned to current responsibilities", left: ["current business need", "documented approval", "appropriate privilege level", "known owner", "reviewed when circumstances change"], rightTitle: "Access that may require attention", right: ["access inherited from an old role", "temporary access with no clear end date", "privilege retained just in case", "former project access", "access that no one can explain"] } },
          { type: "example", title: "Example", body: "Maria supports an operations application and requires elevated access to perform scheduled maintenance.\n\nSix months later, Maria transfers to a reporting team and no longer supports the application.\n\nThe fact that Maria's account still functions does not mean the access is still appropriate. Her change in responsibilities should trigger review of whether the elevated access is still needed." },
          knowledgeCheck("Which statement best reflects appropriate access?", ["Access should remain active as long as it is not causing an obvious problem.", "Access should match a person's current responsibilities and approved business need.", "Access should only be reviewed once per year.", "Once elevated access is granted, it should remain in place permanently."], 1, "Correct. Access should continue to reflect current responsibilities and an approved need.", "Not quite. Access should not remain simply because it still works or has not caused an incident."),
          { type: "key_takeaway", body: "Access should reflect today's responsibilities - not yesterday's responsibilities." }
        ]
      },
      {
        title: "Your Role in Compliance Readiness",
        minutes: 7,
        blocks: [
          { type: "heading", body: "Your Role in Compliance Readiness" },
          { type: "paragraph", body: "Compliance readiness is not something performed only by a compliance team.\n\nManagers, learners, administrators, access approvers, technical staff, human resources, contractors, and security personnel may all contribute to the activities and records that demonstrate an organization's personnel-security processes are operating as intended.\n\nA strong program depends on people performing their part consistently." },
          { type: "learning_objectives", title: "In this lesson, you will learn to:", data: { items: ["recognize your responsibility to complete assigned training", "identify when access concerns should be escalated", "understand why accurate records matter", "distinguish individual responsibility from process ownership"] } },
          { type: "callout", title: "Your responsibility does not require you to be a compliance expert", body: "Most learners do not need to interpret every requirement.\n\nThey do need to understand the responsibilities assigned to their role, follow approved procedures, complete required training, and raise concerns when something does not appear correct." },
          { type: "procedure", title: "A simple learner responsibility model", data: { steps: ["Understand the access and responsibilities associated with your role.", "Complete required awareness and training activities on time.", "Follow approved access and security procedures.", "Report role, employment, or access changes through the appropriate process.", "Escalate access that appears unnecessary or inappropriate.", "Complete acknowledgements and documentation accurately.", "Ask when you are unsure."] } },
          { type: "do_dont", data: { leftTitle: "DO", left: ["complete assigned training", "report changes promptly", "follow documented procedures", "ask questions", "accurately acknowledge completed activities"], rightTitle: "DON'T", right: ["assume someone else noticed the change", "retain access just in case", "sign off on activities you did not complete", "bypass required approval", "alter records to make them appear complete"] } },
          knowledgeCheck("You notice that you still have privileged access from a project that ended several months ago. What is the best action?", ["Keep it because it may be useful later.", "Ignore it unless someone asks.", "Raise the unnecessary access through the organization's approved access-review or support process.", "Use it occasionally so the account remains active."], 2, "You identified the important responsibility: unnecessary access should be raised through the approved process rather than ignored.", "Access should have a current purpose. If you believe access is no longer needed, raise it through the appropriate process."),
          moduleSummary("Module 1 Summary", ["People are part of the security boundary.", "Access should remain aligned with current responsibilities.", "Learners contribute to compliance readiness by following required processes.", "Concerns should be raised rather than ignored."])
        ]
      }
    ]
  },
  {
    title: "Personnel Risk & Responsibility",
    intro: "Personnel-security programs include processes designed to reduce risk associated with individuals who receive or maintain sensitive access.",
    lessons: [
      {
        title: "Personnel Risk Fundamentals",
        minutes: 8,
        blocks: [
          { type: "heading", body: "Personnel Risk Fundamentals" },
          { type: "definition", title: "Personnel Risk", body: "Personnel risk is the possibility that access, behavior, circumstances, or changes involving an individual could create security or operational exposure.\n\nOrganizations use personnel-related processes to identify, manage, and document those risks." },
          { type: "rich_text", body: "A personnel-risk program can include activities such as:\n\n* identity verification\n* personnel risk assessments\n* access authorization\n* cybersecurity awareness\n* role-based training\n* access review\n* access modification\n* termination processes\n* documented approvals\n* evidence retention\n\nThe exact process varies by organization and applicable requirements." },
          { type: "compliance_note", title: "Compliance Connection", body: "Personnel-related controls are strongest when activities are both completed and traceable.\n\nAn organization should be able to understand what occurred, who was involved, when it occurred, and how the activity relates to an applicable procedure or requirement." },
          { type: "process_diagram", title: "Personnel security lifecycle", data: { stages: ["Need Identified", "Authorization", "Training / Requirements", "Access Granted", "Ongoing Responsibility", "Change / Removal"], caption: "Personnel security is a lifecycle, not a one-time event." } },
          { type: "expandable", title: "What could change risk?", body: "Changes can include employment status, job responsibilities, access level, work location, contractor status, temporary assignment, security concern, system responsibility, and physical access needs.\n\nNot every change produces the same response. The important principle is that relevant changes should flow into the organization's approved personnel and access-management processes." },
          knowledgeCheck("Which statement best describes personnel security as a lifecycle?", ["Personnel processes end as soon as access is first granted.", "Access and responsibilities may need review as an individual's circumstances change.", "Only terminated employees require access review.", "Training is the only activity that matters."], 1, "Correct. Personnel security continues as responsibilities and access change."),
          { type: "key_takeaway", body: "Personnel security continues for as long as a person's responsibilities and access remain relevant." }
        ]
      },
      {
        title: "Roles, Responsibilities & Escalation",
        minutes: 7,
        blocks: [
          { type: "heading", body: "Roles, Responsibilities & Escalation" },
          { type: "paragraph", body: "Personnel-security processes often involve several different roles.\n\nA learner may not know who owns every technical or compliance activity, but should know how to raise an issue and avoid making assumptions that could leave unnecessary access or incomplete documentation in place." },
          { type: "role_cards", title: "Responsibilities vary by organization", data: { cards: [{ title: "Learner / Employee", items: ["complete required training", "follow procedures", "report relevant changes", "raise access concerns", "complete acknowledgements accurately"] }, { title: "Manager", items: ["communicate role changes", "confirm business need", "support access review", "ensure required training is addressed", "escalate unresolved concerns"] }, { title: "Access / System Owner", items: ["evaluate access request", "approve or reject as appropriate", "implement authorized changes", "retain relevant records"] }, { title: "Compliance / Security", items: ["define or support control processes", "monitor completion", "identify gaps", "review evidence", "support audit readiness"] }] } },
          { type: "callout", title: "When in doubt, escalate", body: "If you believe access is incorrect, a training requirement has been missed, or a personnel change has not been reflected in the appropriate system, do not assume someone else will fix it.\n\nUse the approved support, management, security, or compliance process." },
          { type: "checklist", title: "Before you consider an issue handled", data: { items: ["I identified the issue clearly.", "I used the appropriate reporting or escalation path.", "I provided enough information for someone to act.", "I understand whether additional action is required from me."] } },
          knowledgeCheck("Your teammate tells you their old administrator access remained active after changing roles. You are not the access owner. What should you do?", ["Nothing, because only the access owner can care about the issue.", "Use or test the access yourself.", "Encourage or initiate escalation through the approved process.", "Ask the teammate to keep the access secret."], 2, "Correct. You do not need to own the access to raise a concern through the approved path.")
        ]
      }
    ]
  },
  {
    title: "Access Must Match the Job",
    intro: "Many personnel-security issues occur because access remains unchanged after the reason for that access has changed.",
    lessons: [
      {
        title: "Access Authorization",
        minutes: 8,
        blocks: [
          { type: "heading", body: "Access Authorization" },
          { type: "why", title: "Why This Matters", body: "Access should have a reason.\n\nAn authorization process provides a way to connect access with the individual, requested privilege, business need, approver, effective date, and any limitations or conditions." },
          { type: "definition", title: "Authorization", body: "Authorization is documented approval for an individual to receive specified access based on an identified need and an approved process." },
          { type: "two_column", data: { leftTitle: "Strong access request", left: ["identifies the user", "identifies the requested system/resource", "states business need", "identifies privilege level", "receives documented approval", "can be traced later"], rightTitle: "Weak access request", right: ["vague request", "unclear purpose", "excessive privilege", "verbal-only approval", "no owner", "no useful record"] } },
          { type: "example", title: "Example", body: "Dylan temporarily supports a system migration and needs elevated access for 30 days.\n\nA stronger access process identifies Dylan, the system, required privilege, migration justification, approver, start date, and expected end date. This provides context when the temporary assignment ends." },
          { type: "audit_tip", title: "Useful evidence answers a future question", body: "If someone reviewing the record six months later cannot understand why access was granted, to whom, for what purpose, or by whose approval, the record may not provide enough context." },
          knowledgeCheck("Which access request provides the strongest basis for later review?", ["Give Taylor admin access.", "Taylor needs access.", "Grant Taylor elevated access to System A for scheduled patch administration through September 30, approved by the System A owner.", "Taylor had it before."], 2, "Correct. The request identifies the person, access, purpose, duration, and approver.")
        ]
      },
      {
        title: "Transfers, Promotions & Role Changes",
        minutes: 9,
        blocks: [
          { type: "heading", body: "Transfers, Promotions & Role Changes" },
          { type: "paragraph", body: "A change in job title does not automatically tell you whether access should be added, changed, or removed.\n\nWhat matters is the relationship between current responsibilities and current access." },
          { type: "role_cards", title: "Events that may require review", data: { cards: [{ title: "Transfer", body: "The individual moves to a different team or function.", question: "Does the previous role's access remain necessary?" }, { title: "Promotion", body: "The individual assumes new responsibilities.", question: "Is new access required, and is old access still appropriate?" }, { title: "Temporary Assignment", body: "The individual needs additional access for a limited period.", question: "Is the access time-bounded and reviewed at the end?" }, { title: "Leave", body: "The individual is temporarily away.", question: "Do organizational procedures require any access action?" }] } },
          { type: "procedure", title: "When responsibilities change", data: { steps: ["Confirm the new responsibilities.", "Identify access associated with the prior responsibilities.", "Determine which access remains necessary.", "Identify any new access required.", "Follow the approved authorization or removal process.", "Document the review and actions taken.", "Confirm completion when required."] } },
          { type: "classification", title: "Keep, Review, or Remove?", required: true, data: { instruction: "For each item, choose the best category.", categories: ["KEEP", "REVIEW", "REMOVE"], items: [{ text: "Access needed for the employee's new responsibilities", correct: "KEEP" }, { text: "Elevated access used only by the employee's previous team", correct: "REMOVE" }, { text: "Temporary project access with an end date that has passed", correct: "REMOVE" }, { text: "Standard company email access still required in the new role", correct: "KEEP" }] } },
          knowledgeCheck("An employee transfers to a new department. What is the best general principle?", ["Remove every account immediately regardless of need.", "Keep every existing privilege.", "Review access against the employee's new responsibilities.", "Wait until the annual training cycle."], 2, "Correct. Role changes should trigger review against current responsibilities.")
        ]
      },
      {
        title: "Termination & Access Removal",
        minutes: 8,
        blocks: [
          { type: "heading", body: "Termination & Access Removal" },
          { type: "why", title: "Why This Matters", body: "When a person's relationship with the organization ends - or when certain access is no longer authorized - the timing of access removal can become especially important.\n\nTermination processes are often coordinated across multiple teams and systems. The learner's responsibility is to follow the approved process and communicate relevant information promptly." },
          { type: "timeline", title: "Access removal timeline", data: { steps: ["Employment / engagement ends", "Responsible process receives notification", "Applicable physical and electronic access identified", "Required access removed or disabled", "Completion documented", "Evidence retained"] } },
          { type: "callout", title: "Do not improvise", body: "Organizations may have specific termination and emergency-access procedures.\n\nFollow the approved process rather than creating your own workaround." },
          { type: "example", title: "Example", body: "A contractor's engagement ends on Friday.\n\nThe contractor had remote-access credentials, application access, and physical entry permissions. A complete process should ensure relevant teams know the end date, applicable access is addressed through the approved procedure, and completion can be demonstrated later." },
          knowledgeCheck("Why is documentation important when access is removed?", ["It creates a traceable record that the required action occurred.", "It makes access removal optional.", "It replaces the need to actually disable access.", "It lets the learner change the access later."], 0, "Correct. Documentation creates a traceable record of the required action."),
          moduleSummary("Remember", ["Access management is not only about granting access.", "Strong programs also address change, review, reduction, removal, and documentation."])
        ]
      }
    ]
  },
  {
    title: "Training, Documentation & Evidence",
    intro: "A completed activity and evidence of that activity are related, but they are not the same thing.",
    lessons: [
      {
        title: "Training Is More Than Attendance",
        minutes: 7,
        blocks: [
          { type: "heading", body: "Training Is More Than Attendance" },
          { type: "paragraph", body: "A training program should be able to demonstrate more than the existence of course content.\n\nA useful training record helps answer: Who was assigned? Who completed? Which course did they take? Which version? When did they complete it? Did they meet required completion criteria? Was an assessment required? Was an acknowledgement required?" },
          { type: "record_card", title: "Training Completion Record", data: { label: "Example", fields: [["Learner", "Taylor Morgan"], ["Course", "CIP-004 Personnel Security & Training - Annual Refresher"], ["Version", "1.0"], ["Assigned", "September 1, 2026"], ["Completed", "September 14, 2026"], ["Assessment", "90% - Passed"], ["Acknowledgement", "Completed"], ["Certificate", "GG-CIP004-2026-000184"], ["Standard", "CIP-004"]] } },
          { type: "paragraph", body: "The exact fields retained depend on organizational procedure.\n\nThe principle is that the record should provide enough traceability to support future review." },
          knowledgeCheck("Which record provides the strongest evidence of training completion?", ["A list of employee names with no dates.", "A course screenshot.", "A record linking the learner, course/version, completion date, result, and relevant completion requirements.", "A manager saying the learner probably completed it."], 2, "Correct. Strong records link the learner, version, date, result, and requirements.")
        ]
      },
      {
        title: "What Makes Evidence Audit-Ready?",
        minutes: 8,
        blocks: [
          { type: "heading", body: "What Makes Evidence Audit-Ready?" },
          { type: "definition", title: "Evidence", body: "Evidence is information retained to demonstrate that a required or expected activity occurred.\n\nEvidence can take many forms depending on the process." },
          { type: "framework_cards", title: "Five-part framework", data: { cards: [["WHO", "Who performed or completed the activity?"], ["WHAT", "What activity occurred?"], ["WHEN", "When did it occur?"], ["RESULT", "What was the outcome?"], ["CONNECTION", "What procedure, control, requirement, assignment, or approval does the record relate to?"]] } },
          { type: "audit_tip", title: "Audit Tip", body: "A record is more useful when another qualified person can understand it without relying on someone's memory." },
          { type: "two_column", data: { leftTitle: "Poor", left: ["Training completed.", "Problems: no learner, no course, no date, no result, no version"], rightTitle: "Better", right: ["Taylor Morgan completed CIP-004 Personnel Security & Training v1.0 on September 14, 2026, passed the required assessment with 90%, and submitted the course acknowledgement."] } },
          { type: "evidence_builder", title: "Build the Record", required: true, data: { prompt: "Which fields would you retain to make this training record more traceable?", options: ["Learner identity", "Course title", "Course version", "Completion date", "Assessment result", "Acknowledgement state", "Favorite color", "Lunch selection"], correct: [0, 1, 2, 3, 4, 5], success: "Strong record. You selected the fields that establish identity, activity, timing, version, and completion result.", retry: "Focus on information that helps another person verify who completed what, when, and with what result." } },
          moduleSummary("Module 4 Summary", ["Evidence should make completed activity understandable and verifiable later."])
        ]
      }
    ]
  },
  {
    title: "Applied Personnel Security",
    intro: "You will now apply the concepts from the course to realistic situations. These activities are required before the final assessment unlocks.",
    lessons: [
      {
        title: "Interactive Scenario: Jordan's Role Change",
        minutes: 10,
        blocks: [
          { type: "scenario", title: "Jordan's Role Change", required: true, data: { label: "APPLIED SCENARIO", situation: "Jordan Lee has worked on the Control Center Operations team for three years. Jordan's current access includes remote administrative access, elevated access to an operational application, access to an operations file repository, physical access to a restricted workspace, and standard enterprise productivity tools. Jordan transfers to Business Planning. Jordan's new manager confirms that the new position does not require operational system administration or restricted workspace access. The transfer became effective yesterday.", steps: [{ question: "What is the most important event in this situation?", options: ["Jordan has worked for the company for three years.", "Jordan changed responsibilities and may no longer need access associated with the prior role.", "Jordan has access to enterprise productivity tools.", "The transfer occurred yesterday rather than today."], correct: 1, feedback: "The role change creates a reason to review whether Jordan's existing operational access is still required." }, { question: "Jordan's operational privileges still work. What should happen next?", options: ["Keep all access because nothing has malfunctioned.", "Ask Jordan not to use the privileges but leave them active.", "Initiate the approved access-review process and evaluate which privileges remain necessary.", "Wait until the next annual review."], correct: 2, feedback: "The fact that access is functional does not mean it remains appropriate. A role change should flow through the approved review process." }, { question: "Review the access", table: true, rows: [["Remote administrative access", "Required for old role", "Not required", "Remove"], ["Operational application elevated access", "Required for old role", "Not required", "Remove"], ["Operations file repository", "Used by old team", "Unconfirmed", "Review"], ["Restricted workspace", "Old role requirement", "Not required", "Remove"], ["Enterprise productivity tools", "Still required", "Required", "Keep"]] }, { question: "Which information would make the completed access review most traceable?", multi: true, options: ["Jordan's identity", "Effective date of role change", "Access reviewed", "Decision for each relevant access item", "Approver or responsible owner", "Completion date", "Reference to the applicable process", "Jordan's desk location", "Jordan's preferred phone model"], correct: [0, 1, 2, 3, 4, 5, 6] }], result: "You identified the role change, selected the appropriate review response, evaluated access against new responsibilities, and selected the information needed for a traceable record.", keyLesson: "When responsibilities change, access should be reviewed against the new reality - not simply carried forward." } }
        ]
      },
      {
        title: "Decision Exercise: Immediate Access Removal",
        minutes: 6,
        blocks: [
          { type: "decision_exercise", title: "Immediate Access Removal", required: true, data: { situation: "Sam is an external contractor whose engagement ends today. Sam has VPN access, elevated application access, building access, and a company-managed account. The responsible manager confirms the engagement will not be extended.", instruction: "Choose the best response at each point in the timeline.", decisions: [{ prompt: "The manager confirms Sam's engagement is ending. What is the best next step?", options: ["Wait to see whether Sam continues logging in.", "Trigger the organization's approved termination/access-removal process.", "Ask Sam to stop using the account without changing anything.", "Wait for the next training cycle."], correct: 1 }, { prompt: "One system owner has not responded. What should happen?", options: ["Mark the entire process complete anyway.", "Escalate the unresolved access through the approved process.", "Ignore that system because the other accounts were removed.", "Delete the evidence record."], correct: 1 }, { prompt: "What should the final record demonstrate?", options: ["That someone intended to remove the access.", "That applicable access-removal activities were addressed and completion was documented.", "Only that the manager sent an email.", "Nothing, because termination records are unnecessary."], correct: 1 }], result: "Access-removal activities should follow the organization's approved process, unresolved items should be escalated, and completion should be documented." } }
        ]
      }
    ]
  },
  {
    title: "Final Knowledge Assessment",
    lessons: [{ title: "Final Assessment", minutes: 15, blocks: [{ type: "assessment", title: "Final Assessment", body: "Complete all required activities before beginning the final assessment." }] }]
  },
  {
    title: "Completion",
    lessons: [
      { title: "Learner Acknowledgement", minutes: 3, blocks: [{ type: "acknowledgement", title: "Learner Acknowledgement", body: acknowledgementText, required: true }] },
      { title: "Completion Summary", minutes: 2, blocks: [{ type: "completion", title: "Completion Summary" }] },
      { title: "Certificate", minutes: 1, blocks: [{ type: "certificate", title: "Certificate" }] }
    ]
  }
];

const assessmentQuestions: Array<{ type: QuestionType; prompt: string; options: string[]; correct: number[]; explanation: string; topic: string }> = [
  { type: "MULTIPLE_CHOICE", prompt: "Which statement best describes appropriate access?", options: ["Any access previously approved should remain permanently.", "Access should remain aligned with current responsibilities and approved need.", "Access is appropriate if it has not caused an incident.", "Access only needs review after termination."], correct: [1], explanation: "Appropriate access should continue to correspond to current responsibilities and approved business need.", topic: "Access Authorization" },
  { type: "MULTIPLE_CHOICE", prompt: "What is the strongest reason to review access after a role transfer?", options: ["The employee may want a different password.", "Access associated with the prior role may no longer be required.", "Every transfer requires deletion of every account.", "Course certificates automatically expire."], correct: [1], explanation: "Prior-role access may no longer support the employee's current responsibilities.", topic: "Role Changes" },
  { type: "TRUE_FALSE", prompt: "If access still works after a role change, it can be assumed to remain appropriate.", options: ["True", "False"], correct: [1], explanation: "Functional access is not the same as appropriate access.", topic: "Access Changes" },
  { type: "MULTIPLE_CHOICE", prompt: "Which record is the strongest evidence of training completion?", options: ["A screenshot showing the course title.", "A manager's memory of the learner attending.", "A record identifying the learner, course/version, completion date, assessment result, and required acknowledgement.", "An undated list of employee names."], correct: [2], explanation: "Strong training evidence connects the learner, version, timing, result, and completion requirements.", topic: "Training Records" },
  { type: "MULTIPLE_SELECT", prompt: "Which events may justify reviewing a person's access? Select all that apply.", options: ["Transfer to another team", "End of a temporary assignment", "Termination", "Change in job responsibilities", "Employee changes desktop wallpaper"], correct: [0, 1, 2, 3], explanation: "Access review is tied to changes in role, assignment, employment, or responsibility.", topic: "Access Changes" },
  { type: "MULTIPLE_CHOICE", prompt: "A former project privilege is still active six months after the project ended. What is the best response?", options: ["Keep it in case another project appears.", "Raise it through the approved access-review process.", "Use it occasionally.", "Ignore it."], correct: [1], explanation: "Unnecessary access should be raised through the approved review path.", topic: "Escalation" },
  { type: "MULTIPLE_CHOICE", prompt: "What is the primary purpose of retaining evidence?", options: ["To prove that required activities occurred and can be verified later.", "To replace the actual activity.", "To avoid creating procedures.", "To increase the number of accounts."], correct: [0], explanation: "Evidence demonstrates that expected activities occurred.", topic: "Evidence" },
  { type: "MULTIPLE_SELECT", prompt: "Which information can make an access-review record more traceable? Select all that apply.", options: ["Individual involved", "Access reviewed", "Decision made", "Date completed", "Responsible approver or owner", "Favorite lunch order"], correct: [0, 1, 2, 3, 4], explanation: "Traceable records identify who, what, when, result, and accountable ownership.", topic: "Evidence" },
  { type: "SCENARIO", prompt: "Taylor's responsibilities change and elevated access from the old role is no longer required. What is the best general action?", options: ["Leave the access active until it expires on its own.", "Review and modify the access using the approved process.", "Ask Taylor never to use it.", "Wait until the next annual refresher."], correct: [1], explanation: "Access should be reviewed and modified through the approved process.", topic: "Role Changes" },
  { type: "MULTIPLE_CHOICE", prompt: "Which statement best describes a learner's responsibility?", options: ["Learners must personally interpret every compliance requirement.", "Learners should understand and follow responsibilities assigned to their role and raise concerns through approved channels.", "Learners should modify their own access whenever they think it is unnecessary.", "Learners are not responsible for reporting access concerns."], correct: [1], explanation: "Learners support compliance readiness by following assigned responsibilities and escalating concerns.", topic: "Personnel Responsibility" },
  { type: "TRUE_FALSE", prompt: "A documented approval is useful because it helps establish why access was granted and who authorized it.", options: ["True", "False"], correct: [0], explanation: "Approval records make the access decision traceable.", topic: "Access Authorization" },
  { type: "MULTIPLE_CHOICE", prompt: "A temporary administrator assignment ended yesterday. Which access design is strongest?", options: ["Elevated access with no end date.", "Elevated access tied to a defined need and reviewed when the assignment ends.", "A shared administrator password.", "Permanent privilege because temporary access is difficult to manage."], correct: [1], explanation: "Temporary access should be tied to a defined need and reviewed when that need ends.", topic: "Access Changes" },
  { type: "MULTIPLE_CHOICE", prompt: "Which evidence statement is strongest?", options: ["Access reviewed.", "Employee handled.", "Jordan Lee's prior operational access was reviewed after the September 3 role transfer; unnecessary elevated privileges were removed and completion was recorded September 4.", "Done."], correct: [2], explanation: "The strongest statement identifies the person, trigger, action, outcome, and date.", topic: "Evidence" },
  { type: "SCENARIO", prompt: "A contractor's engagement has ended, but one application owner has not completed the requested access removal. What is the best response?", options: ["Mark the process complete because most access was removed.", "Escalate the unresolved access through the approved process.", "Delete the pending request.", "Wait indefinitely."], correct: [1], explanation: "Unresolved access should be escalated through the approved process.", topic: "Termination" },
  { type: "MULTIPLE_CHOICE", prompt: "Which statement best summarizes this course?", options: ["Personnel security is a one-time activity performed when someone is hired.", "Personnel security requires ongoing alignment between responsibilities, access, training, changes, and evidence.", "Technical tools eliminate the need for personnel processes.", "Evidence matters more than performing the required activity."], correct: [1], explanation: "Personnel security is an ongoing relationship among responsibilities, access, training, changes, and evidence.", topic: "Course Summary" }
];

export function addFlagshipCip004Course(data: AppData, ctx: SeedContext): Course {
  const course: Course = {
    id: "course-cip004-annual-refresher",
    organizationId: ctx.organizationId,
    slug: "cip-004-annual-refresher",
    title: "NERC CIP-004 Personnel Security & Training — Annual Refresher",
    shortTitle: "CIP-004 Annual Refresher",
    subtitle: "Personnel risk, access responsibilities, training obligations, and audit-ready evidence",
    shortDescription: "This annual refresher helps personnel understand how their actions support personnel security and NERC CIP compliance readiness.",
    category: "NERC CIP",
    subcategory: "Personnel & Training",
    difficulty: "Intermediate",
    estimatedMinutes: 75,
    delivery: "Self-paced",
    language: "English",
    recurrence: "Annual",
    sequencing: "Recommended sequential progression. Lessons may be revisited at any time. Required activities must be completed before the final assessment.",
    audienceDescription: "This course is intended for personnel whose work may involve access to, support of, administration of, or responsibility for systems and environments governed by organizational NERC CIP procedures. Your organization's specific role requirements remain authoritative.",
    status: "PUBLISHED",
    accessMode: "ASSIGNMENT_ONLY",
    allowSelfEnrollment: false,
    showInCatalog: true,
    allowAccessRequests: true,
    requireManagerApproval: false,
    certificateEnabled: true,
    ownerId: ctx.ownerId,
    icon: "ShieldCheck",
    accent: "#0e7490",
    coverVisual: "NERC CIP abstract shield",
    completionEvidence: ["Course completion", "Assessment score", "Acknowledgement", "Certificate", "Scenario completion"],
    completionDeadlineDays: 30,
    requireAllLessons: true,
    requireFinalAssessment: true,
    requireScenarios: true,
    requireAcknowledgement: true,
    requireManagerValidation: false,
    finalAssessmentEnabled: true,
    attemptsAllowed: 3,
    failedAttemptBehavior: "RETRY_IMMEDIATELY",
    randomizeQuestions: false,
    randomizeAnswers: false,
    showAnswersAfterAttempt: true,
    certificateName: "NERC CIP Training Completion",
    certificateExpirationMonths: 12,
    createdAt: iso(subDays(new Date(), 12)),
    updatedAt: iso(subDays(new Date(), 1))
  };
  data.courses.push(course);
  data.courseOwners.push(record("owner", { courseId: course.id, userId: ctx.ownerId }));
  data.courseContributors.push(record("contrib", { courseId: course.id, userId: ctx.reviewerId, role: "REVIEWER" as Role }));
  data.courseAccessPolicies.push(record("policy", { courseId: course.id, mode: course.accessMode }));
  data.courseAccessGrants.push(record("grant", { courseId: course.id, grantType: "TEAM" as const, grantId: ctx.operationsTeamId }));
  data.courseAccessGrants.push(record("grant", { courseId: course.id, grantType: "GROUP" as const, grantId: ctx.cipComplianceGroupId }));

  const version = record("version", {
    courseId: course.id,
    version: "1.0",
    status: "PUBLISHED" as const,
    summary: course.shortDescription,
    goal: "Personnel security depends on people recognizing when access is appropriate, when circumstances have changed, when action is required, and how the organization proves those actions occurred.",
    publishedAt: iso(subDays(new Date(), 10)),
    publishedById: ctx.ownerId,
    versionNotes: "Initial approved release for annual CIP-004 personnel-security refresher training.",
    immutable: true,
    completionRules: ["LESSONS", "KNOWLEDGE_CHECKS", "SCENARIO", "DECISION_EXERCISE", "ASSESSMENT", "ACKNOWLEDGEMENT", "CERTIFICATE"]
  });
  data.courseVersions.push(version);
  course.currentVersionId = version.id;
  course.draftVersionId = version.id;

  const objectiveIds = objectives.map((text, index) => {
    const objective = record("obj", { courseVersionId: version.id, text, position: index + 1 });
    data.learningObjectives.push(objective);
    return objective.id;
  });
  data.courseStandardMappings.push(record("mapping", { courseId: course.id, standardVersionId: ctx.standardVersionId, objectiveId: objectiveIds[0], requirementText: "Mapped to CIP-004 Personnel & Training", trainingRelevance: "Annual personnel-security refresher training", evidenceExpectation: "Completion record, assessment score, scenario completion, acknowledgement, and certificate." }));

  courseModules.forEach((moduleSeed, moduleIndex) => {
    const module = record("module", { courseVersionId: version.id, title: moduleSeed.title, position: moduleIndex + 1, intro: moduleSeed.intro });
    data.modules.push(module);
    moduleSeed.lessons.forEach((lessonSeed, lessonIndex) => {
      const lessonIsRequired = !["Interactive Scenario: Jordan's Role Change", "Decision Exercise: Immediate Access Removal", "Final Assessment", "Learner Acknowledgement", "Completion Summary", "Certificate"].includes(lessonSeed.title);
      const lesson = record("lesson", { moduleId: module.id, courseVersionId: version.id, title: lessonSeed.title, slug: slugify(lessonSeed.title), position: lessonIndex + 1, required: lessonIsRequired, estimatedMinutes: lessonSeed.minutes });
      data.lessons.push(lesson);
      lessonSeed.blocks.forEach((block, blockIndex) => data.contentBlocks.push(record("block", { lessonId: lesson.id, type: block.type, title: block.title, body: block.body, data: block.data, required: block.required, position: blockIndex + 1 })));
    });
  });

  data.courseResources.push(
    record("resource", { courseId: course.id, title: "Course Glossary", description: "Definitions used throughout this training.", type: "INTERNAL", visibility: "ENROLLED" as const, url: "gridguard://glossary/cip004" }),
    record("resource", { courseId: course.id, title: "Personnel Access Review Checklist", description: "A simple learner reference for recognizing access-review triggers.", type: "INTERNAL", visibility: "ENROLLED" as const, url: "gridguard://resource/access-review-checklist" }),
    record("resource", { courseId: course.id, title: "Training Record Example", description: "Example of a traceable training-completion record.", type: "INTERNAL", visibility: "ENROLLED" as const, url: "gridguard://resource/training-record-example" }),
    record("resource", { courseId: course.id, title: "NERC CIP Standards Reference", description: "Public NERC CIP standards reference.", type: "URL", visibility: "ENROLLED" as const, url: "https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx" })
  );

  const skills = ["Personnel Responsibility", "Access Authorization", "Role Changes", "Evidence", "Training Records"];
  skills.forEach((skillName, index) => {
    const skill = record("skill", { organizationId: ctx.organizationId, name: skillName, description: `${skillName} demonstrated through CIP-004 annual refresher activities.`, level: index < 2 ? "Working" : "Foundational" });
    data.skills.push(skill);
    data.courseSkills.push(record("courseskill", { courseId: course.id, skillId: skill.id, level: skill.level }));
  });

  const certification = record("cert", { organizationId: ctx.organizationId, name: "NERC CIP-004 Annual Refresher Certificate", description: "Issued after completion of the CIP-004 Personnel Security & Training annual refresher.", validityDays: 365, renewalWindowDays: 30, status: "ACTIVE" as const });
  data.certifications.push(certification);
  data.certificationRequirements.push(record("certreq", { certificationId: certification.id, type: "COURSE" as const, targetId: course.id }));

  const assessment = record("assess", { courseVersionId: version.id, title: "CIP-004 Annual Refresher Final Assessment", instructions: "Answer each question. Correct answers are shown only after submission. Passing score is 80%.", passingScore: 80, maxAttempts: 3, timeLimitMinutes: 15, required: true });
  data.assessments.push(assessment);
  assessmentQuestions.forEach((seed, index) => {
    const question = record("question", { type: seed.type, prompt: seed.prompt, explanation: seed.explanation, difficulty: "Intermediate", tags: ["NERC CIP", "CIP-004", seed.topic] });
    data.questions.push(question);
    seed.options.forEach((text, optionIndex) => data.questionOptions.push(record("option", { questionId: question.id, text, isCorrect: seed.correct.includes(optionIndex), position: optionIndex + 1 })));
    data.assessmentQuestions.push(record("aq", { assessmentId: assessment.id, questionId: question.id, points: 1, position: index + 1 }));
  });

  return course;
}

export const cip004AcknowledgementText = acknowledgementText;
