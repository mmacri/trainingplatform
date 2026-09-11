import { describe, expect, it } from "vitest";
import type { AppData, TableName } from "../src/data/schema";
import { tableNames } from "../src/data/schema";
import { createCurrentSeedData } from "../src/data/current-seed/createCurrentSeed";
import { migrateDatabase } from "../src/data/migrations/migrate";

describe("current seed and migration boundaries", () => {
  it("creates current demo data without duplicate primary ids", () => {
    const data = createCurrentSeedData();

    for (const table of tableNames) {
      const records = data[table as TableName] as Array<{ id: string }>;
      const ids = records.map((record) => record.id);
      expect(new Set(ids).size, table).toBe(ids.length);
    }
  });

  it("preserves protected CIP-004 identity and learner history during migration", () => {
    const data = createCurrentSeedData();
    const protectedCourse = data.courses.find((course) => course.id === "course-cip004-annual-refresher")!;
    const lessonIds = data.lessons.filter((lesson) => lesson.courseVersionId === protectedCourse.currentVersionId).map((lesson) => lesson.id).sort();
    const learner = data.users.find((user) => user.email === "learner@gridguard.local")!;
    const progressBefore = data.courseProgress.filter((progress) => progress.userId === learner.id).map((progress) => progress.id).sort();
    const certsBefore = data.userCertifications.filter((cert) => cert.userId === learner.id).map((cert) => cert.id).sort();
    const setting = data.applicationSettings.find((item) => item.key === "learningExperienceVersion")!;
    setting.value = 5;

    const migrated = migrateDatabase(data);

    const migratedCourse = migrated.courses.find((course) => course.id === "course-cip004-annual-refresher")!;
    expect(migratedCourse.id).toBe(protectedCourse.id);
    expect(migrated.lessons.filter((lesson) => lesson.courseVersionId === migratedCourse.currentVersionId).map((lesson) => lesson.id).sort()).toEqual(lessonIds);
    expect(migrated.courseProgress.filter((progress) => progress.userId === learner.id).map((progress) => progress.id).sort()).toEqual(progressBefore);
    expect(migrated.userCertifications.filter((cert) => cert.userId === learner.id).map((cert) => cert.id).sort()).toEqual(certsBefore);
    expect(migrated.applicationSettings.find((item) => item.key === "learningExperienceVersion")?.value).toBe(6);
  });

  it("returns current data unchanged when no migration is required", () => {
    const data: AppData = createCurrentSeedData();
    expect(migrateDatabase(data)).toBe(data);
  });
});
