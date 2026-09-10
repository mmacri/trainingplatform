import type { AppData, LearningProgram, LearningProgramItem } from "../data/schema";

export interface ProgramItemProgress {
  item: LearningProgramItem;
  title: string;
  href: string;
  complete: boolean;
  required: boolean;
}

export interface ProgramProgress {
  program: LearningProgram;
  items: ProgramItemProgress[];
  requiredComplete: number;
  requiredTotal: number;
  percent: number;
  complete: boolean;
  capstoneAvailable: boolean;
}

export class ProgramService {
  static getProgramProgress(data: AppData, userId: string, programId: string): ProgramProgress | undefined {
    const program = data.learningPrograms.find((item) => item.id === programId);
    if (!program) return undefined;
    const items = program.stages.flatMap((stage) => stage.items).map((item) => this.itemProgress(data, userId, item));
    const requiredItems = items.filter((item) => item.required);
    const requiredComplete = requiredItems.filter((item) => item.complete).length;
    const requiredTotal = requiredItems.length;
    const capstonePrereqs = requiredItems.filter((item) => item.item.type !== "CAPSTONE");
    const capstoneAvailable = capstonePrereqs.every((item) => item.complete);
    return {
      program,
      items,
      requiredComplete,
      requiredTotal,
      percent: requiredTotal ? Math.round((requiredComplete / requiredTotal) * 100) : 0,
      complete: requiredTotal > 0 && requiredComplete === requiredTotal,
      capstoneAvailable
    };
  }

  static itemProgress(data: AppData, userId: string, item: LearningProgramItem): ProgramItemProgress {
    if (item.type === "COURSE") {
      const course = data.courses.find((candidate) => candidate.id === item.targetId);
      const enrollment = data.enrollments.find((candidate) => candidate.userId === userId && candidate.courseId === item.targetId);
      return { item, title: course?.title ?? item.targetId, href: `/courses/${item.targetId}`, complete: enrollment?.status === "COMPLETED", required: item.required };
    }
    if (item.type === "PRACTICE") {
      const practice = data.practiceActivities.find((candidate) => candidate.id === item.targetId);
      const complete = data.practiceAttempts.some((attempt) => attempt.userId === userId && attempt.practiceActivityId === item.targetId && attempt.completedAt);
      return { item, title: practice?.title ?? item.targetId, href: `/practice/${item.targetId}`, complete, required: item.required };
    }
    const scenario = data.scenarioDefinitions.find((candidate) => candidate.id === item.targetId);
    const complete = data.branchingScenarioAttempts.some((attempt) => attempt.userId === userId && attempt.scenarioId === item.targetId && attempt.completedAt);
    return { item, title: scenario?.title ?? item.targetId, href: `/scenarios/${item.targetId}`, complete, required: item.required };
  }
}
