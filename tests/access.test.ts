import { describe, expect, it } from "vitest";
import { createCurrentSeedData as createSeedData } from "../src/data/current-seed/createCurrentSeed";
import { canAccessCourse, getRoles, searchAuthorized } from "../src/services/appServices";

describe("course access model", () => {
  it("hides private courses from learners and denies direct access", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const privateCourse = data.courses.find((course) => course.title === "Internal Procedure Authoring & Change Training")!;

    const access = canAccessCourse(data, learner.id, privateCourse.id);

    expect(access.allowed).toBe(false);
    expect(access.discoverable).toBe(false);
  });

  it("allows group grants and assignment-only courses", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const cip004 = data.courses.find((course) => course.id === "course-cip004-annual-refresher")!;
    const auditWorkshop = data.courses.find((course) => course.title === "NERC CIP Audit Preparation Workshop")!;

    expect(canAccessCourse(data, learner.id, cip004.id).allowed).toBe(true);
    expect(canAccessCourse(data, learner.id, auditWorkshop.id).allowed).toBe(true);
  });

  it("limits search to authorized or requestable records", () => {
    const data = createSeedData();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;

    const results = searchAuthorized(data, learner.id, "Internal Procedure");

    expect(results.some((result) => result.title.includes("Internal Procedure"))).toBe(false);
    expect(getRoles(data, learner.id)).toEqual(["LEARNER"]);
  });
});
