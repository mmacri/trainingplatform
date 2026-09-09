import type { LearningDiagram, ScenarioSeries, TrainingArtifact, TrainingWorld } from "../schema";

const worldId = "world-north-valley-energy";

export const northValleyWorld: Omit<TrainingWorld, "createdAt" | "updatedAt"> = {
  id: worldId,
  name: "North Valley Energy",
  description: "A fictional electric utility used solely for GridGuard training scenarios. It is not affiliated with any real utility.",
  facilities: [
    { id: "facility-nv-control-center", name: "North Valley Control Center", facilityType: "Control Center", locationSummary: "Primary control center in the fictional North Valley service area.", description: "Operations facility used in access, communications, incident, and monitoring scenarios.", relatedCourseIds: ["course-cip006-physical-security", "course-cip012-control-center-communications", "course-cip015-insm"] },
    { id: "facility-river-operations", name: "River Operations Center", facilityType: "Operations Center", locationSummary: "Secondary operations location used for communications-path exercises.", description: "Fictional regional operations center connected to North Valley Control Center.", relatedCourseIds: ["course-cip012-control-center-communications"] },
    { id: "facility-cedar-substation", name: "Cedar Substation", facilityType: "Substation", locationSummary: "Field facility used for physical-security risk scenarios.", description: "Training facility for construction, visitor, and risk-management exercises.", relatedCourseIds: ["course-cip006-physical-security", "course-cip014-physical-risk"] },
    { id: "facility-corporate-admin", name: "Corporate Administration Center", facilityType: "Corporate Office", locationSummary: "Administrative site used for manager, compliance, and authoring examples.", description: "Office setting for personnel, approval, and evidence workflows.", relatedCourseIds: ["course-cip003-security-management", "course-cip004-supervisor-workshop", "course-audit-preparation"] }
  ],
  people: [
    { id: "person-jordan-lee", name: "Jordan Lee", title: "Planning Analyst", department: "Business Planning", previousRole: "Control Center Operations", currentRole: "Business Planning", roleSummary: "Recently transferred from operations into planning; used for role-change and access-review scenarios.", trainingUseCases: ["CIP-004 personnel changes", "Supervisor access review", "Access lifecycle examples"] },
    { id: "person-jamie-rivera", name: "Jamie Rivera", title: "Systems Administrator", department: "Infrastructure Security", roleSummary: "Administrator supporting operations systems, patch evaluation, accounts, and incident context.", trainingUseCases: ["CIP-007 system security", "CIP-010 configuration change", "CIP-008 incident response", "CIP-015 monitoring"] },
    { id: "person-morgan-chen", name: "Morgan Chen", title: "Operations Training Manager", department: "Operations", roleSummary: "Manager persona for approvals, personnel changes, training assignments, and coaching.", trainingUseCases: ["Supervisor workshop", "Manager coaching", "Approval quality"] },
    { id: "person-taylor-morgan", name: "Taylor Morgan", title: "Operations Specialist", department: "Operations", roleSummary: "Learner persona for operator observations, reporting, awareness, and training completion.", trainingUseCases: ["Awareness", "CIP-004 annual refresher", "Incident reporting"] },
    { id: "person-casey-nguyen", name: "Casey Nguyen", title: "Compliance Manager", department: "Compliance", roleSummary: "Compliance reviewer for evidence packages, audit readiness, and standards impact.", trainingUseCases: ["Audit preparation", "Evidence quality", "Standards mapping"] },
    { id: "person-riley-patel", name: "Riley Patel", title: "Training Author and Control Owner", department: "Compliance Operations", roleSummary: "Author/control owner persona for procedure, review, and course-improvement workflows.", trainingUseCases: ["Procedure authoring", "Course Studio", "Control ownership"] }
  ],
  vendors: [
    { id: "vendor-vector-systems", name: "Vector Systems", description: "Fictional provider of monitoring and infrastructure support.", services: ["Monitoring platform support", "Infrastructure maintenance", "Security notification coordination"], relatedCourseIds: ["course-cip013-supply-chain", "course-cip015-insm", "course-cip005-esp-access"] },
    { id: "vendor-gridtech-services", name: "GridTech Services", description: "Fictional vendor providing maintenance and specialized operational support.", services: ["Emergency maintenance", "Remote support", "Field technical services"], relatedCourseIds: ["course-cip005-esp-access", "course-cip006-physical-security", "course-cip013-supply-chain"] }
  ],
  systems: [
    { id: "system-ops-srv-12", name: "OPS-SRV-12", systemType: "Operations Application Server", owner: "Infrastructure Security", facilityId: "facility-nv-control-center", description: "Recurring server used for services, patching, account review, vulnerability, and configuration exercises.", attributes: { role: "Operations application services", status: "Online", environment: "Operations" }, relatedCourseIds: ["course-cip007-system-security", "course-cip010-change-vulnerability"] },
    { id: "system-ops-srv-04", name: "OPS-SRV-04", systemType: "Operations Server", owner: "Grid Operations", facilityId: "facility-nv-control-center", description: "Server used in incident and internal monitoring scenarios.", attributes: { role: "Operations support", status: "Online", monitoring: "Internal visibility enabled" }, relatedCourseIds: ["course-cip008-incident-response", "course-cip015-insm"] },
    { id: "system-ems-app-04", name: "EMS-APP-04", systemType: "Energy Management Application", owner: "Grid Operations", facilityId: "facility-nv-control-center", description: "Fictional energy management application used in recovery and change-management examples.", attributes: { dependency: "Database, identity, storage, certificates", role: "Operational application" }, relatedCourseIds: ["course-cip007-system-security", "course-cip010-change-vulnerability", "course-cip009-recovery-planning"] },
    { id: "system-historian-02", name: "HISTORIAN-02", systemType: "Operational Historian", owner: "Operations Engineering", facilityId: "facility-river-operations", description: "Historian used for recovery, configuration, and monitoring coverage scenarios.", attributes: { role: "Operational data history", dependency: "Storage and identity" }, relatedCourseIds: ["course-cip009-recovery-planning", "course-cip010-change-vulnerability", "course-cip015-insm"] },
    { id: "system-eng-ws-22", name: "ENG-WS-22", systemType: "Engineering Workstation", owner: "Operations Engineering", facilityId: "facility-corporate-admin", description: "Workstation used as the source in unexpected administrative connection scenarios.", attributes: { role: "Engineering workstation", observedConnection: "OPS-SRV-04" }, relatedCourseIds: ["course-cip008-incident-response", "course-cip015-insm"] }
  ],
  relationships: [
    { id: "rel-ops12-ems", sourceId: "system-ops-srv-12", targetId: "system-ems-app-04", label: "supports operations application workflow" },
    { id: "rel-engws-ops04", sourceId: "system-eng-ws-22", targetId: "system-ops-srv-04", label: "unexpected administrative connection observed" },
    { id: "rel-vector-monitoring", sourceId: "vendor-vector-systems", targetId: "system-historian-02", label: "supports monitoring infrastructure" },
    { id: "rel-jordan-role", sourceId: "person-jordan-lee", targetId: "facility-nv-control-center", label: "previous operations access context" }
  ]
};

export const northValleyArtifacts: Array<Omit<TrainingArtifact, "createdAt" | "updatedAt">> = [
  artifact("artifact-ops-srv-12-account-inventory", "ACCOUNT_INVENTORY", "OPS-SRV-12 Account Inventory", "Privileged and service accounts under review.", ["course-cip007-system-security"], ["skill-account-management"], [
    ["jrivera-admin", "Named privileged account for Jamie Rivera", "Known owner and current role"],
    ["svc_backup", "Service account", "Owner unassigned"],
    ["vendor-temp", "Temporary vendor account", "Expired end date"],
    ["ops_shared", "Shared operations account", "Needs verification of approved control"]
  ], ["svc_backup", "vendor-temp", "ops_shared"]),
  artifact("artifact-ops-srv-12-patch-evaluation", "PATCH_EVALUATION", "PATCH-2026-042 Evaluation", "Applicable security patch with an operating constraint.", ["course-cip007-system-security", "course-cip010-change-vulnerability"], ["skill-patch-management"], [
    ["Patch ID", "PATCH-2026-042", "Known"],
    ["Applicable", "Yes", "Decision recorded"],
    ["Operational Constraint", "Quarter-end freeze", "Needs documented response"],
    ["Verification", "Blank", "Missing"]
  ], ["Verification"]),
  artifact("artifact-access-approval-weak", "ACCESS_APPROVAL", "Temporary Access Approval", "Weak approval record for repair.", ["course-cip004-supervisor-workshop", "course-cip005-esp-access"], ["skill-access-management", "skill-evidence-quality"], [
    ["Approval", "Approved", "Weak"],
    ["Person", "Riley Patel", "Known"],
    ["System", "Blank", "Missing"],
    ["Purpose", "Blank", "Missing"],
    ["Duration", "Blank", "Missing"]
  ], ["System", "Purpose", "Duration"]),
  artifact("artifact-audit-evidence-package", "EVIDENCE_PACKAGE", "Q3 Access Review Evidence Package", "Audit package with several intentional defects.", ["course-audit-preparation"], ["skill-audit-readiness", "skill-evidence-quality"], [
    ["Population", "42 privileged users", "Authoritative source"],
    ["Package Count", "39 records", "Mismatch"],
    ["Sample C Approval", "Blank", "Missing"],
    ["Exception EX-27", "Expired", "Stale"],
    ["Procedure Reference", "v2.8", "Wrong version"]
  ], ["Package Count", "Sample C Approval", "Exception EX-27", "Procedure Reference"]),
  artifact("artifact-incident-timeline-admin", "INCIDENT_TIMELINE", "Unexpected Administrative Connection Timeline", "Known facts from the 02:12 monitoring signal.", ["course-cip008-incident-response", "course-cip015-insm"], ["skill-incident-recognition", "skill-network-monitoring"], [
    ["02:12", "ENG-WS-22 connects to OPS-SRV-04", "Known fact"],
    ["02:14", "Authentication pattern changes", "Known fact"],
    ["02:18", "OPS-SRV-04 performance changes", "Observation"],
    ["Root Cause", "Unknown", "Do not speculate"]
  ], ["Root Cause"]),
  artifact("artifact-recovery-exercise-ems", "RECOVERY_EXERCISE", "EMS-APP-04 Recovery Exercise", "Exercise record with dependency issues.", ["course-cip009-recovery-planning"], ["skill-recovery"], [
    ["Plan Version", "3.1", "Known"],
    ["Identity Dependency", "Blank", "Missing"],
    ["Storage Platform", "Retired platform reference", "Stale"],
    ["Validation", "Partial", "Needs follow-up"]
  ], ["Identity Dependency", "Storage Platform", "Validation"]),
  artifact("artifact-monitoring-coverage", "MONITORING_COVERAGE_MAP", "Internal Monitoring Coverage Map", "Coverage review for operations and engineering segments.", ["course-cip015-insm"], ["skill-network-monitoring"], [
    ["Operations Segment", "Sensor NV-OPS-1", "Covered"],
    ["Engineering Segment", "Sensor NV-ENG-1", "Covered"],
    ["Historian Link", "No visibility owner", "Blind spot"],
    ["DMZ", "Metadata retained", "Covered"]
  ], ["Historian Link"])
];

export const northValleyDiagrams: Array<Omit<LearningDiagram, "createdAt" | "updatedAt">> = [
  diagram("diagram-cip007-system-lifecycle", "LIFECYCLE", "System Security Lifecycle", "Review how OPS-SRV-12 conditions move through hardening, patches, accounts, vulnerabilities, and evidence.", ["Services", "Patch Evaluation", "Malicious-Code Alert", "Account Review", "Vulnerability Finding", "Evidence"]),
  diagram("diagram-cip004-personnel-lifecycle", "PROCESS_FLOW", "Personnel Access Lifecycle", "Role changes should trigger training, access, and evidence review.", ["Role Change", "Review Responsibilities", "Review Access", "Document Actions", "Verify Completion"]),
  diagram("diagram-cip008-incident-timeline", "TIMELINE", "Incident Response Timeline", "Known observations should be preserved and escalated before final classification.", ["Detection", "Report", "Triage", "Response Action", "Recovery", "Closure", "Lessons Learned"]),
  diagram("diagram-cip009-dependency-map", "DEPENDENCY_MAP", "Recovery Dependency Map", "EMS-APP-04 depends on more than a backup file.", ["EMS-APP-04", "Database", "Identity", "Network", "Storage", "Certificates"]),
  diagram("diagram-audit-package", "RESPONSIBILITY_CHAIN", "Evidence Package Structure", "A review package connects procedure, population, samples, exceptions, and narrative.", ["Requirement", "Procedure", "Population", "Samples", "Evidence", "Exceptions", "Narrative"])
];

export const northValleyScenarioSeries: Array<Omit<ScenarioSeries, "createdAt" | "updatedAt">> = [
  { id: "series-ops-srv-12", title: "OPS-SRV-12 Investigation Series", description: "A connected technical sequence covering services, patch constraints, expired administrators, network activity, and a system-security capstone.", scenarioIds: ["scenario-ops-srv-12-review", "scenario-unauthorized-configuration-difference", "scenario-unexpected-admin-connection"], relatedSkillIds: ["skill-system-hardening", "skill-patch-management", "skill-account-management"] },
  { id: "series-personnel-change", title: "Personnel Change Series", description: "Jordan role-change exercises for access review, temporary assignment, and manager evidence.", scenarioIds: ["scenario-jordan-role-change-lab"], relatedSkillIds: ["skill-personnel-security", "skill-access-management"] },
  { id: "series-incident-response", title: "Incident Investigation Series", description: "Unexpected login and administrative-connection scenarios that emphasize facts, verification, and escalation.", scenarioIds: ["scenario-unexpected-admin-connection"], relatedSkillIds: ["skill-incident-recognition", "skill-incident-response", "skill-network-monitoring"] }
];

function artifact(id: string, artifactType: TrainingArtifact["artifactType"], title: string, subtitle: string, relatedCourseIds: string[], relatedSkillIds: string[], fields: string[][], issueLabels: string[]): Omit<TrainingArtifact, "createdAt" | "updatedAt"> {
  return {
    id,
    artifactType,
    title,
    subtitle,
    status: "Training artifact",
    relatedCourseIds,
    relatedSkillIds,
    fields: fields.map(([label, value, role]) => ({ id: `${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, value, inspectable: true, traceabilityRole: role })),
    issues: issueLabels.map((label) => ({ id: `${id}-issue-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, fieldId: `${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, severity: "CONCERN", learnerShouldIdentify: true, explanation: `${label} deserves review because it may prevent another reviewer from reconstructing or trusting the activity.` })),
    notes: ["Fictional North Valley Energy artifact for training only."]
  };
}

function diagram(id: string, type: LearningDiagram["type"], title: string, description: string, labels: string[]): Omit<LearningDiagram, "createdAt" | "updatedAt"> {
  const nodes = labels.map((label) => ({ id: `${id}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, description: `${label} is part of the training visual model.`, metadata: { evidence: `${label} record or decision` } }));
  return {
    id,
    type,
    title,
    description,
    orientation: "HORIZONTAL",
    stepThroughEnabled: true,
    relatedCourseIds: [],
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `${id}-edge-${index}`, sourceNodeId: nodes[index].id, targetNodeId: node.id }))
  };
}
