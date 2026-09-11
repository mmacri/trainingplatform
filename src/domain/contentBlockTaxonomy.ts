export const TEXT_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "rich_text",
  "definition",
  "key_concept",
  "why_this_matters",
  "takeaway"
]);

export const VISUAL_BLOCK_TYPES = new Set([
  "learning_diagram",
  "process_diagram",
  "timeline",
  "before_after",
  "comparison",
  "network_explorer",
  "system_inspector",
  "evidence_inspector",
  "artifact_review",
  "investigation_activity",
  "record_repair",
  "quality_comparison"
]);

export const PRACTICE_BLOCK_TYPES = new Set([
  "knowledge_check",
  "quick_recall",
  "decision_cards",
  "classification",
  "matching",
  "sequence_builder",
  "rapid_decisions",
  "checklist",
  "checklist_activity",
  "system_inspector",
  "evidence_inspector",
  "artifact_review",
  "investigation_activity",
  "record_repair"
]);

export const INVESTIGATION_BLOCK_TYPES = new Set([
  "artifact_review",
  "investigation_activity",
  "system_inspector",
  "evidence_inspector",
  "record_repair",
  "network_explorer"
]);

export const APPLIED_BLOCK_TYPES = new Set([
  "scenario",
  "system_inspector",
  "network_explorer",
  "artifact_review",
  "investigation_activity",
  "record_repair"
]);

export const INTERACTIVE_BLOCK_TYPES = new Set([
  ...PRACTICE_BLOCK_TYPES,
  ...INVESTIGATION_BLOCK_TYPES,
  ...APPLIED_BLOCK_TYPES
]);

export function isTextHeavyBlock(type: string) {
  return type === "paragraph" || type === "rich_text";
}

export function isVisualBlock(type: string) {
  return VISUAL_BLOCK_TYPES.has(type);
}

export function isPracticeBlock(type: string) {
  return PRACTICE_BLOCK_TYPES.has(type);
}

export function isInvestigationBlock(type: string) {
  return INVESTIGATION_BLOCK_TYPES.has(type);
}

export function isAppliedBlock(type: string) {
  return APPLIED_BLOCK_TYPES.has(type);
}

export function isInteractiveBlock(type: string) {
  return INTERACTIVE_BLOCK_TYPES.has(type);
}
