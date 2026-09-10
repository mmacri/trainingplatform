import type { AppData, InvestigationDefinition } from "../data/schema";

export interface InvestigationResultSummary {
  findingCoverage: "Needs Review" | "Developing" | "Strong";
  evidenceQuality: "Needs Review" | "Developing" | "Strong";
  verificationState: string;
  escalationState: string;
  conclusionQuality: "Needs Review" | "Developing" | "Strong";
  foundCount: number;
  expectedCount: number;
}

export class InvestigationService {
  static definition(data: AppData, investigationId: string): InvestigationDefinition | undefined {
    return data.investigationDefinitions.find((item) => item.id === investigationId);
  }

  static notesForAttempt(data: AppData, attemptId: string) {
    return data.investigationNotes.filter((note) => note.attemptId === attemptId).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  static latestHypothesis(data: AppData, attemptId: string) {
    return data.investigationHypotheses
      .filter((item) => item.attemptId === attemptId)
      .sort((left, right) => new Date(right.selectedAt).getTime() - new Date(left.selectedAt).getTime())[0];
  }

  static evaluate(data: AppData, investigationId: string, attemptId: string): InvestigationResultSummary {
    const definition = this.definition(data, investigationId);
    const notes = this.notesForAttempt(data, attemptId);
    const expectedCount = definition?.findings.length ?? 0;
    const findingIds = new Set(notes.filter((note) => note.noteType === "FINDING").map((note) => note.sourceRecordId).filter(Boolean));
    const evidenceCount = notes.filter((note) => note.noteType === "EVIDENCE").length;
    const foundCount = definition?.findings.filter((finding) => findingIds.has(finding.sourceRecordId)).length ?? 0;
    const coverageRatio = expectedCount ? foundCount / expectedCount : 0;
    return {
      findingCoverage: label(coverageRatio),
      evidenceQuality: label(expectedCount ? Math.min(1, evidenceCount / Math.max(1, Math.ceil(expectedCount * 0.75))) : 0),
      verificationState: notes.some((note) => note.content.toLowerCase().includes("verify") || note.content.toLowerCase().includes("maintenance")) ? "Verification context captured" : "Verification context should be strengthened",
      escalationState: notes.some((note) => note.content.toLowerCase().includes("escalat") || note.content.toLowerCase().includes("owner")) ? "Escalation/owner path captured" : "Escalation path not yet clear",
      conclusionQuality: label((coverageRatio + (evidenceCount ? 0.5 : 0)) / 1.5),
      foundCount,
      expectedCount
    };
  }
}

function label(value: number): "Needs Review" | "Developing" | "Strong" {
  if (value >= 0.8) return "Strong";
  if (value >= 0.45) return "Developing";
  return "Needs Review";
}
