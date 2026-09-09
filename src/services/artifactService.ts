import type { TrainingArtifact } from "../data/schema";

export interface ArtifactFindingResult {
  targetId: string;
  label: string;
  classification: "VALID_CONCERN" | "NEEDS_CONTEXT" | "NOT_A_CONCERN";
  explanation: string;
}

export interface ArtifactReviewResult {
  identified: ArtifactFindingResult[];
  missed: ArtifactFindingResult[];
  needsContext: ArtifactFindingResult[];
  falsePositives: ArtifactFindingResult[];
}

export class ArtifactService {
  static review(artifact: TrainingArtifact, selectedFieldIds: string[]): ArtifactReviewResult {
    const selected = new Set(selectedFieldIds);
    const expected = new Set((artifact.issues ?? []).filter((issue) => issue.learnerShouldIdentify && issue.fieldId).map((issue) => issue.fieldId!));
    const fields = artifact.fields;
    const fieldById = new Map(fields.map((field) => [field.id, field]));

    const identified = [...expected]
      .filter((fieldId) => selected.has(fieldId))
      .map((fieldId) => this.resultFor(artifact, fieldId, "VALID_CONCERN"));
    const missed = [...expected]
      .filter((fieldId) => !selected.has(fieldId))
      .map((fieldId) => this.resultFor(artifact, fieldId, "VALID_CONCERN"));
    const falsePositives = [...selected]
      .filter((fieldId) => !expected.has(fieldId))
      .map((fieldId) => {
        const field = fieldById.get(fieldId);
        const uncertain = /review|verify|needs|privileged|admin|elevated|shared/i.test(`${field?.label ?? ""} ${field?.value ?? ""} ${field?.traceabilityRole ?? ""}`);
        return this.resultFor(artifact, fieldId, uncertain ? "NEEDS_CONTEXT" : "NOT_A_CONCERN");
      });

    return {
      identified,
      missed,
      needsContext: falsePositives.filter((finding) => finding.classification === "NEEDS_CONTEXT"),
      falsePositives: falsePositives.filter((finding) => finding.classification === "NOT_A_CONCERN")
    };
  }

  static repairedPreview(artifact: TrainingArtifact, selectedFieldIds: string[]) {
    const selected = new Set(selectedFieldIds);
    return artifact.fields
      .filter((field) => selected.has(field.id) || field.value.toLowerCase() !== "blank")
      .map((field) => `${field.label}: ${field.value.toLowerCase() === "blank" ? "[complete before approval]" : field.value}`);
  }

  private static resultFor(artifact: TrainingArtifact, fieldId: string, classification: ArtifactFindingResult["classification"]): ArtifactFindingResult {
    const field = artifact.fields.find((item) => item.id === fieldId);
    const issue = artifact.issues?.find((item) => item.fieldId === fieldId);
    const fallback = classification === "VALID_CONCERN"
      ? "This item can weaken traceability or reliability if it is not resolved."
      : classification === "NEEDS_CONTEXT"
        ? "This may be reasonable, but the learner should verify authorization, ownership, or current need before treating it as a confirmed issue."
        : "The available artifact does not show that this item is a problem by itself.";
    return {
      targetId: fieldId,
      label: field?.label ?? fieldId,
      classification,
      explanation: issue?.explanation ?? fallback
    };
  }
}
