import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { ReleaseState } from "../../../domain/quality";
import { CourseQualityService } from "../../../services/courseQualityService";
import { useApp } from "../../appContext";

export function CourseQualityDashboard() {
  const { data } = useApp();
  const rows = data.courses
    .filter((course) => course.status !== "ARCHIVED" && course.showInCatalog)
    .map((course) => ({
      course,
      quality: CourseQualityService.analyzeCourse(data, course.id)
    }));

  return (
    <>
      <PageHeader
        title="Course Quality"
        subtitle="Release readiness for published learner-facing courses using validation, instructional, depth, health, completion, reference, accessibility, responsive, and automated-test signals."
      />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                {["Course", "Content", "Interactions", "Scenario", "Assessment", "Completion", "Reference", "A11y", "Responsive", "Tests", "Overall"].map((header) => (
                  <th key={header} className="px-3 py-2 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ course, quality }) => (
                <tr key={course.id} className="border-b border-border align-top">
                  <td className="px-3 py-3">
                    <Link className="font-medium text-cyan-700" to={`/build/courses/${course.id}`}>{course.shortTitle ?? course.title}</Link>
                    {quality.findings.length ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">Findings ({quality.findings.length})</summary>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {quality.findings.slice(0, 18).map((finding) => (
                            <li key={`${finding.source}-${finding.id}`}>{finding.category}: {finding.message}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.content} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.interactions} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.scenario} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.assessment} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.completion} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.reference} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.accessibility} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.responsive} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.statuses.automatedTest} /></td>
                  <td className="px-3 py-3"><QualityBadge status={quality.releaseState} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-md border border-border bg-white p-5 shadow-soft dark:bg-slate-950">{children}</section>;
}

function QualityBadge({ status }: { status: ReleaseState }) {
  const className = status === "READY"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
    : status === "BLOCKED"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}
