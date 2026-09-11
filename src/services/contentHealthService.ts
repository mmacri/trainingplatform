import type { AppData } from "../data/schema";
import { buildCourseAnalysisContext } from "../domain/courseSelectors";

export interface ContentHealth {
  courseId: string;
  state: "Ready" | "Needs Attention" | "Blocking Issues";
  signals: string[];
}

export class ContentHealthService {
  static getCourseHealth(data: AppData, courseId: string): ContentHealth {
    const context = buildCourseAnalysisContext(data, courseId);
    const course = context?.course;
    const signals: string[] = [];
    const feedback = context?.feedback ?? [];
    const broken = feedback.filter((item) => item.feedbackType === "BROKEN_ACTIVITY" || item.issueType === "BROKEN");
    const mappings = context?.mappings ?? [];
    const reviews = data.standardChangeReviews.filter((review) => review.affectedCourseIds.includes(courseId) && review.status !== "COMPLETE");
    if (feedback.length) signals.push(`${feedback.length} learner feedback item${feedback.length === 1 ? "" : "s"}`);
    if (broken.length) signals.push(`${broken.length} broken activity report${broken.length === 1 ? "" : "s"}`);
    if (!mappings.length) signals.push("No standard mapping");
    if (reviews.length) signals.push("Standard change review pending");
    if (course?.nextContentReviewAt && new Date(course.nextContentReviewAt).getTime() < Date.now()) signals.push("Content review overdue");
    const state: ContentHealth["state"] = broken.length || !mappings.length ? "Blocking Issues" : signals.length ? "Needs Attention" : "Ready";
    return { courseId, state, signals };
  }
}
