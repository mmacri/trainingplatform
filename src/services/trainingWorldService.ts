import type { AppData, Course, TrainingArtifact, TrainingPerson, TrainingSystem, TrainingVendor, TrainingWorld } from "../data/schema";

export type TrainingWorldEntity =
  | { kind: "person"; item: TrainingPerson }
  | { kind: "system"; item: TrainingSystem }
  | { kind: "facility"; item: TrainingWorld["facilities"][number] }
  | { kind: "vendor"; item: TrainingVendor };

export class TrainingWorldService {
  static primaryWorld(data: AppData) {
    return data.trainingWorlds.find((world) => world.id === "world-north-valley-energy") ?? data.trainingWorlds[0];
  }

  static courseWorld(data: AppData, course: Course) {
    const worldId = course.storyArc?.worldId;
    return data.trainingWorlds.find((world) => world.id === worldId) ?? this.primaryWorld(data);
  }

  static courseEntities(data: AppData, course: Course): TrainingWorldEntity[] {
    const world = this.courseWorld(data, course);
    if (!world) return [];
    const arc = course.storyArc;
    if (!arc) {
      return [
        ...world.systems.filter((system) => system.relatedCourseIds.includes(course.id)).map((item) => ({ kind: "system" as const, item })),
        ...world.people.filter((person) => person.trainingUseCases.some((useCase) => course.title.toLowerCase().includes(useCase.split(" ")[0].toLowerCase()))).map((item) => ({ kind: "person" as const, item })),
        ...world.vendors.filter((vendor) => vendor.relatedCourseIds.includes(course.id)).map((item) => ({ kind: "vendor" as const, item })),
        ...world.facilities.filter((facility) => facility.relatedCourseIds.includes(course.id)).map((item) => ({ kind: "facility" as const, item }))
      ];
    }
    return [
      ...world.people.filter((item) => arc.recurringPersonIds.includes(item.id)).map((item) => ({ kind: "person" as const, item })),
      ...world.systems.filter((item) => arc.recurringSystemIds.includes(item.id)).map((item) => ({ kind: "system" as const, item })),
      ...world.facilities.filter((item) => arc.recurringFacilityIds.includes(item.id)).map((item) => ({ kind: "facility" as const, item })),
      ...world.vendors.filter((item) => arc.recurringVendorIds.includes(item.id)).map((item) => ({ kind: "vendor" as const, item }))
    ];
  }

  static entityById(data: AppData, entityId: string): TrainingWorldEntity | undefined {
    for (const world of data.trainingWorlds) {
      const person = world.people.find((item) => item.id === entityId);
      if (person) return { kind: "person", item: person };
      const system = world.systems.find((item) => item.id === entityId);
      if (system) return { kind: "system", item: system };
      const facility = world.facilities.find((item) => item.id === entityId);
      if (facility) return { kind: "facility", item: facility };
      const vendor = world.vendors.find((item) => item.id === entityId);
      if (vendor) return { kind: "vendor", item: vendor };
    }
    return undefined;
  }

  static artifactsForCourse(data: AppData, courseId: string): TrainingArtifact[] {
    return data.trainingArtifacts.filter((artifact) => artifact.relatedCourseIds.includes(courseId));
  }
}
