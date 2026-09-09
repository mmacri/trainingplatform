import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  FileQuestion,
  Flag,
  GripVertical,
  History,
  LayoutList,
  ListChecks,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X
} from "lucide-react";
import { addDays, format, formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AppData, ContentBlock, Course, CourseAccessGrant, CourseStatus, Lesson, Module, QuestionType, Review } from "../../data/schema";
import {
  calculateCourseReadiness,
  canAccessCourse,
  canEditCourse,
  canManageCourses,
  canPublishCourse,
  canReviewCourse,
  hasAnyRole
} from "../../services/appServices";
import { useApp } from "../appContext";

const statusLabels: Record<CourseStatus, string> = {
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for Review",
  IN_REVIEW: "In Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived"
};

const accentChoices = ["#0e7490", "#2563eb", "#047857", "#b45309", "#7c3aed", "#334155"];
const iconChoices = ["ShieldCheck", "BookOpen", "ClipboardCheck", "ListChecks", "FileQuestion", "UsersRound"];
const coverChoices = ["NERC CIP abstract shield", "Control center", "Cybersecurity network", "Physical security facility", "No cover image"];
const statuses: Array<"ALL" | CourseStatus> = ["ALL", "DRAFT", "READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
const tabs = ["overview", "curriculum", "assessment", "compliance", "audience", "completion", "review", "assignments", "analytics", "activity"];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-border bg-white p-4 shadow-soft dark:bg-slate-950 ${className}`}>{children}</section>;
}

function StatusBadge({ status }: { status: CourseStatus }) {
  const tone =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
      : status === "APPROVED"
        ? "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-200"
        : status === "CHANGES_REQUESTED"
          ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-200"
          : status === "IN_REVIEW" || status === "READY_FOR_REVIEW"
            ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200"
            : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200";
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ${tone}`}>{statusLabels[status]}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-2 rounded-full bg-cyan-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-2">
          {item.href ? <Link className="hover:text-foreground" to={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          {index < items.length - 1 ? <span>/</span> : null}
        </span>
      ))}
    </nav>
  );
}

function InlineAlert({ tone = "info", children }: { tone?: "info" | "warning" | "danger" | "success"; children: React.ReactNode }) {
  const klass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
          : "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-100";
  return <div className={`rounded-md border p-3 text-sm ${klass}`}>{children}</div>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-8 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function completionRate(data: AppData, courseIds: string[]) {
  const enrollments = data.enrollments.filter((item) => courseIds.includes(item.courseId));
  if (!enrollments.length) return 0;
  return Math.round((enrollments.filter((item) => item.status === "COMPLETED").length / enrollments.length) * 100);
}

function managedCourses(data: AppData, userId: string) {
  if (hasAnyRole(data, userId, ["PLATFORM_ADMIN", "LEARNING_ADMIN"])) return data.courses;
  return data.courses.filter(
    (course) =>
      course.ownerId === userId ||
      data.courseOwners.some((owner) => owner.courseId === course.id && owner.userId === userId) ||
      data.courseContributors.some((contributor) => contributor.courseId === course.id && contributor.userId === userId)
  );
}

function standardLabel(data: AppData, courseId: string) {
  const mapping = data.courseStandardMappings.find((item) => item.courseId === courseId);
  const standardVersion = data.standardVersions.find((item) => item.id === mapping?.standardVersionId);
  const standard = data.standards.find((item) => item.id === standardVersion?.standardId);
  return standard ? standard.number : "Unmapped";
}

function ownerName(data: AppData, course: Course) {
  return data.users.find((item) => item.id === course.ownerId)?.name ?? "Unassigned";
}

export function CourseManagementDashboard() {
  const { data, user, toast, service, refresh } = useApp();
  const navigate = useNavigate();
  const importInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState(localStorage.getItem("gridguard.courseView") || (window.innerWidth < 900 ? "cards" : "table"));
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | CourseStatus>("ALL");
  const [standard, setStandard] = useState("ALL");
  const [owner, setOwner] = useState("ALL");
  const [sort, setSort] = useState("updated");

  const courses = useMemo(() => managedCourses(data, user.id), [data, user.id]);
  const courseIds = courses.map((course) => course.id);
  const learners = new Set(data.enrollments.filter((item) => courseIds.includes(item.courseId)).map((item) => item.userId));
  const readyIssues = courses.map((course) => ({ course, readiness: calculateCourseReadiness(data, course.id) }));
  const needsAttention = readyIssues
    .flatMap(({ course, readiness }) => {
      const latestReview = latestReviewForCourse(data, course.id);
      const comments = latestReview ? data.reviewComments.filter((comment) => comment.reviewId === latestReview.id && comment.status === "OPEN") : [];
      const overdue = data.enrollments.filter((enrollment) => enrollment.courseId === course.id && enrollment.status === "OVERDUE").length;
      return [
        comments.length ? { course, reason: `${comments.length} unresolved reviewer comment${comments.length === 1 ? "" : "s"}.`, tone: "warning" as const, when: "Open review" } : undefined,
        course.status === "APPROVED" ? { course, reason: "Approved and ready to publish.", tone: "success" as const, when: "Ready now" } : undefined,
        overdue ? { course, reason: `${overdue} learner${overdue === 1 ? "" : "s"} overdue.`, tone: "danger" as const, when: "Overdue" } : undefined,
        readiness.blockingIssues.length && course.status !== "PUBLISHED" ? { course, reason: readiness.blockingIssues[0].message, tone: "warning" as const, when: `${readiness.percentage}% ready` } : undefined
      ].filter(Boolean);
    })
    .slice(0, 5) as Array<{ course: Course; reason: string; tone: "warning" | "success" | "danger"; when: string }>;

  const standards = ["ALL", ...new Set(courses.map((course) => standardLabel(data, course.id)))];
  const owners = ["ALL", ...new Set(courses.map((course) => ownerName(data, course)))];
  const filtered = courses
    .filter((course) => status === "ALL" || course.status === status)
    .filter((course) => standard === "ALL" || standardLabel(data, course.id) === standard)
    .filter((course) => owner === "ALL" || ownerName(data, course) === owner)
    .filter((course) => `${course.title} ${course.shortDescription}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => {
      if (sort === "az") return left.title.localeCompare(right.title);
      if (sort === "za") return right.title.localeCompare(left.title);
      if (sort === "newest") return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (sort === "oldest") return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (sort === "enrollment") return data.enrollments.filter((item) => item.courseId === right.id).length - data.enrollments.filter((item) => item.courseId === left.id).length;
      if (sort === "completion") return completionRate(data, [left.id]) - completionRate(data, [right.id]);
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  const kpis = [
    { label: "Drafts", value: courses.filter((course) => course.status === "DRAFT").length, filter: "DRAFT" as const },
    { label: "In Review", value: courses.filter((course) => ["READY_FOR_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(course.status)).length, filter: "IN_REVIEW" as const },
    { label: "Published", value: courses.filter((course) => course.status === "PUBLISHED").length, filter: "PUBLISHED" as const },
    { label: "Assigned Learners", value: learners.size, filter: "ALL" as const },
    { label: "Completion Rate", value: `${completionRate(data, courseIds)}%`, filter: "PUBLISHED" as const },
    { label: "Needs Attention", value: needsAttention.length, filter: "CHANGES_REQUESTED" as const }
  ];

  const duplicate = async (course: Course) => {
    const copy = await service().duplicateCourse(course.id);
    await refresh();
    toast("Course duplicated");
    navigate(`/build/courses/${copy.id}`);
  };

  const archive = async (course: Course) => {
    const reason = window.prompt("Archive reason", "Lifecycle cleanup");
    if (!reason) return;
    await service().archiveCourse(course.id, reason);
    await refresh();
    toast("Course archived");
  };

  const restore = async (course: Course) => {
    await service().restoreCourse(course.id);
    await refresh();
    toast("Course restored");
  };

  const exportCatalog = () => {
    const rows = ["Title,Status,Standard,Owner,Learners,Completion"];
    courses.forEach((course) => {
      rows.push(
        [
          csvCell(course.title),
          csvCell(statusLabels[course.status]),
          csvCell(standardLabel(data, course.id)),
          csvCell(ownerName(data, course)),
          data.enrollments.filter((item) => item.courseId === course.id).length,
          `${completionRate(data, [course.id])}%`
        ].join(",")
      );
    });
    downloadBlob("gridguard-course-catalog.csv", rows.join("\n"), "text/csv");
    toast("Course catalog exported");
  };

  const importCourse = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as {
        course?: Course;
        modules?: Module[];
        lessons?: Lesson[];
      };
      if (!parsed.course?.title) throw new Error("Invalid course package.");
      const moduleInputs = (parsed.modules ?? [])
        .sort((left, right) => left.position - right.position)
        .map((module) => ({
          title: module.title,
          lessons: (parsed.lessons ?? [])
            .filter((lesson) => lesson.moduleId === module.id)
            .sort((left, right) => left.position - right.position)
            .map((lesson) => lesson.title)
        }));
      const imported = await service().createCourseDraft({
        title: `${parsed.course.title} Import`,
        description: parsed.course.shortDescription || "Imported course package.",
        category: parsed.course.category || "NERC CIP",
        difficulty: parsed.course.difficulty || "Foundational",
        estimatedMinutes: parsed.course.estimatedMinutes || 45,
        icon: parsed.course.icon || "ShieldCheck",
        accent: parsed.course.accent || "#0e7490",
        coverVisual: parsed.course.coverVisual,
        accessMode: "PRIVATE",
        showInCatalog: false,
        allowSelfEnrollment: false,
        allowAccessRequests: false,
        requireManagerApproval: false,
        standardVersionIds: data.standardVersions[0] ? [data.standardVersions[0].id] : [],
        objectives: ["Review imported course structure and update compliance mapping."],
        skillIds: [],
        completionEvidence: ["Course completion"],
        audienceGrants: [],
        modules: moduleInputs.length ? moduleInputs : [{ title: "Imported Module", lessons: ["Imported Lesson"] }],
        completion: {
          requireAllLessons: true,
          requireFinalAssessment: false,
          requireScenarios: false,
          requireAcknowledgement: false,
          requireManagerValidation: false,
          finalAssessmentEnabled: false,
          passingScore: 80,
          attemptsAllowed: 3,
          failedAttemptBehavior: "RETRY_IMMEDIATELY",
          randomizeQuestions: false,
          randomizeAnswers: false,
          showAnswersAfterAttempt: true,
          certificateEnabled: false,
          certificateName: "NERC CIP Training Completion"
        }
      });
      await refresh();
      toast("Course package imported");
      navigate(`/build/courses/${imported.id}`);
    } catch {
      toast("This course package could not be read");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Home", href: "/home" }, { label: "Course Management" }]} />
          <h1 className="text-2xl font-semibold">Course Management</h1>
          <p className="text-sm text-muted-foreground">Create, review, publish, assign, and monitor training from one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importCourse(event.target.files?.[0])} />
          <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => importInput.current?.click()}>Import Course</button>
          <div className="relative">
          <button className="rounded-md border border-border p-2" aria-label="Course management menu" onClick={() => setOverflowOpen((open) => !open)}>
            <MoreHorizontal size={18} />
          </button>
          {overflowOpen ? (
            <div className="absolute right-0 top-11 z-30 w-56 rounded-md border border-border bg-white p-2 shadow-soft dark:bg-slate-950">
              <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOverflowOpen(false); importInput.current?.click(); }}>Import course package</button>
              <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOverflowOpen(false); exportCatalog(); }}>Export course catalog</button>
              <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOverflowOpen(false); navigate("/build/questions"); }}>Manage question bank</button>
              <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOverflowOpen(false); setStatus("ARCHIVED"); }}>View archived courses</button>
            </div>
          ) : null}
          </div>
          <Link className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-800" to="/build/new">
            <Plus size={16} /> Create Course
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <button key={kpi.label} className="rounded-md border border-border bg-white p-4 text-left shadow-soft transition hover:border-cyan-500 dark:bg-slate-950" onClick={() => setStatus(kpi.filter)}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          </button>
        ))}
      </div>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Needs Your Attention</h2>
            <p className="text-sm text-muted-foreground">Actionable lifecycle work for managed courses.</p>
          </div>
        </div>
        {needsAttention.length ? (
          <div className="space-y-2">
            {needsAttention.map((item) => (
              <div key={`${item.course.id}-${item.reason}`} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                {item.tone === "success" ? <CheckCircle2 className="text-emerald-600" /> : <AlertTriangle className={item.tone === "danger" ? "text-red-600" : "text-amber-600"} />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.course.title}</p>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
                <span className="text-sm text-muted-foreground">{item.when}</span>
                <Link className="rounded-md border border-border px-3 py-1.5 text-sm" to={`/build/courses/${item.course.id}`}>Open</Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="You're caught up" body="No course-management actions currently require your attention." />
        )}
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Managed Courses</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex rounded-md border border-border p-1">
            {["cards", "table"].map((mode) => (
              <button
                key={mode}
                className={`rounded px-3 py-1 text-sm ${view === mode ? "bg-cyan-700 text-white" : "text-muted-foreground"}`}
                onClick={() => {
                  setView(mode);
                  localStorage.setItem("gridguard.courseView", mode);
                }}
              >
                {mode === "cards" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 lg:grid-cols-[1.2fr_repeat(4,minmax(0,0.8fr))_auto]">
          <input className="h-10 rounded-md border border-border bg-transparent px-3 text-sm" placeholder="Search managed courses" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="h-10 rounded-md border border-border bg-transparent px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : statusLabels[item]}</option>)}
          </select>
          <select className="h-10 rounded-md border border-border bg-transparent px-3 text-sm" value={standard} onChange={(event) => setStandard(event.target.value)}>
            {standards.map((item) => <option key={item} value={item}>{item === "ALL" ? "All standards" : item}</option>)}
          </select>
          <select className="h-10 rounded-md border border-border bg-transparent px-3 text-sm" value={owner} onChange={(event) => setOwner(event.target.value)}>
            {owners.map((item) => <option key={item} value={item}>{item === "ALL" ? "All owners" : item}</option>)}
          </select>
          <select className="h-10 rounded-md border border-border bg-transparent px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">Recently Updated</option>
            <option value="az">Title A-Z</option>
            <option value="za">Title Z-A</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="enrollment">Highest Enrollment</option>
            <option value="completion">Lowest Completion</option>
          </select>
          <button className="h-10 rounded-md border border-border px-3 text-sm" onClick={() => { setQuery(""); setStatus("ALL"); setStandard("ALL"); setOwner("ALL"); setSort("updated"); }}>Clear filters</button>
        </div>

        {view === "cards" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} data={data} onDuplicate={() => duplicate(course)} onArchive={() => course.status === "ARCHIVED" ? restore(course) : archive(course)} />
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr><th className="py-3">Course</th><th>Status</th><th>Standard</th><th>Version</th><th>Owner</th><th>Learners</th><th>Completion</th><th>Updated</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((course) => {
                  const learnersForCourse = data.enrollments.filter((item) => item.courseId === course.id);
                  const version = data.courseVersions.find((item) => item.id === course.currentVersionId);
                  return (
                    <tr key={course.id} className="border-b border-border align-top">
                      <td className="py-3">
                        <Link className="font-medium hover:text-cyan-700" to={`/build/courses/${course.id}`}>{course.title}</Link>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground">{course.shortDescription}</p>
                      </td>
                      <td className="py-3"><StatusBadge status={course.status} /></td>
                      <td className="py-3">{standardLabel(data, course.id)}</td>
                      <td className="py-3">{version?.version ?? "1.0"}</td>
                      <td className="py-3">{ownerName(data, course)}</td>
                      <td className="py-3">{learnersForCourse.length}</td>
                      <td className="py-3 min-w-40"><ProgressBar value={completionRate(data, [course.id])} /></td>
                      <td className="py-3">{formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}</td>
                      <td className="py-3">
                        <select className="rounded-md border border-border bg-transparent px-2 py-1 text-xs" defaultValue="" onChange={async (event) => {
                          const action = event.target.value;
                          event.currentTarget.value = "";
                          if (action === "edit") navigate(`/build/courses/${course.id}`);
                          if (action === "preview") navigate(`/courses/${course.id}`);
                          if (action === "duplicate") await duplicate(course);
                          if (action === "version") { await service().createCourseVersion(course.id, "MINOR", "Course Manager draft update."); await refresh(); toast("New version created"); }
                          if (action === "assign") navigate(`/build/courses/${course.id}/assign`);
                          if (action === "analytics") navigate(`/build/courses/${course.id}?tab=analytics`);
                          if (action === "activity") navigate(`/build/courses/${course.id}?tab=activity`);
                          if (action === "archive") await archive(course);
                          if (action === "restore") await restore(course);
                        }}>
                          <option value="" disabled>•••</option>
                          <option value="edit">Edit Course</option>
                          <option value="preview">Preview</option>
                          <option value="duplicate">Duplicate</option>
                          <option value="version">Create New Version</option>
                          <option value="assign">Assignments</option>
                          <option value="analytics">Analytics</option>
                          <option value="activity">Activity History</option>
                          {course.status === "ARCHIVED" ? <option value="restore">Restore Course</option> : <option value="archive">Archive</option>}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!filtered.length ? <EmptyState title="Create your first course" body="Build structured training, assessments, compliance mappings, and assignments from one workspace." action={<Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" to="/build/new">Create Course</Link>} /> : null}
      </Panel>
    </div>
  );
}

function CourseCard({ course, data, onDuplicate, onArchive }: { course: Course; data: AppData; onDuplicate: () => void; onArchive: () => void }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <StatusBadge status={course.status} />
          <Link className="mt-3 block font-semibold hover:text-cyan-700" to={`/build/courses/${course.id}`}>{course.title}</Link>
        </div>
        <MoreHorizontal size={18} className="text-muted-foreground" />
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{course.shortDescription}</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>{standardLabel(data, course.id)}</span>
        <span>{ownerName(data, course)}</span>
        <span>{data.enrollments.filter((item) => item.courseId === course.id).length} learners</span>
        <span>{formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })}</span>
      </div>
      <div className="mt-3"><ProgressBar value={completionRate(data, [course.id])} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm text-white" to={`/build/courses/${course.id}`}>Open</Link>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onDuplicate}>Duplicate</button>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onArchive}>{course.status === "ARCHIVED" ? "Restore" : "Archive"}</button>
      </div>
    </div>
  );
}

type WizardState = {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  icon: string;
  accent: string;
  coverVisual: string;
  standardVersionIds: string[];
  mappings: Array<{ standardVersionId: string; requirementText: string; trainingRelevance: string; evidenceExpectation: string; internalNotes: string }>;
  objectives: string[];
  skillIds: string[];
  completionEvidence: string[];
  accessMode: Course["accessMode"];
  showInCatalog: boolean;
  allowSelfEnrollment: boolean;
  allowAccessRequests: boolean;
  requireManagerApproval: boolean;
  grants: Array<{ grantType: CourseAccessGrant["grantType"]; grantId: string; label: string }>;
  modules: Array<{ title: string; lessons: string[] }>;
  requireAllLessons: boolean;
  requireFinalAssessment: boolean;
  requireScenarios: boolean;
  requireAcknowledgement: boolean;
  requireManagerValidation: boolean;
  finalAssessmentEnabled: boolean;
  passingScore: number;
  attemptsAllowed: number;
  failedAttemptBehavior: Course["failedAttemptBehavior"];
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showAnswersAfterAttempt: boolean;
  certificateEnabled: boolean;
  certificateName: string;
  certificateExpirationMonths?: number;
  completionDeadlineDays?: number;
};

export function CourseCreationWizard() {
  const { data, service, refresh, toast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>();
  const defaultStandard = data.standardVersions.find((version) => data.standards.find((standard) => standard.id === version.standardId)?.number === "CIP-004");
  const [form, setForm] = useState<WizardState>({
    title: "NERC CIP Evidence Management Essentials",
    description: "",
    category: "NERC CIP",
    difficulty: "Foundational",
    estimatedMinutes: 60,
    icon: "ShieldCheck",
    accent: accentChoices[0],
    coverVisual: coverChoices[0],
    standardVersionIds: defaultStandard ? [defaultStandard.id] : [],
    mappings: [],
    objectives: ["Explain personnel training responsibilities before granting access.", "Identify evidence needed for repeatable CIP readiness."],
    skillIds: [],
    completionEvidence: ["Course completion", "Assessment score", "Certificate"],
    accessMode: "RESTRICTED",
    showInCatalog: true,
    allowSelfEnrollment: false,
    allowAccessRequests: true,
    requireManagerApproval: false,
    grants: [],
    modules: generateOutline("Standard Course"),
    requireAllLessons: true,
    requireFinalAssessment: true,
    requireScenarios: false,
    requireAcknowledgement: true,
    requireManagerValidation: false,
    finalAssessmentEnabled: true,
    passingScore: 80,
    attemptsAllowed: 3,
    failedAttemptBehavior: "RETRY_IMMEDIATELY",
    randomizeQuestions: false,
    randomizeAnswers: true,
    showAnswersAfterAttempt: true,
    certificateEnabled: true,
    certificateName: "NERC CIP Training Completion",
    certificateExpirationMonths: 12,
    completionDeadlineDays: 30
  });
  const validBasics = form.title.trim().length > 4 && form.description.trim().length > 10 && form.estimatedMinutes > 0;
  const readinessWarnings = [
    !validBasics ? "Complete required basics." : "",
    !form.standardVersionIds.length ? "Add at least one NERC CIP mapping." : "",
    !form.objectives.length ? "Add at least one learning objective." : "",
    !form.modules.length ? "Add at least one module." : "",
    form.finalAssessmentEnabled && form.passingScore < 1 ? "Configure assessment passing score." : ""
  ].filter(Boolean);

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const saveDraft = async (open = false) => {
    if (!validBasics) return;
    setSaving(true);
    try {
      const created = draftId ? undefined : await createFromForm();
      if (created) setDraftId(created.id);
      await refresh();
      toast("Draft saved");
      if (open && created) navigate(`/build/courses/${created.id}`);
      if (!open) navigate("/build");
    } finally {
      setSaving(false);
    }
  };
  const createFromForm = () =>
    service().createCourseDraft({
      title: form.title,
      description: form.description,
      category: form.category,
      difficulty: form.difficulty,
      estimatedMinutes: form.estimatedMinutes,
      icon: form.icon,
      accent: form.accent,
      coverVisual: form.coverVisual,
      accessMode: form.accessMode,
      showInCatalog: form.showInCatalog,
      allowSelfEnrollment: form.allowSelfEnrollment,
      allowAccessRequests: form.allowAccessRequests,
      requireManagerApproval: form.requireManagerApproval,
      standardVersionIds: form.standardVersionIds,
      mappings: form.mappings.length ? form.mappings : undefined,
      objectives: form.objectives,
      skillIds: form.skillIds,
      completionEvidence: form.completionEvidence,
      audienceGrants: form.grants.map(({ grantType, grantId }) => ({ grantType, grantId })),
      modules: form.modules,
      completion: {
        requireAllLessons: form.requireAllLessons,
        requireFinalAssessment: form.requireFinalAssessment,
        requireScenarios: form.requireScenarios,
        requireAcknowledgement: form.requireAcknowledgement,
        requireManagerValidation: form.requireManagerValidation,
        finalAssessmentEnabled: form.finalAssessmentEnabled,
        passingScore: form.passingScore,
        attemptsAllowed: form.attemptsAllowed,
        failedAttemptBehavior: form.failedAttemptBehavior,
        randomizeQuestions: form.randomizeQuestions,
        randomizeAnswers: form.randomizeAnswers,
        showAnswersAfterAttempt: form.showAnswersAfterAttempt,
        certificateEnabled: form.certificateEnabled,
        certificateName: form.certificateName,
        certificateExpirationMonths: form.certificateExpirationMonths,
        completionDeadlineDays: form.completionDeadlineDays
      }
    });

  return (
    <div className="space-y-5 pb-24">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/home" }, { label: "Course Management", href: "/build" }, { label: "Create Course" }]} />
        <h1 className="text-2xl font-semibold">Create Course</h1>
        <p className="text-sm text-muted-foreground">Build the foundation now. Everything can be changed before publishing.</p>
      </div>
      <Panel>
        <div className="grid gap-2 md:grid-cols-6">
          {["Basics", "Compliance", "Audience", "Structure", "Completion", "Review"].map((label, index) => (
            <button key={label} className={`rounded-md border px-3 py-2 text-sm ${step === index + 1 ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100" : "border-border"}`} onClick={() => setStep(index + 1)}>
              {index + 1} {label}
            </button>
          ))}
        </div>
      </Panel>

      {step === 1 ? <WizardBasics form={form} update={update} valid={validBasics} /> : null}
      {step === 2 ? <WizardCompliance data={data} form={form} update={update} /> : null}
      {step === 3 ? <WizardAudience data={data} form={form} update={update} audienceOpen={audienceOpen} setAudienceOpen={setAudienceOpen} /> : null}
      {step === 4 ? <WizardStructure data={data} form={form} update={update} /> : null}
      {step === 5 ? <WizardCompletion form={form} update={update} /> : null}
      {step === 6 ? <WizardReview form={form} data={data} warnings={readinessWarnings} setStep={setStep} /> : null}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 p-3 backdrop-blur dark:bg-slate-950/95 lg:left-72">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link className="rounded-md border border-border px-3 py-2 text-sm" to="/build">Cancel</Link>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50" disabled={!validBasics || saving} onClick={() => saveDraft(false)}>{saving ? "Saving..." : "Save Draft"}</button>
            <button className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}>Back</button>
            {step < 6 ? (
              <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={step === 1 && !validBasics} onClick={() => setStep((value) => Math.min(6, value + 1))}>Continue</button>
            ) : (
              <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={Boolean(readinessWarnings.length) || saving} onClick={() => saveDraft(true)}>
                Create Course & Open Studio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardBasics({ form, update, valid }: { form: WizardState; update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void; valid: boolean }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Course basics</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-medium">Course Title
          <input className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" maxLength={90} value={form.title} onChange={(event) => update("title", event.target.value)} />
          <span className="mt-1 block text-xs text-muted-foreground">{form.title.length}/90</span>
        </label>
        <label className="block text-sm font-medium">Estimated Duration
          <input className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" type="number" min={5} value={form.estimatedMinutes} onChange={(event) => update("estimatedMinutes", Number(event.target.value))} />
          <span className="mt-1 block text-xs text-muted-foreground">{form.estimatedMinutes} minutes</span>
        </label>
        <label className="block text-sm font-medium lg:col-span-2">Short Description
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2" value={form.description} onChange={(event) => update("description", event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Category
          <select className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value={form.category} onChange={(event) => update("category", event.target.value)}>
            {["NERC CIP", "Cybersecurity", "Operations", "Physical Security", "Compliance", "New Employee Training", "Technical Training"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Difficulty
          <select className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>
            {["Foundational", "Intermediate", "Advanced"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChoiceGroup title="Course Icon" values={iconChoices} selected={form.icon} onSelect={(value) => update("icon", value)} />
        <div>
          <p className="text-sm font-medium">Accent</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {accentChoices.map((color) => <button key={color} aria-label={`Select ${color}`} className={`h-9 w-9 rounded-md border-2 ${form.accent === color ? "border-slate-950 dark:border-white" : "border-transparent"}`} style={{ background: color }} onClick={() => update("accent", color)} />)}
          </div>
        </div>
        <label className="block text-sm font-medium">Cover Visual
          <select className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value={form.coverVisual} onChange={(event) => update("coverVisual", event.target.value)}>
            {coverChoices.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {!valid ? <div className="mt-4"><InlineAlert tone="warning">Title, description, and duration are required before continuing.</InlineAlert></div> : null}
    </Panel>
  );
}

function ChoiceGroup({ title, values, selected, onSelect }: { title: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {values.map((value) => (
          <button key={value} className={`rounded-md border px-3 py-2 text-sm ${selected === value ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100" : "border-border"}`} onClick={() => onSelect(value)}>{value.replace(/([A-Z])/g, " $1").trim()}</button>
        ))}
      </div>
    </div>
  );
}

function WizardCompliance({ data, form, update }: { data: AppData; form: WizardState; update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void }) {
  const standards = data.standardVersions.map((version) => ({ version, standard: data.standards.find((item) => item.id === version.standardId)! })).filter((item) => item.standard);
  const addObjective = () => update("objectives", [...form.objectives, ""]);
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Compliance alignment</h2>
      <p className="text-sm text-muted-foreground">Connect this course to the requirements, skills, and outcomes it supports.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-sm font-medium">NERC CIP mappings</label>
          <select className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value="" onChange={(event) => {
            if (event.target.value && !form.standardVersionIds.includes(event.target.value)) update("standardVersionIds", [...form.standardVersionIds, event.target.value]);
          }}>
            <option value="">Add standard</option>
            {standards.map(({ standard, version }) => <option key={version.id} value={version.id}>{standard.number} — {standard.title}</option>)}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            {form.standardVersionIds.map((idValue) => {
              const standard = standards.find((item) => item.version.id === idValue)?.standard;
              return <button key={idValue} className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800" onClick={() => update("standardVersionIds", form.standardVersionIds.filter((item) => item !== idValue))}>{standard?.number ?? "Standard"} <X size={12} className="inline" /></button>;
            })}
          </div>
          <button className="mt-3 rounded-md border border-border px-3 py-2 text-sm" onClick={() => {
            const versionId = form.standardVersionIds[0] ?? standards[0]?.version.id;
            if (!versionId) return;
            update("mappings", [...form.mappings, { standardVersionId: versionId, requirementText: "", trainingRelevance: "", evidenceExpectation: "Completion and assessment evidence.", internalNotes: "" }]);
          }}>+ Add Requirement Mapping</button>
          <div className="mt-3 space-y-2">
            {form.mappings.map((mapping, index) => (
              <div key={index} className="rounded-md border border-border p-3">
                <input className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm" placeholder="Requirement / sub-requirement text" value={mapping.requirementText} onChange={(event) => {
                  const mappings = [...form.mappings]; mappings[index] = { ...mapping, requirementText: event.target.value }; update("mappings", mappings);
                }} />
                <textarea className="mt-2 min-h-20 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Training relevance" value={mapping.trainingRelevance} onChange={(event) => {
                  const mappings = [...form.mappings]; mappings[index] = { ...mapping, trainingRelevance: event.target.value }; update("mappings", mappings);
                }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Learning objectives</h3>
            <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={addObjective}>+ Add Objective</button>
          </div>
          <div className="mt-2 space-y-2">
            {form.objectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical size={16} className="text-muted-foreground" />
                <input className="h-10 flex-1 rounded-md border border-border bg-transparent px-3 text-sm" value={objective} onChange={(event) => {
                  const objectives = [...form.objectives]; objectives[index] = event.target.value; update("objectives", objectives);
                }} />
                <button className="rounded-md border border-border p-2" aria-label="Delete objective" onClick={() => update("objectives", form.objectives.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button>
              </div>
            ))}
          </div>
          <h3 className="mt-4 text-sm font-medium">Skills</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.skills.map((skill) => (
              <label key={skill.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input type="checkbox" checked={form.skillIds.includes(skill.id)} onChange={(event) => update("skillIds", event.target.checked ? [...form.skillIds, skill.id] : form.skillIds.filter((item) => item !== skill.id))} />
                {skill.name}
              </label>
            ))}
          </div>
          <h3 className="mt-4 text-sm font-medium">Compliance evidence produced</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {["Course completion", "Assessment score", "Acknowledgement", "Certificate", "Scenario completion", "Manager attestation"].map((item) => (
              <label key={item} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input type="checkbox" checked={form.completionEvidence.includes(item)} onChange={(event) => update("completionEvidence", event.target.checked ? [...form.completionEvidence, item] : form.completionEvidence.filter((value) => value !== item))} />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function WizardAudience({ data, form, update, audienceOpen, setAudienceOpen }: { data: AppData; form: WizardState; update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void; audienceOpen: boolean; setAudienceOpen: (open: boolean) => void }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Who should have access?</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["OPEN", "Open", "Anyone in the organization can discover and enroll."],
          ["RESTRICTED", "Restricted", "Visible only to approved audiences or users."],
          ["PRIVATE", "Private", "Only explicitly granted users can discover or open the course."]
        ].map(([mode, title, body]) => (
          <button key={mode} className={`rounded-md border p-4 text-left ${form.accessMode === mode ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => update("accessMode", mode as Course["accessMode"])}>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {[
          ["showInCatalog", "Show in catalog"],
          ["allowSelfEnrollment", "Allow self-enrollment"],
          ["allowAccessRequests", "Allow access requests"],
          ["requireManagerApproval", "Require manager approval"]
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
            <input type="checkbox" checked={Boolean(form[key as keyof WizardState])} onChange={(event) => update(key as keyof WizardState, event.target.checked as never)} />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" onClick={() => setAudienceOpen(true)}>+ Add Audience</button>
        <div className="mt-3 flex flex-wrap gap-2">
          {form.grants.map((grant) => <button key={`${grant.grantType}-${grant.grantId}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800" onClick={() => update("grants", form.grants.filter((item) => item !== grant))}>{grant.label} — {grant.grantType} <X size={12} className="inline" /></button>)}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Access controls in this GitHub demo are simulated using the local application data model.</p>
      {audienceOpen ? <AudienceModal data={data} selected={form.grants} onSelect={(grants) => update("grants", grants)} onClose={() => setAudienceOpen(false)} /> : null}
    </Panel>
  );
}

function AudienceModal({ data, selected, onSelect, onClose }: { data: AppData; selected: WizardState["grants"]; onSelect: (grants: WizardState["grants"]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<CourseAccessGrant["grantType"]>("TEAM");
  const lists = {
    TEAM: data.teams.map((item) => ({ id: item.id, label: item.name })),
    GROUP: data.groups.map((item) => ({ id: item.id, label: item.name })),
    USER: data.users.map((item) => ({ id: item.id, label: item.name })),
    ROLE: ["LEARNER", "MANAGER", "AUTHOR", "REVIEWER", "COMPLIANCE_MANAGER"].map((item) => ({ id: item, label: item.replaceAll("_", " ") }))
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md bg-white p-5 shadow-xl dark:bg-slate-950">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Add Audience</h3><button onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["TEAM", "GROUP", "USER", "ROLE"] as const).map((item) => <button key={item} className={`rounded-md border px-3 py-1.5 text-sm ${tab === item ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => setTab(item)}>{item}s</button>)}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {lists[tab].map((item) => {
            const exists = selected.some((grant) => grant.grantType === tab && grant.grantId === item.id);
            return (
              <button key={item.id} className={`rounded-md border p-3 text-left text-sm ${exists ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => {
                onSelect(exists ? selected.filter((grant) => !(grant.grantType === tab && grant.grantId === item.id)) : [...selected, { grantType: tab, grantId: item.id, label: item.label }]);
              }}>
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-5 text-right"><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function generateOutline(size: string) {
  const base = [
    { title: "Requirement Context", lessons: ["Why this requirement matters", "Roles and responsibilities"] },
    { title: "Required Procedures", lessons: ["Required process steps", "Common decision points"] },
    { title: "Evidence and Documentation", lessons: ["Evidence characteristics", "Record review"] },
    { title: "Applied Scenarios", lessons: ["Scenario walkthrough"] },
    { title: "Final Assessment", lessons: ["Assessment preparation"] }
  ];
  if (size.startsWith("Quick")) return base.slice(0, 3);
  if (size.startsWith("Detailed")) return [...base, { title: "Manager Validation", lessons: ["Validation criteria", "Coaching follow-up"] }];
  return base;
}

function WizardStructure({ data, form, update }: { data: AppData; form: WizardState; update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void }) {
  const copyCourse = (courseId: string) => {
    const course = data.courses.find((item) => item.id === courseId);
    if (!course) return;
    const modules = data.modules
      .filter((module) => module.courseVersionId === course.currentVersionId)
      .sort((left, right) => left.position - right.position)
      .map((module) => ({ title: module.title, lessons: data.lessons.filter((lesson) => lesson.moduleId === module.id).sort((left, right) => left.position - right.position).map((lesson) => lesson.title) }));
    update("modules", modules.length ? modules : generateOutline("Standard Course"));
  };
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Build your starting outline</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => update("modules", [{ title: "Module 1", lessons: ["Lesson 1"] }])}>Start Blank</button>
        {["Quick Course", "Standard Course", "Detailed Course"].map((size) => <button key={size} className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => update("modules", generateOutline(size))}>Generate {size}</button>)}
        <select className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" value="" onChange={(event) => copyCourse(event.target.value)}>
          <option value="">Copy Existing Course</option>
          {data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
        </select>
      </div>
      <StructureEditor modules={form.modules} onChange={(modules) => update("modules", modules)} />
    </Panel>
  );
}

function StructureEditor({ modules, onChange }: { modules: WizardState["modules"]; onChange: (modules: WizardState["modules"]) => void }) {
  const moveModule = (index: number, direction: number) => {
    const next = [...modules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="mt-4 space-y-3">
      {modules.map((module, moduleIndex) => (
        <div key={moduleIndex} className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <GripVertical size={16} className="text-muted-foreground" />
            <input className="h-10 flex-1 rounded-md border border-border bg-transparent px-3 text-sm font-medium" value={module.title} onChange={(event) => {
              const next = [...modules]; next[moduleIndex] = { ...module, title: event.target.value }; onChange(next);
            }} />
            <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => moveModule(moduleIndex, -1)}>Up</button>
            <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => moveModule(moduleIndex, 1)}>Down</button>
            <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => onChange(modules.filter((_, index) => index !== moduleIndex))}>Delete</button>
          </div>
          <div className="mt-3 space-y-2 pl-6">
            {module.lessons.map((lesson, lessonIndex) => (
              <div key={lessonIndex} className="flex flex-wrap items-center gap-2">
                <BookOpen size={15} className="text-muted-foreground" />
                <input className="h-9 flex-1 rounded-md border border-border bg-transparent px-3 text-sm" value={lesson} onChange={(event) => {
                  const next = [...modules]; const lessons = [...module.lessons]; lessons[lessonIndex] = event.target.value; next[moduleIndex] = { ...module, lessons }; onChange(next);
                }} />
                <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => {
                  const next = [...modules]; const lessons = [...module.lessons]; const target = lessonIndex - 1; if (target >= 0) [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]]; next[moduleIndex] = { ...module, lessons }; onChange(next);
                }}>Up</button>
                <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => {
                  const next = [...modules]; const lessons = [...module.lessons]; const target = lessonIndex + 1; if (target < lessons.length) [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]]; next[moduleIndex] = { ...module, lessons }; onChange(next);
                }}>Down</button>
                <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => {
                  const next = [...modules]; next[moduleIndex] = { ...module, lessons: module.lessons.filter((_, index) => index !== lessonIndex) }; onChange(next);
                }}>Delete</button>
              </div>
            ))}
            <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => {
              const next = [...modules]; next[moduleIndex] = { ...module, lessons: [...module.lessons, `Lesson ${module.lessons.length + 1}`] }; onChange(next);
            }}>+ Add lesson</button>
          </div>
        </div>
      ))}
      <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" onClick={() => onChange([...modules, { title: `Module ${modules.length + 1}`, lessons: ["New lesson"] }])}>Add module</button>
    </div>
  );
}

function WizardCompletion({ form, update }: { form: WizardState; update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Define completion</h2>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {[
          ["requireAllLessons", "Complete all required lessons"],
          ["requireFinalAssessment", "Pass final assessment"],
          ["requireScenarios", "Complete required scenarios"],
          ["requireAcknowledgement", "Provide acknowledgement"],
          ["requireManagerValidation", "Receive manager approval"],
          ["finalAssessmentEnabled", "Enable final assessment"],
          ["randomizeQuestions", "Randomize questions"],
          ["randomizeAnswers", "Randomize answers"],
          ["showAnswersAfterAttempt", "Display answers after attempt"],
          ["certificateEnabled", "Enable certificate"]
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
            <input type="checkbox" checked={Boolean(form[key as keyof WizardState])} onChange={(event) => update(key as keyof WizardState, event.target.checked as never)} /> {label}
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium">Passing score
          <input className="mt-2 h-10 w-full rounded-md border border-border bg-transparent px-3" type="number" min={1} max={100} value={form.passingScore} onChange={(event) => update("passingScore", Number(event.target.value))} />
        </label>
        <label className="text-sm font-medium">Attempts
          <select className="mt-2 h-10 w-full rounded-md border border-border bg-transparent px-3" value={form.attemptsAllowed} onChange={(event) => update("attemptsAllowed", Number(event.target.value))}>
            {[99, 1, 2, 3, 5].map((item) => <option key={item} value={item}>{item === 99 ? "Unlimited" : item}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Certificate name
          <input className="mt-2 h-10 w-full rounded-md border border-border bg-transparent px-3" value={form.certificateName} onChange={(event) => update("certificateName", event.target.value)} />
        </label>
        <label className="text-sm font-medium">Deadline days after assignment
          <input className="mt-2 h-10 w-full rounded-md border border-border bg-transparent px-3" type="number" value={form.completionDeadlineDays ?? 30} onChange={(event) => update("completionDeadlineDays", Number(event.target.value))} />
        </label>
      </div>
    </Panel>
  );
}

function WizardReview({ form, data, warnings, setStep }: { form: WizardState; data: AppData; warnings: string[]; setStep: (step: number) => void }) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Review course setup</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {[
          ["Course Basics", form.title && form.description, 1],
          ["Compliance", form.standardVersionIds.length && form.objectives.length, 2],
          ["Audience", form.accessMode === "OPEN" || form.grants.length || form.showInCatalog, 3],
          ["Structure", form.modules.length && form.modules.some((module) => module.lessons.length), 4],
          ["Completion", form.requireAllLessons || form.requireFinalAssessment, 5]
        ].map(([title, ok, target]) => (
          <div key={title as string} className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-2">{ok ? <CheckCircle2 className="text-emerald-600" /> : <AlertTriangle className="text-amber-600" />} <span className="font-medium">{title}</span></div>
            <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => setStep(Number(target))}>Edit</button>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-border p-4">
        <p className="font-medium">{warnings.length ? `${warnings.length} items need attention` : "Ready to create"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{form.title} maps to {form.standardVersionIds.length} standard version{form.standardVersionIds.length === 1 ? "" : "s"}, includes {form.modules.length} modules, and will produce {form.completionEvidence.join(", ") || "completion evidence"}.</p>
        {warnings.length ? <ul className="mt-3 space-y-1 text-sm text-amber-700 dark:text-amber-200">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
        <p className="mt-3 text-xs text-muted-foreground">Available standards: {data.standards.map((standard) => standard.number).slice(0, 5).join(", ")}...</p>
      </div>
    </Panel>
  );
}

export function CourseWorkspace() {
  const { data, user, service, refresh, toast } = useApp();
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>();
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();
  const [publishOpen, setPublishOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return <Panel><h1 className="text-xl font-semibold">Course not found</h1><Link className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/build">Return to Course Management</Link></Panel>;
  const canManage = canEditCourse(data, user.id, course.id) || canReviewCourse(data, user.id, course.id);
  if (!canManage && !canManageCourses(data, user.id)) return <Panel><AccessRestrictedMini label="Course Management" /></Panel>;
  const version = data.courseVersions.find((item) => item.id === (course.draftVersionId ?? course.currentVersionId));
  const readiness = calculateCourseReadiness(data, course.id);
  const selectedLesson = data.lessons.find((lesson) => lesson.id === selectedLessonId) ?? data.lessons.find((lesson) => lesson.courseVersionId === version?.id);
  const selectedBlock = data.contentBlocks.find((block) => block.id === selectedBlockId);
  const banner = statusBanner(course.status);
  const publishDisabled = !canPublishCourse(data, user.id, course.id) || course.status !== "APPROVED" || readiness.blockingIssues.length > 0;

  const duplicate = async () => {
    const copy = await service().duplicateCourse(course.id);
    await refresh();
    toast("Course duplicated");
    navigate(`/build/courses/${copy.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Course Management", href: "/build" }, { label: course.title }]} />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{course.title}</h1>
            <StatusBadge status={course.status} />
            <span className="rounded-md border border-border px-2 py-1 text-xs">Draft v{version?.version ?? "1.0"}</span>
            <span className="text-sm text-emerald-600">Saved just now</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${course.id}`}>Preview</Link>
          <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setReviewOpen(true)}>Request Review</button>
          <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={Boolean(publishDisabled)} title={publishDisabled ? "Approval and readiness checks are required before publishing." : "Publish course"} onClick={() => setPublishOpen(true)}>Publish</button>
          <select className="rounded-md border border-border bg-transparent px-2 py-2 text-sm" defaultValue="" aria-label="Course actions" onChange={async (event) => {
            const value = event.target.value;
            event.currentTarget.value = "";
            if (value === "settings") setSearchParams({ tab: "overview" });
            if (value === "duplicate") await duplicate();
            if (value === "version") { await service().createCourseVersion(course.id, "MINOR", "Course Manager draft update."); await refresh(); toast("New version created"); }
            if (value === "export") exportCourse(data, course.id);
            if (value === "archive") { const reason = window.prompt("Archive reason", "Lifecycle cleanup"); if (reason) { await service().archiveCourse(course.id, reason); await refresh(); toast("Course archived"); } }
          }}>
            <option value="" disabled>•••</option>
            <option value="settings">Course Settings</option>
            <option value="duplicate">Duplicate Course</option>
            <option value="version">Create New Version</option>
            <option value="export">Export Course</option>
            <option value="archive">Archive Course</option>
          </select>
        </div>
      </div>
      <InlineAlert tone={banner.tone}>{banner.text}</InlineAlert>
      <div className="flex gap-2 overflow-auto border-b border-border">
        {tabs.map((item) => (
          <button key={item} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm capitalize ${tab === item ? "border-cyan-700 text-cyan-700" : "border-transparent text-muted-foreground"}`} onClick={() => setSearchParams({ tab: item })}>{item}</button>
        ))}
      </div>
      {tab === "overview" ? <OverviewTab course={course} readiness={readiness} /> : null}
      {tab === "curriculum" ? <CurriculumTab course={course} selectedLesson={selectedLesson} selectedBlock={selectedBlock} setSelectedLessonId={setSelectedLessonId} setSelectedBlockId={setSelectedBlockId} /> : null}
      {tab === "assessment" ? <AssessmentTab course={course} /> : null}
      {tab === "compliance" ? <ComplianceTab course={course} /> : null}
      {tab === "audience" ? <AudienceTab course={course} /> : null}
      {tab === "completion" ? <CompletionTab course={course} /> : null}
      {tab === "review" ? <ReviewTab course={course} openRequest={() => setReviewOpen(true)} /> : null}
      {tab === "assignments" ? <AssignmentsTab course={course} /> : null}
      {tab === "analytics" ? <AnalyticsTab course={course} /> : null}
      {tab === "activity" ? <ActivityTab course={course} /> : null}
      {publishOpen ? <PublishDialog course={course} onClose={() => setPublishOpen(false)} /> : null}
      {reviewOpen ? <RequestReviewDialog course={course} onClose={() => setReviewOpen(false)} /> : null}
    </div>
  );
}

function AccessRestrictedMini({ label }: { label: string }) {
  return <div className="py-10 text-center"><Lock className="mx-auto text-amber-600" /><h1 className="mt-3 text-xl font-semibold">Access Restricted</h1><p className="text-sm text-muted-foreground">You do not have permission to access {label}.</p><Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/home">Return Home</Link></div>;
}

function statusBanner(status: CourseStatus) {
  if (status === "DRAFT") return { tone: "info" as const, text: "This course is a draft and is not visible to learners." };
  if (status === "IN_REVIEW") return { tone: "warning" as const, text: "This version is currently being reviewed. Major structural changes may require resubmission." };
  if (status === "CHANGES_REQUESTED") return { tone: "danger" as const, text: "Reviewers requested changes before this version can be approved." };
  if (status === "APPROVED") return { tone: "success" as const, text: "This course is approved and ready to publish." };
  if (status === "PUBLISHED") return { tone: "success" as const, text: "Version 1.0 is published. Create a new version to make changes." };
  if (status === "ARCHIVED") return { tone: "warning" as const, text: "This course is archived and unavailable for new assignments." };
  return { tone: "info" as const, text: "This course is scheduled for publication." };
}

function OverviewTab({ course, readiness }: { course: Course; readiness: ReturnType<typeof calculateCourseReadiness> }) {
  const { data, service, refresh, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.shortDescription);
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
    </div>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "md:col-span-2" : ""}><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}

function CurriculumTab({ course, selectedLesson, selectedBlock, setSelectedLessonId, setSelectedBlockId }: { course: Course; selectedLesson?: Lesson; selectedBlock?: ContentBlock; setSelectedLessonId: (id: string) => void; setSelectedBlockId: (id: string) => void }) {
  const { data, service, refresh, toast } = useApp();
  const versionId = course.draftVersionId ?? course.currentVersionId;
  const modules = data.modules.filter((module) => module.courseVersionId === versionId).sort((left, right) => left.position - right.position);
  const blocks = selectedLesson ? data.contentBlocks.filter((block) => block.lessonId === selectedLesson.id).sort((left, right) => left.position - right.position) : [];
  const addModule = async () => { const title = window.prompt("Module name", `Module ${modules.length + 1}`); if (!title) return; await service().addModule(course.id, title); await refresh(); toast("Module added"); };
  const addLesson = async (moduleId: string) => { const title = window.prompt("Lesson name", "New lesson"); if (!title) return; const lesson = await service().addLesson(course.id, moduleId, title); await refresh(); setSelectedLessonId(lesson.id); toast("Lesson added"); };
  const addBlock = async (type: string) => {
    if (!selectedLesson) return;
    const title = blockTitle(type);
    const body = defaultBlockBody(type);
    const block = await service().addContentBlock(course.id, selectedLesson.id, type, title, body, defaultBlockData(type));
    await refresh();
    setSelectedBlockId(block.id);
    toast("Content block added");
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr_300px]">
      <Panel>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Course structure</h2><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={addModule}>+ Module</button></div>
        <div className="mt-3 space-y-3">
          {modules.map((module) => (
            <div key={module.id} className="rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-muted-foreground" />
                <button className="flex-1 text-left text-sm font-medium" onClick={() => {
                  const title = window.prompt("Rename module", module.title);
                  if (title) void service().updateModule(module.id, { title }).then(refresh);
                }}>{module.title}</button>
                <button className="text-xs text-cyan-700" onClick={() => addLesson(module.id)}>+ Lesson</button>
              </div>
              <div className="mt-2 space-y-1 pl-3">
                {data.lessons.filter((lesson) => lesson.moduleId === module.id).sort((left, right) => left.position - right.position).map((lesson) => (
                  <button key={lesson.id} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${selectedLesson?.id === lesson.id ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100" : "hover:bg-muted"}`} onClick={() => setSelectedLessonId(lesson.id)}>
                    <BookOpen size={14} /> <span className="min-w-0 flex-1 truncate">{lesson.title}</span><span className="text-xs text-muted-foreground">{lesson.estimatedMinutes}m</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {!modules.length ? <EmptyState title="Start building your curriculum" body="Add a module or generate an outline to begin." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={addModule}>Add Module</button>} /> : null}
      </Panel>
      <Panel>
        {selectedLesson ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{selectedLesson.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedLesson.required ? "Required" : "Optional"} · {selectedLesson.estimatedMinutes} minutes</p>
              </div>
              <div className="flex gap-2">
                <Link className="rounded-md border border-border px-3 py-1.5 text-sm" to={`/learn/${course.id}/${selectedLesson.id}`}>Preview Lesson</Link>
                <button className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={async () => { await service().updateLesson(selectedLesson.id, { required: !selectedLesson.required }); await refresh(); }}>Mark {selectedLesson.required ? "Optional" : "Required"}</button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "paragraph",
                "rich_text",
                "definition",
                "key_concept",
                "why_this_matters",
                "compliance_connection",
                "audit_lens",
                "process_diagram",
                "before_after",
                "timeline",
                "knowledge_check",
                "quick_recall",
                "classification",
                "sequence_builder",
                "matching",
                "decision_cards",
                "rapid_decisions",
                "system_inspector",
                "evidence_inspector",
                "network_explorer",
                "build_record",
                "scenario"
              ].map((type) => (
                <button key={type} className="rounded-md border border-border p-2 text-left text-sm hover:border-cyan-600" onClick={() => addBlock(type)}>+ {blockTitle(type)}</button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {blocks.map((block) => (
                <div key={block.id} className={`rounded-md border p-3 ${selectedBlock?.id === block.id ? "border-cyan-600" : "border-border"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <GripVertical size={15} className="text-muted-foreground" />
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{blockTitle(block.type)}</span>
                    <button className="font-medium" onClick={() => setSelectedBlockId(block.id)}>{block.title}</button>
                    <div className="ml-auto flex gap-1">
                      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => setSelectedBlockId(block.id)}>Edit</button>
                      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { await service().duplicateContentBlock(course.id, block.id); await refresh(); toast("Block duplicated"); }}>Duplicate</button>
                      <button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { if (confirm("Delete this content block?")) { await service().deleteContentBlock(course.id, block.id); await refresh(); toast("Block deleted"); } }}>Delete</button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{block.body}</p>
                  {block.type === "knowledge_check" ? <LearnerKnowledgePreview block={block} /> : null}
                  {block.type === "scenario" ? <ScenarioPreview block={block} /> : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Select a lesson" body="Choose a lesson from the structure tree to edit content blocks." />
        )}
      </Panel>
      <Panel>
        <h2 className="font-semibold">Inspector</h2>
        {selectedBlock ? <BlockInspector courseId={course.id} block={selectedBlock} /> : selectedLesson ? <LessonInspector lesson={selectedLesson} /> : <p className="mt-2 text-sm text-muted-foreground">Select a lesson or block to edit properties.</p>}
      </Panel>
    </div>
  );
}

function blockTitle(type: string) {
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function defaultBlockBody(type: string) {
  if (type === "knowledge_check" || type === "quick_recall") return "Which action best supports the process described in this lesson?";
  if (type === "scenario") return "Use the information provided to choose the next responsible action.";
  if (type === "audit_lens") return "Consider how another qualified reviewer would examine this activity later.";
  if (type === "process_diagram") return "Review the process stages and the evidence each stage should leave behind.";
  if (type === "before_after") return "Compare a weak record with a stronger, more traceable version.";
  if (type === "system_inspector") return "Inspect the simulated system record and select items that deserve review.";
  if (type === "evidence_inspector" || type === "build_record") return "Select the fields that make this record traceable and useful.";
  if (type === "network_explorer") return "Explore the diagram and identify the path, owner, or visibility concern.";
  if (type === "sequence_builder") return "Place the process steps in the most appropriate order.";
  if (type === "decision_cards") return "Choose the response that best fits the approved process.";
  if (type === "rapid_decisions") return "Work through each situation and decide whether to proceed, verify, or report.";
  if (type === "matching") return "Match each concept with the best description.";
  if (type.includes("compliance")) return "Connect this topic to the mapped NERC CIP concept and the evidence learners should recognize.";
  return "Add concise, job-relevant training content for this lesson.";
}

function defaultBlockData(type: string) {
  if (type === "knowledge_check" || type === "quick_recall") return { answers: ["Follow the approved process and retain useful evidence", "Wait until the annual audit", "Rely only on verbal confirmation"], correct: 0, explanation: "The strongest answer connects action, accountability, and traceable evidence." };
  if (type === "scenario") return { choices: ["Use the approved review process", "Ignore the change until the next audit", "Delete historical records"], correct: 0, feedback: ["Correct. Start with the defined process and preserve evidence.", "Waiting can leave the issue unresolved.", "Historical evidence must be retained."] };
  if (type === "audit_lens") return { intro: "A reviewer may ask whether the activity can be reconstructed from retained records.", reviewerQuestions: ["Who performed the activity?", "What population or item was reviewed?", "When did it occur?", "What result was recorded?"], evidenceExamples: ["completed review record", "approval record", "exception or follow-up record"] };
  if (type === "process_diagram") return { stages: ["Request", "Review", "Authorize", "Perform", "Verify", "Document"], caption: "A repeatable process leaves a clear path from trigger to evidence." };
  if (type === "before_after") return { beforeTitle: "Weak Record", before: "Completed.", afterTitle: "Stronger Record", after: "The assigned owner completed the review on September 8, recorded the result, and routed required follow-up.", improvements: ["person", "activity", "date", "result", "follow-up"] };
  if (type === "system_inspector") return { prompt: "Select the rows that deserve further review.", columns: ["Item", "Purpose", "State"], rows: [{ id: "approved", cells: ["Approved service", "Documented need", "Current"] }, { id: "expired", cells: ["Temporary privilege", "Project support", "Expired"] }, { id: "missing", cells: ["Legacy item", "Unknown", "Owner missing"] }], expected: ["expired", "missing"], success: "You identified the records that need review.", feedback: "Look for missing ownership, expired need, or unexplained access." };
  if (type === "evidence_inspector" || type === "build_record") return { prompt: "Which fields make the record traceable?", fields: ["Learner or owner", "Activity", "Date", "Result", "Approver", "Favorite color"], expected: ["Learner or owner", "Activity", "Date", "Result", "Approver"], success: "The selected fields support identity, activity, timing, result, and accountability." };
  if (type === "network_explorer") return { prompt: "Select the diagram elements that require review.", nodes: [{ id: "approved", label: "Approved Gateway", status: "approved" }, { id: "unknown", label: "Unknown Path", status: "unknown" }, { id: "unmonitored", label: "Unmonitored Segment", status: "unmonitored" }], expected: ["unknown", "unmonitored"], success: "Unknown and unmonitored paths should be routed for review." };
  if (type === "sequence_builder") return { prompt: "Order the process.", steps: ["Identify", "Evaluate", "Decide", "Implement", "Verify", "Document"], success: "That sequence preserves the decision path." };
  if (type === "decision_cards") return { question: "What is the best next action?", options: ["Use the approved process", "Bypass the process for speed", "Ignore the issue"], correct: 0, feedback: ["Correct. The approved process creates accountability.", "Speed does not remove process responsibility.", "Ignoring the issue leaves risk unresolved."] };
  if (type === "rapid_decisions") return { actions: ["PROCEED", "VERIFY", "REPORT"], cards: [{ prompt: "Unexpected access prompt appears.", correct: "REPORT", feedback: "Unexpected access prompts should be reported." }, { prompt: "Scheduled approved update begins.", correct: "PROCEED", feedback: "Expected approved activity can proceed." }] };
  if (type === "matching") return { prompt: "Match each item.", pairs: [{ left: "Evidence", right: "A retained record showing what occurred" }, { left: "Procedure", right: "How the work is performed" }, { left: "Owner", right: "The responsible person or group" }] };
  return undefined;
}

function BlockInspector({ courseId, block }: { courseId: string; block: ContentBlock }) {
  const { service, refresh, toast } = useApp();
  const [title, setTitle] = useState(block.title ?? "");
  const [body, setBody] = useState(block.body ?? "");
  useEffect(() => { setTitle(block.title ?? ""); setBody(block.body ?? ""); }, [block.id, block.title, block.body]);
  return (
    <form className="mt-3 space-y-3" onSubmit={async (event) => { event.preventDefault(); await service().updateContentBlock(courseId, block.id, { title, body }); await refresh(); toast("Saved"); }}>
      <label className="block text-sm font-medium">Block title<input className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block text-sm font-medium">Body<textarea className="mt-1 min-h-40 w-full rounded-md border border-border bg-transparent px-3 py-2" value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white">Save Block</button>
    </form>
  );
}

function LessonInspector({ lesson }: { lesson: Lesson }) {
  const { service, refresh, toast } = useApp();
  const [title, setTitle] = useState(lesson.title);
  const [minutes, setMinutes] = useState(lesson.estimatedMinutes);
  useEffect(() => { setTitle(lesson.title); setMinutes(lesson.estimatedMinutes); }, [lesson.id, lesson.title, lesson.estimatedMinutes]);
  return (
    <form className="mt-3 space-y-3" onSubmit={async (event) => { event.preventDefault(); await service().updateLesson(lesson.id, { title, estimatedMinutes: minutes }); await refresh(); toast("Lesson saved"); }}>
      <label className="block text-sm font-medium">Lesson title<input className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="block text-sm font-medium">Duration<input className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" type="number" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
      <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white">Save Lesson</button>
    </form>
  );
}

function LearnerKnowledgePreview({ block }: { block: ContentBlock }) {
  const data = block.data as { answers?: string[]; correct?: number; explanation?: string } | undefined;
  return <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="font-medium">Learner preview</p>{data?.answers?.map((answer, index) => <div key={answer} className="mt-1">○ {answer} {index === data.correct ? <span className="text-emerald-600">(correct)</span> : null}</div>)}<p className="mt-2 text-muted-foreground">{data?.explanation}</p></div>;
}

function ScenarioPreview({ block }: { block: ContentBlock }) {
  const data = block.data as { choices?: string[]; correct?: number } | undefined;
  return <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">{data?.choices?.map((choice, index) => <div key={choice}>• {choice} {index === data.correct ? <span className="text-emerald-600">(expected)</span> : null}</div>)}</div>;
}

function AssessmentTab({ course }: { course: Course }) {
  const { data, service, refresh, toast } = useApp();
  const assessment = data.assessments.find((item) => item.courseVersionId === (course.draftVersionId ?? course.currentVersionId));
  const links = assessment ? data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id).sort((left, right) => left.position - right.position) : [];
  const addQuestion = async () => {
    if (!assessment) return;
    const prompt = window.prompt("Question text", "Which action best supports compliance-ready evidence?");
    if (!prompt) return;
    await service().createQuestion({ assessmentId: assessment.id, type: "MULTIPLE_CHOICE", prompt, explanation: "Complete evidence is timely, traceable, and retained.", options: [{ text: "Retain a dated course completion record", isCorrect: true }, { text: "Use a verbal confirmation", isCorrect: false }, { text: "Wait for the audit request", isCorrect: false }] });
    await refresh();
    toast("Question added");
  };
  if (!assessment) return <Panel><EmptyState title="No assessment configured" body="Enable the final assessment in Completion to begin adding questions." /></Panel>;
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Final Assessment</h2><div className="flex gap-2"><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={addQuestion}>Add Question</button><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/build/questions">Import from Question Bank</Link></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-4"><StatMini label="Questions" value={links.length} /><StatMini label="Passing Score" value={`${assessment.passingScore}%`} /><StatMini label="Attempts" value={assessment.maxAttempts} /><StatMini label="Estimated Time" value={`${Math.max(5, links.length * 2)}m`} /></div>
      <div className="mt-4 space-y-2">
        {links.map((link) => {
          const question = data.questions.find((item) => item.id === link.questionId)!;
          return <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm"><FileQuestion size={17} /><div className="min-w-0 flex-1"><p className="font-medium">{question.prompt}</p><p className="text-xs text-muted-foreground">{question.type.replaceAll("_", " ")} · {link.points} point</p></div><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { await service().createQuestion({ assessmentId: assessment.id, type: question.type, prompt: `${question.prompt} (copy)`, explanation: question.explanation, options: data.questionOptions.filter((option) => option.questionId === question.id).map((option) => ({ text: option.text, isCorrect: option.isCorrect, match: option.match })) }); await refresh(); }}>Duplicate</button><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { await service().removeQuestionFromAssessment(assessment.id, question.id); await refresh(); }}>Delete</button></div>;
        })}
      </div>
      {!links.length ? <div className="mt-4"><EmptyState title="No assessment questions yet" body="Create questions or import from the question bank." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={addQuestion}>Create Question</button>} /></div> : null}
    </Panel>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

function ComplianceTab({ course }: { course: Course }) {
  const { data } = useApp();
  const mappings = data.courseStandardMappings.filter((item) => item.courseId === course.id);
  const objectives = data.learningObjectives.filter((item) => item.courseVersionId === (course.draftVersionId ?? course.currentVersionId));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="font-semibold">Mapped Standards</h2>
        <div className="mt-3 space-y-3">{mappings.map((mapping) => {
          const version = data.standardVersions.find((item) => item.id === mapping.standardVersionId);
          const standard = data.standards.find((item) => item.id === version?.standardId);
          return <div key={mapping.id} className="rounded-md border border-border p-3"><p className="font-medium">{standard?.number} Coverage</p><p className="mt-1 text-sm text-muted-foreground">{standard?.title}</p><ProgressBar value={objectives.length ? 100 : 50} /><p className="mt-2 text-xs text-muted-foreground">Evidence: {mapping.evidenceExpectation}</p></div>;
        })}</div>
      </Panel>
      <Panel>
        <h2 className="font-semibold">Learning Objectives</h2>
        <div className="mt-3 space-y-2">{objectives.map((objective) => <div key={objective.id} className="rounded-md border border-border p-3 text-sm">{objective.text}</div>)}</div>
      </Panel>
    </div>
  );
}

function AudienceTab({ course }: { course: Course }) {
  const { data, service, refresh, toast } = useApp();
  const [checkUser, setCheckUser] = useState(data.users[0]?.id ?? "");
  const result = checkUser ? canAccessCourse(data, checkUser, course.id, true) : undefined;
  const grants = data.courseAccessGrants.filter((item) => item.courseId === course.id);
  const addGrant = async (grantType: CourseAccessGrant["grantType"], grantId: string) => {
    data.courseAccessGrants.push({ id: crypto.randomUUID(), courseId: course.id, grantType, grantId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await service().persist();
    await refresh();
    toast("Access updated");
  };
  return (
    <div className="space-y-4">
      <Panel>
        <h2 className="font-semibold">Access Mode</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">{(["OPEN", "RESTRICTED", "PRIVATE"] as const).map((mode) => <button key={mode} className={`rounded-md border p-3 text-left ${course.accessMode === mode ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={async () => { await service().updateCourse(course.id, { accessMode: mode }); await refresh(); }}>{mode.replaceAll("_", " ")}</button>)}</div>
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Audience Grants</h2><select className="rounded-md border border-border bg-transparent px-3 py-2 text-sm" value="" onChange={async (event) => { const [type, idValue] = event.target.value.split(":"); if (type && idValue) await addGrant(type as CourseAccessGrant["grantType"], idValue); event.currentTarget.value = ""; }}><option value="">+ Add Audience</option>{data.teams.map((team) => <option key={team.id} value={`TEAM:${team.id}`}>{team.name} — Team</option>)}{data.groups.map((group) => <option key={group.id} value={`GROUP:${group.id}`}>{group.name} — Group</option>)}{data.users.map((user) => <option key={user.id} value={`USER:${user.id}`}>{user.name} — User</option>)}</select></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{grants.map((grant) => <div key={grant.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span>{grantName(data, grant)} — {grant.grantType}</span><button className="text-xs text-red-600" onClick={async () => { data.courseAccessGrants = data.courseAccessGrants.filter((item) => item.id !== grant.id); await service().persist(); await refresh(); }}>Remove</button></div>)}</div>
      </Panel>
      <Panel>
        <h2 className="font-semibold">Check learner access</h2>
        <select className="mt-3 h-10 w-full max-w-md rounded-md border border-border bg-transparent px-3" value={checkUser} onChange={(event) => setCheckUser(event.target.value)}>{data.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        {result ? <InlineAlert tone={result.allowed ? "success" : "warning"}>{result.allowed ? "Access Allowed" : "Access Restricted"} · {result.reason}</InlineAlert> : null}
      </Panel>
    </div>
  );
}

function grantName(data: AppData, grant: CourseAccessGrant) {
  if (grant.grantType === "TEAM") return data.teams.find((item) => item.id === grant.grantId)?.name ?? "Team";
  if (grant.grantType === "GROUP") return data.groups.find((item) => item.id === grant.grantId)?.name ?? "Group";
  if (grant.grantType === "USER") return data.users.find((item) => item.id === grant.grantId)?.name ?? "User";
  return grant.grantId.replaceAll("_", " ");
}

function CompletionTab({ course }: { course: Course }) {
  const { service, refresh, toast } = useApp();
  const toggle = async (key: keyof Course) => { await service().updateCourse(course.id, { [key]: !course[key] } as Partial<Course>); await refresh(); toast("Completion updated"); };
  return (
    <Panel>
      <h2 className="font-semibold">Completion Requirements</h2>
      <div className="mt-3 rounded-md bg-slate-50 p-4 text-sm dark:bg-slate-900">
        <p className="font-medium">To complete this course a learner must:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {course.requireAllLessons ?? true ? <li>Complete all required lessons</li> : null}
          {course.requireFinalAssessment ?? true ? <li>Score at least 80% on the final assessment</li> : null}
          {course.requireScenarios ? <li>Complete required scenarios</li> : null}
          {course.requireAcknowledgement ? <li>Acknowledge the training statement</li> : null}
          {course.requireManagerValidation ? <li>Receive manager approval</li> : null}
        </ol>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{[
        ["requireAllLessons", "Complete all required lessons"],
        ["requireFinalAssessment", "Pass final assessment"],
        ["requireScenarios", "Complete scenarios"],
        ["requireAcknowledgement", "Acknowledgement"],
        ["requireManagerValidation", "Manager approval"],
        ["certificateEnabled", "Certificate enabled"]
      ].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={Boolean(course[key as keyof Course] ?? (key === "requireAllLessons" || key === "requireFinalAssessment"))} onChange={() => toggle(key as keyof Course)} />{label}</label>)}</div>
      {course.certificateEnabled ? <div className="mt-4 rounded-md border border-border p-5 text-center"><p className="text-xs uppercase text-muted-foreground">GridGuard Learning</p><p className="mt-2 text-xl font-semibold">{course.certificateName ?? "NERC CIP Training Completion"}</p><p className="text-sm text-muted-foreground">Certificate preview</p></div> : null}
    </Panel>
  );
}

function ReviewTab({ course, openRequest }: { course: Course; openRequest: () => void }) {
  const { data, user, service, refresh, toast } = useApp();
  const review = latestReviewForCourse(data, course.id);
  const canReview = canReviewCourse(data, user.id, course.id);
  if (!review) return <Panel><EmptyState title="No review has been requested" body="Send this course to reviewers when readiness checks pass." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={openRequest}>Request Review</button>} /></Panel>;
  const comments = data.reviewComments.filter((item) => item.reviewId === review.id);
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Review status</h2><p className="text-sm text-muted-foreground">Due {format(new Date(review.dueAt), "MMM d, yyyy")}</p></div><StatusBadge status={review.status === "APPROVED" ? "APPROVED" : review.status === "CHANGES_REQUESTED" ? "CHANGES_REQUESTED" : "IN_REVIEW"} /></div>
        {course.status === "CHANGES_REQUESTED" ? <div className="mt-3"><InlineAlert tone="danger">Changes requested. Resolve the required comments, then resubmit the course.</InlineAlert></div> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {canReview ? <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={async () => { const body = window.prompt("Review comment", "Add a stronger evidence example."); if (body) { await service().addReviewComment(review.id, body, "BLOCKING"); await refresh(); toast("Comment added"); } }}>Add Comment</button> : null}
          {canReview ? <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={async () => { await service().requestChanges(review.id, "Resolve required review comments before publication."); await refresh(); toast("Changes requested"); }}>Request Changes</button> : null}
          {canReview ? <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={async () => { await service().approveCourseReview(review.id); await refresh(); toast("Course approved"); }}>Approve</button> : null}
          {course.status === "CHANGES_REQUESTED" ? <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={async () => { await service().resubmitCourseReview(course.id); await refresh(); toast("Course resubmitted"); }}>Resubmit for Review</button> : null}
        </div>
      </Panel>
      <Panel>
        <h2 className="font-semibold">Reviewer comments</h2>
        <div className="mt-3 space-y-2">{comments.map((comment) => <div key={comment.id} className="rounded-md border border-border p-3 text-sm"><div className="flex flex-wrap items-center gap-2"><MessageSquare size={16} /><span className="font-medium">{data.users.find((item) => item.id === comment.authorId)?.name}</span><span className="text-xs text-muted-foreground">{comment.location ?? "Course Overview"}</span><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{comment.severity ?? (comment.blocking ? "BLOCKING" : "SUGGESTION")}</span></div><p className="mt-2">{comment.body}</p><div className="mt-2 flex gap-2"><StatusBadge status={comment.status === "RESOLVED" ? "APPROVED" : "CHANGES_REQUESTED"} /><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { await service().resolveReviewComment(comment.id, "Resolved by course manager."); await refresh(); }}>Mark Resolved</button></div></div>)}</div>
      </Panel>
    </div>
  );
}

function latestReviewForCourse(data: AppData, courseId: string): Review | undefined {
  const versionIds = data.courseVersions.filter((version) => version.courseId === courseId).map((version) => version.id);
  return data.reviews.filter((review) => versionIds.includes(review.courseVersionId)).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
}

function RequestReviewDialog({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data, service, refresh, toast } = useApp();
  const reviewers = data.users.filter((user) => hasAnyRole(data, user.id, ["REVIEWER", "COMPLIANCE_MANAGER"]));
  const [reviewerIds, setReviewerIds] = useState<string[]>(reviewers[0] ? [reviewers[0].id] : []);
  const [dueAt, setDueAt] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [message, setMessage] = useState("Please review this course for publication readiness.");
  const readiness = calculateCourseReadiness(data, course.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md bg-white p-5 shadow-xl dark:bg-slate-950">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Request Course Review</h2><button onClick={onClose} aria-label="Close"><X /></button></div>
        {readiness.blockingIssues.length ? <div className="mt-4"><InlineAlert tone="danger">Course isn't ready for review. {readiness.blockingIssues.map((issue) => issue.message).join(" ")}</InlineAlert></div> : null}
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">{reviewers.map((reviewer) => <label key={reviewer.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"><input type="checkbox" checked={reviewerIds.includes(reviewer.id)} onChange={(event) => setReviewerIds(event.target.checked ? [...reviewerIds, reviewer.id] : reviewerIds.filter((idValue) => idValue !== reviewer.id))} />{reviewer.name}</label>)}</div>
          <label className="block text-sm font-medium">Review due date<input className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
          <label className="block text-sm font-medium">Message<textarea className="mt-1 min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={readiness.blockingIssues.length > 0 || !reviewerIds.length} onClick={async () => { await service().requestCourseReview(course.id, reviewerIds, new Date(dueAt).toISOString(), message, false); await refresh(); toast("Review requested"); onClose(); }}>Send for Review</button>
        </div>
      </div>
    </div>
  );
}

function PublishDialog({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data, service, refresh, toast } = useApp();
  const [schedule, setSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("Initial approved release for annual NERC CIP training.");
  const [published, setPublished] = useState(false);
  const readiness = calculateCourseReadiness(data, course.id);
  if (published) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-md bg-white p-6 text-center shadow-xl dark:bg-slate-950"><CheckCircle2 className="mx-auto text-emerald-600" size={44} /><h2 className="mt-3 text-xl font-semibold">Course Published</h2><p className="mt-2 text-sm text-muted-foreground">{course.title} version 1.0 is now published.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/build/courses/${course.id}/assign`}>Assign Learners</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${course.id}`}>View Published Course</Link><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={onClose}>Return to Course</button></div></div></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md bg-white p-5 shadow-xl dark:bg-slate-950">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Publish Course</h2><button onClick={onClose} aria-label="Close"><X /></button></div>
        <div className="mt-4 space-y-2">{readiness.checks.map((check) => <div key={check.label} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">{check.severity === "READY" ? <CheckCircle2 className="text-emerald-600" size={16} /> : <AlertTriangle className="text-amber-600" size={16} />}<span>{check.category} — {check.message}</span></div>)}</div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!schedule} onChange={() => setSchedule(false)} />Publish Now</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={schedule} onChange={() => setSchedule(true)} />Schedule Publication</label>
          {schedule ? <input className="h-10 w-full rounded-md border border-border bg-transparent px-3" type="datetime-local" value={publishAt} onChange={(event) => setPublishAt(event.target.value)} /> : null}
          <label className="block text-sm font-medium">Version notes<textarea className="mt-1 min-h-24 w-full rounded-md border border-border bg-transparent px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={readiness.blockingIssues.length > 0 || !notes.trim()} onClick={async () => { if (!confirm("Publish this course? Published versions are preserved as historical snapshots.")) return; await service().publishCourse(course.id, { scheduledPublishAt: schedule ? new Date(publishAt).toISOString() : undefined, versionNotes: notes, showInCatalog: true, allowSelfEnrollment: course.allowSelfEnrollment, certificateEnabled: course.certificateEnabled }); await refresh(); toast(schedule ? "Course scheduled" : "Course published"); setPublished(true); }}>{schedule ? "Schedule Version 1.0" : "Publish Version 1.0"}</button>
        </div>
      </div>
    </div>
  );
}

function AssignmentsTab({ course }: { course: Course }) {
  const { data } = useApp();
  const assignments = data.assignments.filter((item) => item.targetType === "COURSE" && item.targetId === course.id);
  return <Panel><div className="flex items-center justify-between"><h2 className="font-semibold">Assignments</h2><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/build/courses/${course.id}/assign`}>Assign Training</Link></div><div className="mt-4 space-y-2">{assignments.map((assignment) => <div key={assignment.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{assignment.title}</p><p className="text-muted-foreground">Due {format(new Date(assignment.dueAt), "MMM d, yyyy")} · {assignment.recurrence}</p></div>)}</div>{!assignments.length ? <div className="mt-4"><EmptyState title="No assignments yet" body="Publish and assign this course to begin tracking learner progress." /></div> : null}</Panel>;
}

function AnalyticsTab({ course }: { course: Course }) {
  const { data, service, refresh, toast } = useApp();
  if (course.status !== "PUBLISHED") return <Panel><EmptyState title="Analytics begin after learners are assigned" body="Publish this course and create an assignment to monitor progress." /></Panel>;
  const enrollments = data.enrollments.filter((item) => item.courseId === course.id);
  const statusCounts = ["COMPLETED", "IN_PROGRESS", "NOT_STARTED", "OVERDUE"].map((status) => ({ name: status.replaceAll("_", " "), value: enrollments.filter((item) => item.status === status).length }));
  const attempts = data.assessmentAttempts.filter((item) => item.courseId === course.id);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6"><StatMini label="Assigned" value={enrollments.length} /><StatMini label="Started" value={enrollments.filter((item) => item.status === "IN_PROGRESS").length} /><StatMini label="Completed" value={enrollments.filter((item) => item.status === "COMPLETED").length} /><StatMini label="Overdue" value={enrollments.filter((item) => item.status === "OVERDUE").length} /><StatMini label="Average Score" value={attempts.length ? `${Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)}%` : "N/A"} /><StatMini label="Completion Rate" value={`${completionRate(data, [course.id])}%`} /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel><h2 className="font-semibold">Completion Status</h2><div className="h-64"><ResponsiveContainer><PieChart><Pie data={statusCounts} dataKey="value" nameKey="name" outerRadius={90}>{statusCounts.map((entry, index) => <Cell key={entry.name} fill={["#059669", "#0891b2", "#64748b", "#dc2626"][index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></Panel>
        <Panel><h2 className="font-semibold">Assessment Performance</h2><div className="h-64"><ResponsiveContainer><BarChart data={attempts.map((attempt) => ({ name: `Attempt ${attempt.attemptNumber}`, score: attempt.score }))}><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="score" fill="#0e7490" /></BarChart></ResponsiveContainer></div></Panel>
      </div>
      <Panel><h2 className="font-semibold">Learner Progress</h2><div className="mt-3 overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="border-b border-border text-xs uppercase text-muted-foreground"><tr><th className="py-2">Learner</th><th>Team</th><th>Status</th><th>Progress</th><th>Assessment</th><th>Due</th><th>Actions</th></tr></thead><tbody>{enrollments.map((enrollment) => { const learner = data.users.find((item) => item.id === enrollment.userId); const team = data.teams.find((item) => item.id === learner?.teamId); const progress = data.courseProgress.find((item) => item.userId === enrollment.userId && item.courseId === course.id); const assignment = data.assignments.find((item) => item.id === enrollment.assignmentId); const attempt = data.assessmentAttempts.filter((item) => item.userId === enrollment.userId && item.courseId === course.id).at(-1); return <tr key={enrollment.id} className="border-b border-border"><td className="py-2">{learner?.name}</td><td>{team?.name}</td><td>{enrollment.status.replaceAll("_", " ")}</td><td className="min-w-40"><ProgressBar value={progress?.percentComplete ?? 0} /></td><td>{attempt ? `${attempt.score}%` : "Not attempted"}</td><td>{assignment ? format(new Date(assignment.dueAt), "MMM d") : "None"}</td><td><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={async () => { if (learner) { await service().sendLearnerReminder(course.id, learner.id); await refresh(); toast("Reminder sent"); } }}>Send Reminder</button></td></tr>; })}</tbody></table></div></Panel>
    </div>
  );
}

function ActivityTab({ course }: { course: Course }) {
  const { data } = useApp();
  const events = data.activityTimeline.filter((item) => item.objectId === course.id || (item.objectType === "Course" && item.objectId === course.id)).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return <Panel><h2 className="font-semibold">Course Activity</h2><div className="mt-3 space-y-2">{events.map((event) => <div key={event.id} className="flex gap-3 rounded-md border border-border p-3 text-sm"><History size={16} className="mt-0.5 text-muted-foreground" /><div><p>{event.summary}</p><p className="text-xs text-muted-foreground">{event.action} · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</p></div></div>)}</div>{!events.length ? <EmptyState title="No activity yet" body="Course lifecycle activity will appear here." /> : null}</Panel>;
}

function exportCourse(data: AppData, courseId: string) {
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return;
  const versionIds = data.courseVersions.filter((item) => item.courseId === courseId).map((item) => item.id);
  const lessonIds = data.lessons.filter((item) => versionIds.includes(item.courseVersionId)).map((item) => item.id);
  const assessmentIds = data.assessments.filter((item) => item.courseVersionId && versionIds.includes(item.courseVersionId)).map((item) => item.id);
  const payload = {
    course,
    versions: data.courseVersions.filter((item) => item.courseId === courseId),
    modules: data.modules.filter((item) => versionIds.includes(item.courseVersionId)),
    lessons: data.lessons.filter((item) => versionIds.includes(item.courseVersionId)),
    contentBlocks: data.contentBlocks.filter((item) => lessonIds.includes(item.lessonId)),
    assessments: data.assessments.filter((item) => item.courseVersionId && versionIds.includes(item.courseVersionId)),
    assessmentQuestions: data.assessmentQuestions.filter((item) => assessmentIds.includes(item.assessmentId)),
    questions: data.questions,
    mappings: data.courseStandardMappings.filter((item) => item.courseId === courseId),
    access: data.courseAccessGrants.filter((item) => item.courseId === courseId)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${course.slug}-course-export.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function downloadBlob(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AssignmentWizard() {
  const { data, service, refresh, toast } = useApp();
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const course = data.courses.find((item) => item.id === courseId);
  const [step, setStep] = useState(1);
  const [audiences, setAudiences] = useState<Array<{ audienceType: "TEAM" | "GROUP" | "USER" | "ROLE"; audienceId: string; label: string }>>([]);
  const [dueOption, setDueOption] = useState("30");
  const [recurrence, setRecurrence] = useState<"NONE" | "ANNUAL">("NONE");
  const [notifyLearners, setNotifyLearners] = useState(true);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  if (!course) return <Panel>Course not found.</Panel>;
  const learnerCount = resolveLearnerCount(data, audiences);
  const dueAt = dueOption === "none" ? addDays(new Date(), 3650) : addDays(new Date(), Number(dueOption));
  const assign = async () => {
    await service().createAssignment(course.id, audiences.map(({ audienceType, audienceId }) => ({ audienceType, audienceId })), dueAt.toISOString(), recurrence, { notifyLearners, reminder7: true, reminder3: true, dueDate: true, managerOverdue: true });
    await refresh();
    toast("Training assigned");
    setAssignedCount(learnerCount);
  };
  if (assignedCount !== null) {
    return (
      <Panel className="mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={46} />
        <h1 className="mt-3 text-2xl font-semibold">Training Assigned</h1>
        <p className="mt-2 text-sm text-muted-foreground">{course.title} has been assigned to {assignedCount} learner{assignedCount === 1 ? "" : "s"}.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/build/courses/${course.id}?tab=analytics`}>Monitor Progress</Link>
          <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => { setAssignedCount(null); setStep(1); }}>Assign More Learners</button>
          <Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/build/courses/${course.id}`}>Return to Course</Link>
        </div>
      </Panel>
    );
  }
  return (
    <div className="space-y-5">
      <div><Breadcrumbs items={[{ label: "Course Management", href: "/build" }, { label: course.title, href: `/build/courses/${course.id}` }, { label: "Assign Training" }]} /><h1 className="text-2xl font-semibold">Assign Training</h1></div>
      <Panel><div className="grid gap-2 md:grid-cols-4">{["Audience", "Schedule", "Notifications", "Review"].map((label, index) => <button key={label} className={`rounded-md border px-3 py-2 text-sm ${step === index + 1 ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => setStep(index + 1)}>{index + 1} {label}</button>)}</div></Panel>
      {step === 1 ? <Panel><h2 className="font-semibold">Audience</h2><AudiencePicker data={data} selected={audiences} onChange={setAudiences} /><p className="mt-3 text-sm text-muted-foreground">{learnerCount} unique learners selected.</p></Panel> : null}
      {step === 2 ? <Panel><h2 className="font-semibold">Schedule</h2><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Due<select className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" value={dueOption} onChange={(event) => setDueOption(event.target.value)}>{["7", "14", "30", "60", "90", "none"].map((item) => <option key={item} value={item}>{item === "none" ? "No due date" : `${item} days`}</option>)}</select></label><label className="text-sm font-medium">Recurring<select className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" value={recurrence} onChange={(event) => setRecurrence(event.target.value as "NONE" | "ANNUAL")}><option value="NONE">None</option><option value="ANNUAL">Annual</option></select></label></div></Panel> : null}
      {step === 3 ? <Panel><h2 className="font-semibold">Notifications</h2><label className="mt-3 flex items-center gap-2 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={notifyLearners} onChange={(event) => setNotifyLearners(event.target.checked)} />Notify learners on assignment</label></Panel> : null}
      {step === 4 ? <Panel><h2 className="font-semibold">Review</h2><div className="mt-3 grid gap-3 md:grid-cols-2"><Info label="Course" value={course.title} /><Info label="Audience" value={audiences.map((item) => item.label).join(", ") || "None"} /><Info label="Unique learners" value={String(learnerCount)} /><Info label="Due date" value={format(dueAt, "MMM d, yyyy")} /></div><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!audiences.length} onClick={assign}>Assign Training</button></Panel> : null}
      <div className="flex justify-end gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Back</button><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" disabled={step === 4} onClick={() => setStep((value) => value + 1)}>Continue</button></div>
    </div>
  );
}

function AudiencePicker({ data, selected, onChange }: { data: AppData; selected: Array<{ audienceType: "TEAM" | "GROUP" | "USER" | "ROLE"; audienceId: string; label: string }>; onChange: (items: Array<{ audienceType: "TEAM" | "GROUP" | "USER" | "ROLE"; audienceId: string; label: string }>) => void }) {
  return <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{[
    ...data.teams.map((item) => ({ audienceType: "TEAM" as const, audienceId: item.id, label: item.name })),
    ...data.groups.map((item) => ({ audienceType: "GROUP" as const, audienceId: item.id, label: item.name })),
    ...data.users.map((item) => ({ audienceType: "USER" as const, audienceId: item.id, label: item.name }))
  ].map((item) => { const checked = selected.some((selectedItem) => selectedItem.audienceType === item.audienceType && selectedItem.audienceId === item.audienceId); return <label key={`${item.audienceType}-${item.audienceId}`} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? [...selected, item] : selected.filter((selectedItem) => !(selectedItem.audienceType === item.audienceType && selectedItem.audienceId === item.audienceId)))} />{item.label} — {item.audienceType}</label>; })}</div>;
}

function resolveLearnerCount(data: AppData, audiences: Array<{ audienceType: "TEAM" | "GROUP" | "USER" | "ROLE"; audienceId: string }>) {
  const ids = new Set<string>();
  audiences.forEach((audience) => {
    if (audience.audienceType === "USER") ids.add(audience.audienceId);
    if (audience.audienceType === "TEAM") data.teamMembers.filter((member) => member.teamId === audience.audienceId).forEach((member) => ids.add(member.userId));
    if (audience.audienceType === "GROUP") data.groupMembers.filter((member) => member.groupId === audience.audienceId).forEach((member) => ids.add(member.userId));
    if (audience.audienceType === "ROLE") data.userRoles.filter((role) => role.role === audience.audienceId).forEach((role) => ids.add(role.userId));
  });
  return [...ids].filter((idValue) => data.userRoles.some((role) => role.userId === idValue && role.role === "LEARNER")).length;
}
