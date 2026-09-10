import type { AppData } from "../data/schema";

export interface MicroLearningRouteItem {
  type: "CONCEPT" | "VISUAL" | "EXAMPLE" | "PRACTICE" | "SCENARIO" | "REFERENCE";
  title: string;
  href: string;
  minutes: number;
}

export class MicroLearningRouteService {
  static buildTopicRoute(data: AppData, userId: string, topicOrSkillId: string, targetMinutes = 5): MicroLearningRouteItem[] {
    const skill = data.skills.find((item) => item.id === topicOrSkillId || item.name.toLowerCase() === topicOrSkillId.toLowerCase());
    const skillId = skill?.id ?? topicOrSkillId;
    const course = data.courses.find((item) => data.courseSkills.some((courseSkill) => courseSkill.courseId === item.id && courseSkill.skillId === skillId) || item.title.toLowerCase().includes((skill?.name ?? topicOrSkillId).toLowerCase().split(" ")[0]));
    const diagram = data.learningDiagrams.find((item) => item.title.toLowerCase().includes((skill?.name ?? topicOrSkillId).toLowerCase().split(" ")[0]) || (course ? item.relatedCourseIds.includes(course.id) : false));
    const practice = data.practiceActivities.find((item) => item.status === "PUBLISHED" && item.skillIds.includes(skillId));
    const scenario = data.scenarioDefinitions.find((item) => item.skillIds.includes(skillId));
    const resource = data.learningResources.find((item) => item.relatedSkillIds.includes(skillId));
    const route: MicroLearningRouteItem[] = [];
    if (course) route.push({ type: "CONCEPT", title: `${skill?.name ?? course.shortTitle ?? course.title} concept`, href: `/courses/${course.id}`, minutes: 1 });
    if (diagram) route.push({ type: "VISUAL", title: diagram.title, href: "/environment", minutes: 1 });
    if (resource) route.push({ type: "REFERENCE", title: resource.title, href: `/resources/${resource.id}`, minutes: 1 });
    if (practice) route.push({ type: "PRACTICE", title: practice.title, href: `/practice/${practice.id}`, minutes: Math.min(5, practice.estimatedMinutes) });
    if (targetMinutes >= 10 && scenario) route.push({ type: "SCENARIO", title: scenario.title, href: `/scenarios/${scenario.id}`, minutes: Math.min(10, scenario.estimatedMinutes) });
    return route.slice(0, Math.max(1, targetMinutes >= 10 ? 5 : 4));
  }
}
