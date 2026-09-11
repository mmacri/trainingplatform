import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Course } from "../../../data/schema";
import type { CourseReadiness } from "../../../services/appServices";
import { InstructionalQualityService } from "../../../services/instructionalQualityService";
import { useApp } from "../../appContext";

export function OverviewTab({ course, readiness }: { course: Course; readiness: CourseReadiness }) {
  const { data, service, refresh, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.shortDescription);
  const quality = InstructionalQualityService.analyzeCourse(data, course.id);
  const save = async () => {
    await service().updateCourse(course.id, { title, shortDescription: description });
    await refresh();
    setEditing(false);
    toast("Course saved");
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Panel>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Overview</h2><button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => editing ? save() : setEditing(true)}>{editing ? "Save" : "Edit"}</button></div>
        {editing ? (
          <div className="mt-4 space-y-3">
            <input className="h-11 w-full rounded-md border border-border bg-transparent px-3" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea className="min-h-28 w-full rounded-md border border-border bg-transparent px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Description" value={course.shortDescription} wide />
            <Info label="Category" value={course.category} />
            <Info label="Difficulty" value={course.difficulty} />
            <Info label="Duration" value={`${course.estimatedMinutes} minutes`} />
            <Info label="Owner" value={ownerName(data, course)} />
            <Info label="Course icon" value={course.icon} />
            <Info label="Cover" value={course.coverVisual ?? "NERC CIP abstract shield"} />
          </div>
        )}
        <div className="mt-6">
          <h3 className="font-medium">Status timeline</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {["Draft", "Review", "Approved", "Published"].map((item) => <div key={item} className="rounded-md border border-border p-3 text-sm"><CheckCircle2 className="mb-2 text-cyan-700" size={18} />{item}</div>)}
          </div>
        </div>
      </Panel>
      <Panel>
        <h2 className="font-semibold">Readiness Score</h2>
        <p className="mt-2 text-4xl font-semibold">{readiness.percentage}% <span className="text-base text-muted-foreground">Ready</span></p>
        <div className="mt-4 space-y-2">
          {readiness.checks.map((check) => (
            <div key={`${check.category}-${check.label}`} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
              {check.severity === "READY" ? <CheckCircle2 className="mt-0.5 text-emerald-600" size={16} /> : <AlertTriangle className={`mt-0.5 ${check.severity === "BLOCKING" ? "text-red-600" : "text-amber-600"}`} size={16} />}
              <div><p className="font-medium">{check.label}</p><p className="text-xs text-muted-foreground">{check.message}</p></div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Learning Experience Quality</h2>
            <p className="text-sm text-muted-foreground">Instructional checks for structure, visuals, learner actions, feedback, reinforcement, and reusable references.</p>
          </div>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${quality.findings.some((finding) => finding.severity === "BLOCKING") ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" : quality.findings.some((finding) => finding.severity === "WARNING") ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"}`}>{quality.findings.some((finding) => finding.severity === "BLOCKING") ? "Blocking Issues" : quality.findings.some((finding) => finding.severity === "WARNING") ? "Needs Attention" : "Ready"}</span>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          {[
            ["Structure", quality.structure],
            ["Visual Learning", quality.visualLearning],
            ["Interactivity", quality.interactivity],
            ["Applied Practice", quality.appliedPractice],
            ["Feedback", quality.feedback],
            ["Reinforcement", quality.reinforcement],
            ["Reference Value", quality.referenceValue]
          ].map(([label, state]) => <div key={label} className="rounded-md border border-border p-2 text-sm"><p className="font-medium">{label}</p><p className={state === "STRONG" ? "text-emerald-700" : "text-amber-700"}>{String(state).replaceAll("_", " ")}</p></div>)}
        </div>
        <div className="mt-4 space-y-2">
          {quality.findings.slice(0, 6).map((finding) => <div key={finding.id} className="rounded-md border border-border p-3 text-sm"><div className="flex items-center gap-2"><AlertTriangle size={15} className={finding.severity === "BLOCKING" ? "text-red-600" : finding.severity === "WARNING" ? "text-amber-600" : "text-cyan-700"} /><span className="font-medium">{finding.category}</span><span className="text-xs text-muted-foreground">{finding.severity}</span></div><p className="mt-1 text-muted-foreground">{finding.message}</p><p className="mt-1 text-xs text-muted-foreground">Suggested: {finding.recommendation}</p></div>)}
          {!quality.findings.length ? <p className="text-sm text-muted-foreground">No instructional quality findings.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function ownerName(data: ReturnType<typeof useApp>["data"], course: Course) {
  return data.users.find((user) => user.id === course.ownerId)?.name ?? "Unassigned";
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-border bg-white p-4 shadow-soft dark:bg-slate-950 ${className}`}>{children}</section>;
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "md:col-span-2" : ""}><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}
