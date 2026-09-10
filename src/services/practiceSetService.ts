import type { AppData } from "../data/schema";
import { SkillMasteryService } from "./appServices";

export interface PracticeSetItem {
  id: string;
  type: "PRACTICE" | "SCENARIO";
  title: string;
  href: string;
  reason: string;
}

export class PracticeSetService {
  static buildForCourse(data: AppData, userId: string, courseId: string, options?: { limit?: number }): PracticeSetItem[] {
    const courseSkillIds = new Set(data.courseSkills.filter((item) => item.courseId === courseId).map((item) => item.skillId));
    data.skills
      .filter((skill) => skill.relatedCourseIds?.includes(courseId))
      .forEach((skill) => courseSkillIds.add(skill.id));
    data.practiceActivities.filter((activity) => activity.relatedCourseIds.includes(courseId)).forEach((activity) => activity.skillIds.forEach((skillId) => courseSkillIds.add(skillId)));

    const mastery = SkillMasteryService.getSkillMastery(data, userId);
    const weakSkills = new Set(mastery.filter((item) => courseSkillIds.has(item.skillId) && item.state !== "STRONG").map((item) => item.skillId));
    const scored = [
      ...data.practiceActivities
        .filter((activity) => activity.status === "PUBLISHED" && (activity.relatedCourseIds.includes(courseId) || activity.skillIds.some((skillId) => courseSkillIds.has(skillId))))
        .map((activity) => ({
          id: activity.id,
          type: "PRACTICE" as const,
          title: activity.title,
          href: `/practice/${activity.id}`,
          reason: activity.skillIds.some((skillId) => weakSkills.has(skillId)) ? "Targets a developing course skill" : "Reinforces this course",
          score: activity.skillIds.some((skillId) => weakSkills.has(skillId)) ? 3 : 1
        })),
      ...data.scenarioDefinitions
        .filter((scenario) => scenario.relatedCourseIds.includes(courseId) || scenario.skillIds.some((skillId) => courseSkillIds.has(skillId)))
        .map((scenario) => ({
          id: scenario.id,
          type: "SCENARIO" as const,
          title: scenario.title,
          href: `/scenarios/${scenario.id}`,
          reason: scenario.skillIds.some((skillId) => weakSkills.has(skillId)) ? "Applies a developing skill in context" : "Applies course concepts",
          score: scenario.skillIds.some((skillId) => weakSkills.has(skillId)) ? 4 : 2
        }))
    ];
    return scored.sort((left, right) => right.score - left.score || left.title.localeCompare(right.title)).slice(0, options?.limit ?? 6).map(({ score: _score, ...item }) => item);
  }
}
