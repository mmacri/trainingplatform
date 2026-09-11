export const DEMO_PASSWORD = "GridGuard-Local-2026!";

export type TestPersona = "learner" | "manager" | "author" | "compliance" | "admin";

export const personaEmails: Record<TestPersona, string> = {
  learner: "learner@gridguard.local",
  manager: "manager@gridguard.local",
  author: "author@gridguard.local",
  compliance: "compliance@gridguard.local",
  admin: "admin@gridguard.local"
};
