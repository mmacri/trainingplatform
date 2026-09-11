export type QualitySeverity = "PASS" | "INFO" | "WARNING" | "BLOCKING";

export type ReleaseState = "READY" | "REVIEW" | "BLOCKED";

export interface QualityFinding {
  id: string;
  source: "VALIDATION" | "INSTRUCTIONAL" | "DEPTH" | "HEALTH";
  severity: QualitySeverity;
  category: string;
  message: string;
  targetType?: string;
  targetId?: string;
  recommendation?: string;
}

export interface QualityDimension {
  state: ReleaseState;
  findings: QualityFinding[];
}
