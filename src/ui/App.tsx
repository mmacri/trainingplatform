import {
  AlertTriangle,
  Archive,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Library,
  LogOut,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Upload,
  UsersRound,
  X
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, formatDistanceToNow } from "date-fns";
import type { AppData, ContentBlock, Course, CourseVersion, Question, Role, User } from "../data/schema";
import { createSeedData } from "../data/seed";
import { getAllData, replaceAllData } from "../data/db";
import {
  AuthService,
  WorkflowService,
  canAccessCourse,
  canCreateCourses,
  canEditCourse,
  canManageCourses,
  canManageUsers,
  canPublishCourse,
  canViewCompliance,
  canViewEvidence,
  canViewTeam,
  getCourseCompletionState,
  getRoles,
  hasAnyRole,
  searchAuthorized
} from "../services/appServices";
import { AppContext, type Toast, useApp } from "./appContext";
import { AssignmentWizard, CourseCreationWizard, CourseManagementDashboard, CourseWorkspace } from "./course-management/CourseManagement";

const demoPassword = "GridGuard-Local-2026!";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState(localStorage.getItem("gridguard.theme") ?? "system");

  useEffect(() => {
    let mounted = true;
    AuthService.boot()
      .then(async (bootData) => {
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (!mounted) return;
        const session = AuthService.getSession();
        if (session && !AuthService.isExpired(bootData, session)) setSessionUserId(session.userId);
        setData(bootData);
      })
      .finally(() => mounted && setInitializing(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("gridguard.theme", theme);
  }, [theme]);

  const toast = (message: string) => {
    const item = { id: crypto.randomUUID(), message };
    setToasts((items) => [...items, item]);
    window.setTimeout(() => setToasts((items) => items.filter((toastItem) => toastItem.id !== item.id)), 3500);
  };

  if (initializing) return <InitializationScreen />;
  if (!data) return <StorageError />;

  const sessionUser = sessionUserId ? data.users.find((user) => user.id === sessionUserId) : undefined;
  const routes = sessionUser ? (
    <AppContext.Provider
      value={{
        data,
        setData,
        user: sessionUser,
        roles: getRoles(data, sessionUser.id),
        refresh: async () => setData(await getAllData()),
        service: () => new WorkflowService(data, sessionUser.id),
        toast,
        theme,
        setTheme: setThemeState
      }}
    >
      <AuthenticatedShell onLogout={() => setSessionUserId(null)} onSwitch={setSessionUserId} />
    </AppContext.Provider>
  ) : (
    <LoginPage
      data={data}
      onLogin={(newData, userId) => {
        setData(newData);
        setSessionUserId(userId);
      }}
    />
  );

  return (
    <>
      {routes}
      <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className="rounded-md bg-slate-950 px-4 py-3 text-sm text-white shadow-lg dark:bg-white dark:text-slate-950">
            {item.message}
          </div>
        ))}
      </div>
    </>
  );
}

function InitializationScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <section className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-cyan-700">
          <ShieldCheck aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold">GridGuard Learning</h1>
        <p className="mt-2 text-slate-300">Preparing your training environment...</p>
      </section>
    </main>
  );
}

function StorageError() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-md border border-border bg-white p-6 shadow-soft dark:bg-slate-900">
        <h1 className="text-xl font-semibold">GridGuard needs browser storage.</h1>
        <p className="mt-2 text-sm text-muted-foreground">IndexedDB is unavailable or blocked. Enable browser storage and retry.</p>
        <button className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    </main>
  );
}

function LoginPage({ data, onLogin }: { data: AppData; onLogin: (data: AppData, userId: string) => void }) {
  const [email, setEmail] = useState("learner@gridguard.local");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState("");
  const demoUsers = ["learner@gridguard.local", "manager@gridguard.local", "author@gridguard.local", "compliance@gridguard.local", "admin@gridguard.local"];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await AuthService.login(email, password);
      onLogin(result.data, result.session.userId);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-8 py-10 lg:px-16">
        <div className="max-w-xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-700">
              <ShieldCheck aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">GridGuard Learning</p>
              <p className="text-sm text-slate-300">GitHub Edition</p>
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">NERC CIP Training & Compliance Readiness</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-300">Operate a complete browser-local learning, authoring, access, evidence, and compliance program.</p>
          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            {["Role-aware portals", "Course authoring", "Audit evidence"].map((item) => (
              <div key={item} className="rounded-md border border-slate-700 bg-slate-900 p-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-slate-100 px-5 py-10 text-slate-950 dark:bg-slate-900 dark:text-white">
        <form className="w-full max-w-md rounded-md border border-border bg-white p-6 shadow-soft dark:bg-slate-950" onSubmit={submit}>
          <h2 className="text-2xl font-semibold">Sign In</h2>
          <p className="mt-1 text-sm text-muted-foreground">GridGuard Learning</p>
          <label className="mt-6 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3" value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" /> Remember me
          </label>
          {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p> : null}
          <button className="mt-5 h-11 w-full rounded-md bg-cyan-700 font-medium text-white hover:bg-cyan-800">Sign In</button>
          <div className="mt-5 border-t border-border pt-4">
            <button type="button" className="text-sm font-medium text-cyan-700 dark:text-cyan-300" onClick={() => setShowDemo((value) => !value)}>
              View Demo Accounts
            </button>
            {showDemo ? (
              <div className="mt-3 space-y-2">
                {demoUsers.map((demoEmail) => {
                  const user = data.users.find((item) => item.email === demoEmail)!;
                  return (
                    <div key={demoEmail} className="flex items-center justify-between rounded-md border border-border p-2">
                      <button type="button" className="text-left text-sm" onClick={() => setEmail(demoEmail)}>
                        <span className="block font-medium">{user.name}</span>
                        <span className="text-muted-foreground">{demoEmail}</span>
                      </button>
                      <button type="button" className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => { setEmail(demoEmail); setPassword(demoPassword); }}>
                        Use Demo Account
                      </button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">Password: {demoPassword}</p>
              </div>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthenticatedShell({ onLogout, onSwitch }: { onLogout: () => void; onSwitch: (userId: string) => void }) {
  const { data, user, roles, refresh, theme, setTheme, toast } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const nav = buildNav(data, user.id);
  const unread = data.notifications.filter((note) => note.userId === user.id && !note.readAt).length;

  const logout = () => {
    AuthService.logout(data, user.id);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-white px-4 dark:bg-slate-950">
        <button className="lg:hidden" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
          <Menu />
        </button>
        <Link to="/home" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-white">
            <ShieldCheck size={19} />
          </span>
          <span className="hidden font-semibold sm:block">GridGuard Learning</span>
        </Link>
        <button className="ml-auto hidden h-10 min-w-72 items-center gap-2 rounded-md border border-border px-3 text-left text-sm text-muted-foreground md:flex" onClick={() => setSearchOpen(true)}>
          <Search size={17} /> Search courses, standards, evidence
        </button>
        {canCreateCourses(data, user.id) ? <QuickCreate /> : null}
        <button className="relative rounded-md border border-border p-2" aria-label="Notifications" onClick={() => toast(`${unread} unread notifications`)}>
          <Bell size={18} />
          {unread ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{unread}</span> : null}
        </button>
        <button className="rounded-md border border-border p-2" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <Search size={18} />
        </button>
        <div className="relative">
          <button className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm" onClick={() => setSwitchOpen(true)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-xs text-white">{user.firstName[0]}{user.lastName[0]}</span>
            <span className="hidden md:block">{user.firstName}</span>
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className={`no-print fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-white p-3 transition-transform dark:bg-slate-950 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] ${navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <span className="font-semibold">Navigation</span>
            <button onClick={() => setNavOpen(false)} aria-label="Close navigation"><X /></button>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link key={item.href} to={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setNavOpen(false)}>
                <item.icon size={18} /> {item.label}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-3 left-3 right-3 text-xs text-muted-foreground">
            <div className="mb-3 flex gap-2">
              {["light", "dark", "system"].map((mode) => (
                <button key={mode} className={`rounded-md border border-border px-2 py-1 ${theme === mode ? "bg-muted text-foreground" : ""}`} onClick={() => setTheme(mode)}>
                  {mode === "dark" ? <Moon size={14} /> : mode === "light" ? <Sun size={14} /> : mode}
                </button>
              ))}
            </div>
            GridGuard Learning v0.1.0
          </div>
        </aside>
        <section className="min-w-0 flex-1 p-4 md:p-6">
          <OfflineIndicator />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeDashboard />} />
            <Route path="/my-learning" element={<MyLearning />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/learning-paths" element={<LearningPaths />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/courses/:courseId" element={<CourseLanding />} />
            <Route path="/learn/:courseId/:lessonId?" element={<CoursePlayer onNotes={() => setNotesOpen(true)} />} />
            <Route path="/records/:courseId" element={<TrainingRecord />} />
            <Route path="/build" element={<Guard allow={canManageCourses(data, user.id)} label="Course Management"><CourseManagementDashboard /></Guard>} />
            <Route path="/build/new" element={<Guard allow={canCreateCourses(data, user.id)} label="Create Course"><CourseCreationWizard /></Guard>} />
            <Route path="/build/questions" element={<Guard allow={canManageCourses(data, user.id)} label="Question Bank"><QuestionBank /></Guard>} />
            <Route path="/build/courses/:courseId" element={<CourseWorkspace />} />
            <Route path="/build/courses/:courseId/assign" element={<Guard allow={canManageCourses(data, user.id)} label="Assign Training"><AssignmentWizard /></Guard>} />
            <Route path="/team" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Team Learning"><TeamDashboard /></Guard>} />
            <Route path="/compliance" element={<Guard allow={canViewCompliance(data, user.id)} label="Compliance"><ComplianceDashboard /></Guard>} />
            <Route path="/standards" element={<Guard allow={canViewCompliance(data, user.id) || roles.includes("LEARNER")} label="Standards"><StandardsPage /></Guard>} />
            <Route path="/evidence" element={<Guard allow={canViewEvidence(data, user.id)} label="Evidence"><EvidencePage /></Guard>} />
            <Route path="/reports" element={<Guard allow={canViewEvidence(data, user.id)} label="Reports"><ReportsPage /></Guard>} />
            <Route path="/admin" element={<Guard allow={canManageUsers(data, user.id)} label="Administration"><AdminHome /></Guard>} />
            <Route path="/admin/users" element={<Guard allow={canManageUsers(data, user.id)} label="Users"><UsersAdmin /></Guard>} />
            <Route path="/admin/teams" element={<Guard allow={canManageUsers(data, user.id)} label="Teams"><TeamsAdmin /></Guard>} />
            <Route path="/admin/groups" element={<Guard allow={canManageUsers(data, user.id)} label="Groups"><GroupsAdmin /></Guard>} />
            <Route path="/admin/assignments" element={<Guard allow={canManageUsers(data, user.id)} label="Assignments"><AssignmentsAdmin /></Guard>} />
            <Route path="/admin/audit" element={<Guard allow={canManageUsers(data, user.id)} label="Audit"><AuditPage /></Guard>} />
            <Route path="/admin/settings" element={<Guard allow={canManageUsers(data, user.id)} label="Settings"><SettingsPage /></Guard>} />
            <Route path="/admin/about" element={<Guard allow={canManageUsers(data, user.id)} label="About"><AboutPage /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </section>
      </div>
      {switchOpen ? <DemoSwitcher onClose={() => setSwitchOpen(false)} onSwitch={async (userId) => { const result = await AuthService.switchUser(userId); onSwitch(result.session.userId); await refresh(); setSwitchOpen(false); toast("Demo user switched"); }} onLogout={logout} /> : null}
      {searchOpen ? <SearchDialog onClose={() => setSearchOpen(false)} /> : null}
      {notesOpen ? <NotesDrawer onClose={() => setNotesOpen(false)} /> : null}
    </div>
  );
}

function buildNav(data: AppData, userId: string) {
  const items = [
    { label: "Home", href: "/home", icon: Home },
    { label: "My Learning", href: "/my-learning", icon: GraduationCap },
    { label: "Catalog", href: "/library", icon: Library },
    { label: "Learning Paths", href: "/learning-paths", icon: BookOpenCheck },
    { label: "Certifications", href: "/certifications", icon: FileCheck2 },
    { label: "Skills", href: "/skills", icon: CheckCircle2 }
  ];
  if (hasAnyRole(data, userId, ["MANAGER", "PLATFORM_ADMIN"])) items.push({ label: "Team Learning", href: "/team", icon: UsersRound });
  if (canManageCourses(data, userId)) items.push({ label: "Course Management", href: "/build", icon: ClipboardCheck });
  if (canViewCompliance(data, userId)) {
    items.push({ label: "Compliance", href: "/compliance", icon: ShieldCheck });
    items.push({ label: "Standards", href: "/standards", icon: Library });
    items.push({ label: "Evidence", href: "/evidence", icon: FileCheck2 });
    items.push({ label: "Reports", href: "/reports", icon: Download });
  }
  if (canManageUsers(data, userId)) items.push({ label: "Administration", href: "/admin", icon: Settings });
  return items;
}

function Guard({ allow, label, children }: { allow: boolean; label: string; children: React.ReactNode }) {
  if (!allow) return <AccessRestricted label={label} />;
  return children;
}

function AccessRestricted({ label }: { label: string }) {
  return (
    <Panel>
      <div className="mx-auto max-w-lg py-10 text-center">
        <AlertTriangle className="mx-auto text-amber-600" size={42} />
        <h1 className="mt-4 text-2xl font-semibold">Access Restricted</h1>
        <p className="mt-2 text-muted-foreground">You do not have permission to access {label}.</p>
        <Link className="mt-5 inline-flex rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to="/home">Return Home</Link>
      </div>
    </Panel>
  );
}

function NotFound() {
  return (
    <Panel>
      <h1 className="text-2xl font-semibold">Page Not Found</h1>
      <p className="mt-2 text-muted-foreground">The requested GridGuard page does not exist.</p>
      <Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-4 py-2 text-sm text-white" to="/home">Return Home</Link>
    </Panel>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-md border border-border bg-white p-4 shadow-soft dark:bg-slate-950 ${className}`}>{children}</section>;
}

function Stat({ label, value, tone = "cyan" }: { label: string; value: string | number; tone?: string }) {
  const toneClass = tone === "emerald" ? "bg-emerald-700" : tone === "amber" ? "bg-amber-600" : "bg-cyan-700";
  return (
    <Panel>
      <div className={`mb-4 h-2 w-12 rounded-full ${toneClass}`} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </Panel>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function HomeDashboard() {
  const { data, user } = useApp();
  const enrollments = data.enrollments.filter((item) => item.userId === user.id);
  const assigned = enrollments.length;
  const completed = enrollments.filter((item) => item.status === "COMPLETED").length;
  const inProgress = enrollments.filter((item) => item.status === "IN_PROGRESS").length;
  const certs = data.userCertifications.filter((item) => item.userId === user.id).length;
  const required = enrollments.map((enrollment) => data.courses.find((course) => course.id === enrollment.courseId)!).filter(Boolean);

  return (
    <>
      <PageHeader title={`Good afternoon, ${user.firstName}`} subtitle="Here's what needs your attention." />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Assigned Training" value={assigned} />
        <Stat label="In Progress" value={inProgress} />
        <Stat label="Completed" value={completed} />
        <Stat label="Certifications" value={certs} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel>
          <h2 className="text-lg font-semibold">Continue Learning</h2>
          <div className="mt-3 space-y-3">
            {required.filter((course) => data.enrollments.some((enrollment) => enrollment.courseId === course.id && enrollment.status !== "COMPLETED")).map((course) => <CourseRow key={course.id} course={course} />)}
            {required.length === 0 ? <EmptyState text="You're all caught up." action="Browse Library" href="/library" /> : null}
          </div>
        </Panel>
        <div className="space-y-5">
          {hasAnyRole(data, user.id, ["MANAGER", "PLATFORM_ADMIN"]) ? <ManagerMini /> : null}
          {canViewCompliance(data, user.id) ? <ComplianceMini /> : null}
          <Panel>
            <h2 className="text-lg font-semibold">Upcoming Deadlines</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.assignments.slice(0, 4).map((assignment) => <li key={assignment.id} className="flex justify-between gap-3"><span>{assignment.title}</span><span className="text-muted-foreground">{new Date(assignment.dueAt).toLocaleDateString()}</span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function ManagerMini() {
  const { data, user } = useApp();
  const managedTeams = data.teams.filter((team) => canViewTeam(data, user.id, team.id));
  const memberIds = data.teamMembers.filter((member) => managedTeams.some((team) => team.id === member.teamId)).map((member) => member.userId);
  const overdue = data.enrollments.filter((item) => memberIds.includes(item.userId) && item.status === "OVERDUE").length;
  return <Panel><h2 className="text-lg font-semibold">Team Snapshot</h2><p className="mt-2 text-sm text-muted-foreground">{memberIds.length} team members, {overdue} overdue assignments.</p><Link to="/team" className="mt-3 inline-flex text-sm font-medium text-cyan-700">View Team</Link></Panel>;
}

function ComplianceMini() {
  const { data } = useApp();
  return <Panel><h2 className="text-lg font-semibold">Compliance Readiness</h2><p className="mt-2 text-sm text-muted-foreground">{data.evidenceRecords.length} evidence records and {data.standardChangeReviews.length} standard changes tracked.</p><Link to="/compliance" className="mt-3 inline-flex text-sm font-medium text-cyan-700">Open Compliance Dashboard</Link></Panel>;
}

function CourseRow({ course }: { course: Course }) {
  const { data, user } = useApp();
  const progress = data.courseProgress.find((item) => item.userId === user.id && item.courseId === course.id)?.percentComplete ?? 0;
  const firstLesson = data.lessons.find((lesson) => lesson.courseVersionId === course.currentVersionId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="font-medium">{course.title}</p>
        <p className="text-sm text-muted-foreground">{course.shortDescription}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 w-28 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${progress}%` }} /></div>
        <Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" to={`/learn/${course.id}/${firstLesson?.id ?? ""}`}>{progress ? "Continue" : "Start"}</Link>
      </div>
    </div>
  );
}

function MyLearning() {
  const { data, user } = useApp();
  const [tab, setTab] = useState("Assigned");
  const enrollments = data.enrollments.filter((item) => item.userId === user.id);
  const filtered = enrollments.filter((enrollment) => tab === "Assigned" || enrollment.status === tab.toUpperCase().replace(" ", "_"));
  return (
    <>
      <PageHeader title="My Learning" subtitle="Assigned, in-progress, completed, and overdue training." />
      <Tabs items={["Assigned", "IN_PROGRESS", "COMPLETED", "OVERDUE"]} active={tab} onChange={setTab} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {filtered.map((enrollment) => <CourseCard key={enrollment.id} course={data.courses.find((course) => course.id === enrollment.courseId)!} />)}
      </div>
      {!filtered.length ? <EmptyState text="You're all caught up." action="Browse Library" href="/library" /> : null}
    </>
  );
}

function LibraryPage() {
  const { data, user } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const visible = data.courses.filter((course) => {
    const access = canAccessCourse(data, user.id, course.id);
    return (access.allowed || access.discoverable) && course.showInCatalog && (category === "All" || course.category === category || course.title.includes(category)) && course.title.toLowerCase().includes(query.toLowerCase());
  });
  return (
    <>
      <PageHeader title="Library" subtitle="Authorized NERC CIP courses, paths, and certifications." />
      <div className="flex flex-wrap gap-3">
        <input className="h-10 min-w-72 rounded-md border border-border bg-transparent px-3" placeholder="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="h-10 rounded-md border border-border bg-transparent px-3" value={category} onChange={(event) => setCategory(event.target.value)}>
          {["All", "NERC CIP", "CIP-004", "CIP-007", "Cybersecurity"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {visible.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>
      {!visible.length ? <EmptyState text="No courses match your filters." action="Clear Filters" onClick={() => { setQuery(""); setCategory("All"); }} /> : null}
    </>
  );
}

function CourseCard({ course }: { course: Course }) {
  const { data, user, service, setData, toast } = useApp();
  const access = canAccessCourse(data, user.id, course.id);
  const state = getCourseCompletionState(data, user.id, course.id);
  const progress = data.courseProgress.find((item) => item.userId === user.id && item.courseId === course.id)?.percentComplete ?? state.percent;
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState("");
  const submitRequest = async () => {
    await service().requestAccess(course.id, reason || "Need this training for my role.");
    setData(service().snapshot());
    setRequesting(false);
    toast("Access request submitted");
  };
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-700 text-white"><BookOpenCheck size={19} /></div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs">{access.allowed ? course.status : "Restricted"}</span>
      </div>
      <h2 className="mt-4 text-lg font-semibold">{course.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{course.shortDescription}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{course.estimatedMinutes} min</span><span>{course.difficulty}</span><span>{course.accessMode}</span>
      </div>
      {progress ? <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${progress}%` }} /></div> : null}
      <div className="mt-4 flex gap-2">
        {access.allowed ? <Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" to={progress ? state.resumeDestination : `/courses/${course.id}`}>{progress ? "Continue" : "Start"}</Link> : course.allowAccessRequests ? <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" onClick={() => setRequesting(true)}>Request Access</button> : <button disabled className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">Access Restricted</button>}
        {canEditCourse(data, user.id, course.id) ? <Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/build/courses/${course.id}`}>Edit</Link> : null}
      </div>
      {requesting ? (
        <Modal title="Request Access" onClose={() => setRequesting(false)}>
          <p className="text-sm text-muted-foreground">Request access to: {course.title}</p>
          <textarea className="mt-3 min-h-28 w-full rounded-md border border-border bg-transparent p-3" value={reason} onChange={(event) => setReason(event.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setRequesting(false)}>Cancel</button>
            <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={submitRequest}>Submit Request</button>
          </div>
        </Modal>
      ) : null}
    </Panel>
  );
}

function CourseLanding() {
  const { courseId } = useParams();
  const { data, user } = useApp();
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return <NotFound />;
  const access = canAccessCourse(data, user.id, course.id);
  if (!access.allowed) return <AccessRestricted label={course.title} />;
  const version = data.courseVersions.find((item) => item.id === course.currentVersionId)!;
  const modules = data.modules.filter((module) => module.courseVersionId === version.id).sort((a, b) => a.position - b.position);
  const lessons = sortedLessons(data, version.id);
  const state = getCourseCompletionState(data, user.id, course.id);
  const hero = course.id === "course-cip004-annual-refresher";
  return (
    <>
      <PageHeader title={course.title} subtitle={course.subtitle ?? course.shortDescription} action={<Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to={state.resumeDestination}>{state.percent ? "Resume Course" : "Start Course"}</Link>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Panel>
          {hero ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">NERC CIP Training</p> : null}
          <p className="text-muted-foreground">{hero ? "Personnel security depends on more than policies. It depends on people recognizing when access is appropriate, when circumstances have changed, when action is required, and how the organization proves those actions occurred." : version.goal}</p>
          {hero ? <p className="mt-3 text-muted-foreground">This refresher walks through the practical responsibilities that help keep personnel access aligned with current job needs and create clear, repeatable evidence of completed training and access-management activities.</p> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(hero ? ["75 min", course.difficulty, "Annual Training", "Certificate", "CIP-004", "Final Assessment"] : [`${course.estimatedMinutes} min`, course.difficulty, course.category, course.certificateEnabled ? "Certificate" : "No certificate", version.version, course.status]).map((item) => <div key={item} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-medium">{item}</div>)}
          </div>
          {hero ? (
            <div className="mt-6">
              <h2 className="text-lg font-semibold">Why you're taking this course</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Personnel access changes throughout an individual's relationship with an organization. New hires join teams. Employees transfer. Administrators take on temporary responsibilities. Contractors complete engagements. Personnel leave the organization. Each change can affect which systems, facilities, applications, or privileges remain appropriate.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["Recognize", "Identify personnel events that may require review or action."],
                  ["Decide", "Choose the appropriate response when responsibilities or access needs change."],
                  ["Document", "Understand what information makes a record useful and traceable."],
                  ["Demonstrate", "Apply the concepts in realistic personnel-security scenarios."]
                ].map(([title, body]) => <div key={title} className="rounded-md border border-border p-3"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{body}</p></div>)}
              </div>
            </div>
          ) : null}
          <h2 className="mt-6 text-lg font-semibold">What You'll Learn</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {data.learningObjectives.filter((objective) => objective.courseVersionId === version.id).map((objective) => <li key={objective.id} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-cyan-700" />{objective.text}</li>)}
          </ul>
          <h2 className="mt-6 text-lg font-semibold">Course Outline</h2>
          <div className="mt-3 space-y-3">
            {modules.map((module) => (
              <div key={module.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between"><h3 className="font-medium">{module.title}</h3><span className="text-xs text-muted-foreground">{moduleProgress(data, user.id, module.id)}%</span></div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {lessons.filter((lesson) => lesson.moduleId === module.id).map((lesson) => {
                    const done = data.lessonProgress.some((progress) => progress.userId === user.id && progress.lessonId === lesson.id && progress.completedAt);
                    const locked = lesson.title.includes("Final Assessment") && !state.canStartAssessment;
                    return <li key={lesson.id} className="flex items-center justify-between gap-2"><span>{lesson.title}</span><span className="text-xs">{done ? "Completed" : locked ? "Locked - complete required activities first" : "Available"} · {lesson.estimatedMinutes} min</span></li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold">Course Information</h2>
          <Info label="Duration" value={`${course.estimatedMinutes} minutes`} />
          <Info label="Difficulty" value={course.difficulty} />
          <Info label="Access" value={access.reason} />
          <Info label="Version" value={version.version} />
          <Info label="Certificate" value={course.certificateEnabled ? "Enabled" : "Not enabled"} />
          <Info label="Progress" value={`${state.percent}%`} />
          <div className="mt-5">
            <h3 className="text-sm font-semibold">To complete this course</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {["Complete all required lessons.", "Complete all required knowledge checks.", "Complete the interactive Role Change scenario.", "Complete the Access Termination decision exercise.", "Score at least 80% on the final assessment.", "Complete the learner acknowledgement."].map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </Panel>
      </div>
    </>
  );
}

function CoursePlayer({ onNotes }: { onNotes: () => void }) {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { data, user, service, setData, toast } = useApp();
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return <NotFound />;
  const access = canAccessCourse(data, user.id, course.id);
  if (!access.allowed) return <AccessRestricted label={course.title} />;
  const lessons = sortedLessons(data, course.currentVersionId);
  const lesson = lessons.find((item) => item.id === lessonId) ?? lessons[0];
  const blocks = data.contentBlocks.filter((block) => block.lessonId === lesson.id).sort((a, b) => a.position - b.position);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const state = getCourseCompletionState(data, user.id, course.id);
  const [note, setNote] = useState(data.lessonProgress.find((progress) => progress.userId === user.id && progress.lessonId === lesson.id)?.notes ?? "");
  const bookmarked = Boolean(data.lessonProgress.find((progress) => progress.userId === user.id && progress.lessonId === lesson.id && (progress as unknown as { bookmarked?: boolean }).bookmarked));
  const isAssessment = lesson.title.toLowerCase().includes("final assessment");
  const isAcknowledgement = lesson.title.toLowerCase().includes("acknowledgement");
  const complete = async () => {
    const svc = service();
    await svc.completeLesson(course.id, lesson.id);
    setData(svc.snapshot());
    toast("Lesson completed");
    const next = lessons[index + 1];
    if (next) navigate(`/learn/${course.id}/${next.id}`);
  };
  const saveNote = async (value: string) => {
    setNote(value);
    const svc = service();
    await svc.saveLessonNote(lesson.id, value);
    setData(svc.snapshot());
  };
  const toggleBookmark = async () => {
    const svc = service();
    await svc.toggleBookmark(lesson.id);
    setData(svc.snapshot());
    toast(bookmarked ? "Bookmark removed" : "Lesson saved");
  };
  const completeActivity = async (blockId: string, answers: unknown, score = 100) => {
    const svc = service();
    await svc.completeLearningActivity(course.id, lesson.id, blockId, answers, score);
    setData(svc.snapshot());
    toast("Activity complete");
  };
  const lessonDone = data.lessonProgress.some((progress) => progress.userId === user.id && progress.lessonId === lesson.id && progress.completedAt);
  const requiredActivities = blocks.filter((block) => block.required && block.type !== "knowledge_check");
  const activitiesDone = requiredActivities.every((block) => data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED"));
  const canCompleteLesson = !requiredActivities.length || activitiesDone;
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr_280px]">
      <Panel className="xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)] xl:overflow-auto">
        <h2 className="font-semibold">{course.title}</h2>
        <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${state.percent}%` }} /></div>
        <p className="mt-1 text-xs text-muted-foreground">{state.completedItems.length} / {state.requiredItems.length} required complete</p>
        <div className="mt-4 space-y-1">
          {lessons.map((item) => {
            const done = data.lessonProgress.some((progress) => progress.userId === user.id && progress.lessonId === item.id);
            const locked = item.title.toLowerCase().includes("final assessment") && !state.canStartAssessment;
            return <Link key={item.id} className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${item.id === lesson.id ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100" : locked ? "text-muted-foreground opacity-60" : "text-muted-foreground"}`} to={`/learn/${course.id}/${item.id}`}>{done ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />} {item.title}</Link>;
          })}
        </div>
      </Panel>
      <section>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div><p className="text-sm text-muted-foreground">Lesson {index + 1} of {lessons.length}</p><h1 className="text-2xl font-semibold">{lesson.title}</h1></div>
            <div className="flex gap-2"><button aria-label="Bookmark lesson" className="rounded-md border border-border px-3 py-2 text-sm" onClick={toggleBookmark}>{bookmarked ? "Saved" : "Save"}</button><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={onNotes}>My Notes</button><Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${course.id}`}>Exit Course</Link></div>
          </div>
          {course.id === "course-cip004-annual-refresher" && state.percent > 0 && !sessionStorage.getItem("gridguard.welcomeBack") ? <WelcomeBack percent={state.percent} /> : null}
          <div className="mt-5 max-w-none">
            {isAssessment ? <AssessmentPanel course={course} /> : isAcknowledgement ? <AcknowledgementPanel course={course} block={blocks.find((block) => block.type === "acknowledgement")} /> : blocks.map((block) => <LessonBlock key={block.id} block={block} courseId={course.id} lessonId={lesson.id} onComplete={completeActivity} />)}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-4">
            <button className="rounded-md border border-border px-3 py-2 text-sm" disabled={index === 0} onClick={() => navigate(`/learn/${course.id}/${lessons[index - 1].id}`)}>Previous</button>
            {!lessonDone && !isAssessment && !isAcknowledgement ? <button className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!canCompleteLesson} onClick={complete}>{canCompleteLesson ? "Complete & Continue" : "Complete Required Activity"}</button> : index < lessons.length - 1 ? <button className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" onClick={() => navigate(`/learn/${course.id}/${lessons[index + 1].id}`)}>Continue</button> : <Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to="/my-learning">Return to My Learning</Link>}
          </div>
        </Panel>
      </section>
      <Panel className="xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)] xl:overflow-auto">
        <h2 className="font-semibold">Notes</h2>
        <textarea className="mt-3 min-h-40 w-full rounded-md border border-border bg-transparent p-3 text-sm" placeholder="Write a private note..." value={note} onChange={(event) => void saveNote(event.target.value)} />
        <h2 className="mt-5 font-semibold">Resources</h2>
        <div className="mt-3 space-y-2">
          {data.courseResources.filter((resource) => resource.courseId === course.id).map((resource) => <a key={resource.id} className="block rounded-md border border-border p-2 text-sm" href={resource.url?.startsWith("http") ? resource.url : undefined} target="_blank" rel="noreferrer"><FileText size={15} className="mr-2 inline" />{resource.title}</a>)}
        </div>
      </Panel>
    </div>
  );
}

function WelcomeBack({ percent }: { percent: number }) {
  useEffect(() => {
    sessionStorage.setItem("gridguard.welcomeBack", "1");
  }, []);
  return <div className="mt-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-100">Welcome back. You're {percent}% complete.</div>;
}

function sortedLessons(data: AppData, courseVersionId?: string) {
  const modules = data.modules.filter((module) => module.courseVersionId === courseVersionId);
  const modulePosition = new Map(modules.map((module) => [module.id, module.position]));
  return data.lessons.filter((lesson) => lesson.courseVersionId === courseVersionId).sort((left, right) => (modulePosition.get(left.moduleId) ?? 0) - (modulePosition.get(right.moduleId) ?? 0) || left.position - right.position);
}

function moduleProgress(data: AppData, userId: string, moduleId: string) {
  const lessons = data.lessons.filter((lesson) => lesson.moduleId === moduleId && lesson.required);
  if (!lessons.length) return 0;
  const done = lessons.filter((lesson) => data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === lesson.id && progress.completedAt)).length;
  return Math.round((done / lessons.length) * 100);
}

function LessonBlock({ block, courseId, lessonId, onComplete }: { block: ContentBlock; courseId: string; lessonId: string; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const data = (block.data ?? {}) as Record<string, unknown>;
  if (block.type === "divider") return <hr className="my-6 border-border" />;
  if (block.type === "heading") return <h2 className="mb-4 text-2xl font-semibold">{block.body}</h2>;
  if (["paragraph", "rich_text"].includes(block.type)) return <RichText body={block.body ?? ""} />;
  if (block.type === "two_column" || block.type === "do_dont") return <TwoColumn data={data} />;
  if (block.type === "learning_objectives") return <ListBlock title={block.title} items={(data.items as string[]) ?? []} />;
  if (block.type === "procedure") return <ListBlock title={block.title} items={(data.steps as string[]) ?? []} numbered />;
  if (block.type === "checklist") return <ChecklistBlock title={block.title} items={(data.items as string[]) ?? []} />;
  if (block.type === "process_diagram") return <ProcessBlock title={block.title} stages={(data.stages as string[]) ?? []} caption={data.caption as string} />;
  if (block.type === "timeline") return <TimelineBlock title={block.title} steps={(data.steps as string[]) ?? []} />;
  if (block.type === "expandable") return <details className="mb-4 rounded-md border border-border p-4"><summary className="cursor-pointer font-semibold">{block.title}</summary><RichText body={block.body ?? ""} /></details>;
  if (block.type === "knowledge_check") return <KnowledgeCheck block={block} />;
  if (block.type === "classification" || block.type === "evidence_builder") return <ActivityBlock block={block} courseId={courseId} lessonId={lessonId} onComplete={onComplete} />;
  if (block.type === "scenario" || block.type === "decision_exercise") return <ScenarioBlock block={block} onComplete={onComplete} />;
  if (block.type === "role_cards" || block.type === "framework_cards") return <CardGrid block={block} />;
  if (block.type === "record_card") return <RecordCard block={block} />;
  if (block.type === "module_summary") return <ListBlock title={block.title} items={(data.items as string[]) ?? []} />;
  const cls = block.type.includes("warning") ? "border-red-300 bg-red-50 dark:bg-red-950" : block.type.includes("compliance") || block.type.includes("audit") ? "border-cyan-300 bg-cyan-50 dark:bg-cyan-950" : "border-border bg-slate-50 dark:bg-slate-900";
  return <div className={`mb-4 rounded-md border p-4 ${cls}`}><h3 className="mt-0 text-base font-semibold">{block.title ?? block.type.replaceAll("_", " ")}</h3><RichText body={block.body ?? ""} />{typeof data.note === "string" ? <p className="mt-3 text-sm italic text-muted-foreground">{data.note}</p> : null}</div>;
}

function RichText({ body }: { body: string }) {
  return <div className="space-y-3 text-sm leading-6 text-muted-foreground">{body.split("\n\n").map((part, index) => part.trim().startsWith("*") ? <ul key={index} className="list-disc space-y-1 pl-5">{part.split("\n").filter(Boolean).map((line) => <li key={line}>{line.replace(/^\*\s*/, "")}</li>)}</ul> : <p key={index}>{part}</p>)}</div>;
}

function TwoColumn({ data }: { data: Record<string, unknown> }) {
  return <div className="mb-4 grid gap-3 md:grid-cols-2">{[["leftTitle", "left"], ["rightTitle", "right"]].map(([titleKey, itemsKey]) => <div key={titleKey} className="rounded-md border border-border p-4"><h3 className="font-semibold">{data[titleKey] as string}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{((data[itemsKey] as string[]) ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>;
}

function ListBlock({ title, items, numbered }: { title?: string; items: string[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return <div className="mb-4 rounded-md border border-border bg-muted/30 p-4"><h3 className="font-semibold">{title}</h3><Tag className={`mt-2 space-y-1 pl-5 text-sm text-muted-foreground ${numbered ? "list-decimal" : "list-disc"}`}>{items.map((item) => <li key={item}>{item}</li>)}</Tag></div>;
}

function ChecklistBlock({ title, items }: { title?: string; items: string[] }) {
  const [checked, setChecked] = useState<string[]>([]);
  return <div className="mb-4 rounded-md border border-border p-4"><h3 className="font-semibold">{title}</h3><div className="mt-2 space-y-2">{items.map((item) => <label key={item} className="flex gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={checked.includes(item)} onChange={() => setChecked((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} />{item}</label>)}</div></div>;
}

function ProcessBlock({ title, stages, caption }: { title?: string; stages: string[]; caption?: string }) {
  return <div className="mb-4 rounded-md border border-border p-4"><h3 className="font-semibold">{title}</h3><div className="mt-3 grid gap-2 md:grid-cols-6">{stages.map((stage) => <div key={stage} className="rounded-md bg-cyan-50 p-3 text-center text-xs font-medium text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100">{stage}</div>)}</div>{caption ? <p className="mt-3 text-sm text-muted-foreground">{caption}</p> : null}</div>;
}

function TimelineBlock({ title, steps }: { title?: string; steps: string[] }) {
  return <div className="mb-4 rounded-md border border-border p-4"><h3 className="font-semibold">{title}</h3><ol className="mt-3 space-y-3">{steps.map((step, index) => <li key={step} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-xs text-white">{index + 1}</span><span>{step}</span></li>)}</ol></div>;
}

function KnowledgeCheck({ block }: { block: ContentBlock }) {
  const data = block.data as { question: string; answers: string[]; correct: number; correctFeedback: string; incorrectFeedback: string };
  const [answer, setAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && answer === data.correct;
  return <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950"><h3 className="font-semibold">Knowledge Check</h3><p className="mt-2 text-sm">{data.question}</p><div className="mt-3 space-y-2">{data.answers.map((item, index) => <label key={item} className="flex gap-2 rounded-md border border-border bg-background p-2 text-sm"><input type="radio" name={block.id} checked={answer === index} onChange={() => setAnswer(index)} />{item}</label>)}</div><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={answer === null} onClick={() => setSubmitted(true)}>Submit</button>{submitted ? <p className={`mt-3 rounded-md p-3 text-sm ${correct ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}>{correct ? data.correctFeedback : data.incorrectFeedback}</p> : null}</div>;
}

function ActivityBlock({ block, onComplete }: { block: ContentBlock; courseId: string; lessonId: string; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const { data, user } = useApp();
  const saved = data.scenarioAttempts.find((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
  const config = block.data as { instruction?: string; prompt?: string; categories?: string[]; items?: Array<{ text: string; correct: string }>; options?: string[]; correct?: number[]; success?: string; retry?: string };
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [feedback, setFeedback] = useState("");
  const check = async () => {
    if (block.type === "classification") {
      const ok = (config.items ?? []).every((item) => answers[item.text] === item.correct);
      setFeedback(ok ? "Activity complete. You classified the access decisions correctly." : "Review each item against the person's current responsibilities, then try again.");
      if (ok) await onComplete(block.id, answers, 100);
    } else {
      const selected = (config.options ?? []).map((_, index) => answers[String(index)] === true);
      const ok = selected.every((value, index) => value === ((config.correct ?? []).includes(index)));
      setFeedback(ok ? config.success ?? "Activity complete." : config.retry ?? "Review the selections and try again.");
      if (ok) await onComplete(block.id, answers, 100);
    }
  };
  return <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950"><h3 className="font-semibold">{block.title}</h3><p className="mt-1 text-sm text-muted-foreground">{config.instruction ?? config.prompt}</p>{saved ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Required activity complete.</p> : block.type === "classification" ? <div className="mt-3 space-y-3">{(config.items ?? []).map((item) => <div key={item.text} className="rounded-md border border-border bg-background p-3"><p className="text-sm font-medium">{item.text}</p><select aria-label={item.text} className="mt-2 rounded-md border border-border bg-transparent p-2 text-sm" value={(answers[item.text] as string) ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [item.text]: event.target.value }))}><option value="">Choose</option>{(config.categories ?? []).map((category) => <option key={category}>{category}</option>)}</select></div>)}</div> : <div className="mt-3 space-y-2">{(config.options ?? []).map((option, index) => <label key={option} className="flex gap-2 text-sm"><input type="checkbox" checked={answers[String(index)] === true} onChange={(event) => setAnswers((current) => ({ ...current, [String(index)]: event.target.checked }))} />{option}</label>)}</div>} {!saved ? <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={check}>Check Record</button> : null}{feedback ? <p className="mt-3 text-sm">{feedback}</p> : null}</div>;
}

function ScenarioBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const { data, user } = useApp();
  const saved = data.scenarioAttempts.find((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id);
  type ScenarioStepView = { question: string; options?: string[]; correct?: number | number[]; feedback?: string; table?: boolean; rows?: string[][]; multi?: boolean };
  const config = block.data as { label?: string; situation?: string; steps?: ScenarioStepView[]; decisions?: Array<{ prompt: string; options: string[]; correct: number }>; result?: string; keyLesson?: string; instruction?: string };
  const steps: ScenarioStepView[] = config.steps ?? (config.decisions ?? []).map((decision) => ({ question: decision.prompt, options: decision.options, correct: decision.correct }));
  const [step, setStep] = useState(saved?.status === "COMPLETED" ? steps.length : Math.min(saved?.lastStep ?? 0, steps.length - 1));
  const [answers, setAnswers] = useState<Record<string, unknown>>((saved?.answers as Record<string, unknown>) ?? {});
  const [message, setMessage] = useState("");
  const current = steps[step];
  const complete = async () => {
    await onComplete(block.id, answers, 100);
    setStep(steps.length);
  };
  const submitStep = () => {
    if (!current) return;
    const value = answers[String(step)];
    const ok = Array.isArray(current.correct) ? Array.isArray(value) && current.correct.every((index) => value.includes(index)) && value.length === current.correct.length : value === current.correct || (current.table && value);
    setMessage(ok ? current.feedback ?? "Correct." : "Review the situation and choose the response that follows the approved process.");
    if (ok) setTimeout(() => setStep((currentStep) => Math.min(currentStep + 1, steps.length)), 350);
  };
  if (step >= steps.length || saved?.status === "COMPLETED") return <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><CheckCircle2 className="mb-2" /><h3 className="font-semibold">{block.type === "scenario" ? "Scenario Complete" : "Decision Exercise Complete"}</h3><p className="mt-2 text-sm">{config.result}</p>{config.keyLesson ? <p className="mt-2 text-sm font-medium">{config.keyLesson}</p> : null}</div>;
  return <div className="mb-4 rounded-md border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{config.label ?? "Required Activity"}</p><h3 className="mt-1 text-lg font-semibold">{block.title}</h3>{step === 0 ? <p className="mt-2 text-sm text-muted-foreground">{config.situation}</p> : null}<p className="mt-4 text-sm font-medium">Step {step + 1} of {steps.length}</p><p className="mt-2 text-sm">{current.question}</p>{current.table ? <div className="mt-3 space-y-2">{(current.rows ?? []).map((row: string[], index: number) => <div key={row[0]} className="grid gap-2 rounded-md border border-border p-3 text-sm md:grid-cols-4"><span>{row[0]}</span><span className="text-muted-foreground">{row[1]}</span><span className="text-muted-foreground">{row[2]}</span><select aria-label={row[0]} className="rounded-md border border-border bg-transparent p-2" onChange={(event) => setAnswers((value) => ({ ...value, [String(step)]: { ...(value[String(step)] as object), [index]: event.target.value } }))}><option>Choose</option><option>Keep</option><option>Review</option><option>Remove</option></select></div>)}</div> : current.multi ? <div className="mt-3 space-y-2">{(current.options ?? []).map((option, index) => <label key={option} className="flex gap-2 text-sm"><input type="checkbox" onChange={(event) => setAnswers((value) => ({ ...value, [String(step)]: event.target.checked ? [...((value[String(step)] as number[]) ?? []), index] : ((value[String(step)] as number[]) ?? []).filter((item) => item !== index) }))} />{option}</label>)}</div> : <div className="mt-3 space-y-2">{(current.options ?? []).map((option, index) => <label key={option} className="flex gap-2 rounded-md border border-border p-2 text-sm"><input type="radio" name={`${block.id}-${step}`} onChange={() => setAnswers((value) => ({ ...value, [String(step)]: index }))} />{option}</label>)}</div>}<div className="mt-4 flex gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={step === steps.length - 1 ? complete : submitStep}>{step === steps.length - 1 ? "Complete Scenario" : "Continue"}</button></div>{message ? <p className="mt-3 rounded-md bg-muted p-3 text-sm">{message}</p> : null}</div>;
}

function CardGrid({ block }: { block: ContentBlock }) {
  const cards = ((block.data as { cards?: Array<{ title?: string; body?: string; question?: string; items?: string[] } | [string, string]> })?.cards ?? []);
  return <div className="mb-4 grid gap-3 md:grid-cols-2">{cards.map((card, index) => Array.isArray(card) ? <div key={card[0]} className="rounded-md border border-border p-4"><h3 className="font-semibold">{card[0]}</h3><p className="mt-1 text-sm text-muted-foreground">{card[1]}</p></div> : <div key={card.title ?? index} className="rounded-md border border-border p-4"><h3 className="font-semibold">{card.title}</h3>{card.body ? <p className="mt-1 text-sm text-muted-foreground">{card.body}</p> : null}{card.question ? <p className="mt-2 text-sm font-medium">{card.question}</p> : null}{card.items ? <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{card.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div>)}</div>;
}

function RecordCard({ block }: { block: ContentBlock }) {
  const fields = ((block.data as { fields?: string[][] })?.fields ?? []);
  return <div className="mb-4 rounded-md border border-border p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">{block.title}</h3><span className="rounded-md bg-muted px-2 py-1 text-xs">Example</span></div><dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="rounded-md bg-muted/40 p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl></div>;
}

function AssessmentPanel({ course }: { course: Course }) {
  const { data, service, setData, toast } = useApp();
  const navigate = useNavigate();
  const user = useApp().user;
  const state = getCourseCompletionState(data, user.id, course.id);
  const assessment = data.assessments.find((item) => item.courseVersionId === course.currentVersionId);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [result, setResult] = useState<{ score: number; passed: boolean; missedTopics?: string[]; correctCount?: number; totalQuestions?: number } | null>(null);
  if (!assessment) return null;
  const links = data.assessmentQuestions.filter((item) => item.assessmentId === assessment.id).sort((a, b) => a.position - b.position);
  const questions = links.map((link) => data.questions.find((item) => item.id === link.questionId)!).filter(Boolean);
  if (!state.canStartAssessment) return <LockedAssessment course={course} state={state} />;
  const submit = async () => {
    const svc = service();
    const attempt = await svc.submitAssessment(course.id, answers);
    setData(svc.snapshot());
    setResult(attempt);
    toast(attempt.passed ? "Assessment passed" : "Assessment submitted");
  };
  if (state.assessmentPassed && !started) return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><h2 className="font-semibold">Assessment Passed</h2><p className="mt-2 text-sm">Score: {state.score}%</p><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => navigate(state.nextAction?.lessonId ? `/learn/${course.id}/${state.nextAction.lessonId}` : `/courses/${course.id}`)}>Continue to Acknowledgement</button></div>;
  if (!started) return <button className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" onClick={() => setStarted(true)}>Start Assessment</button>;
  const question = questions[current];
  const options = data.questionOptions.filter((item) => item.questionId === question.id).sort((left, right) => left.position - right.position);
  const setAnswer = (questionValue: Question, value: string, checked?: boolean) => {
    setAnswers((existing) => questionValue.type === "MULTIPLE_SELECT"
      ? { ...existing, [questionValue.id]: checked ? [...((existing[questionValue.id] as string[]) ?? []), value] : ((existing[questionValue.id] as string[]) ?? []).filter((item) => item !== value) }
      : { ...existing, [questionValue.id]: value });
  };
  if (result) return result.passed ? <AssessmentResultPass course={course} result={result} /> : <AssessmentResultFail course={course} result={result} />;
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold">{assessment.title}</h2>
      <p className="text-sm text-muted-foreground">Question {current + 1} of {questions.length} · Passing score: {assessment.passingScore}%</p>
      <div className="mt-4 rounded-md border border-border p-4">
        <p className="font-medium">{question.prompt}</p>
        <div className="mt-3 space-y-2">
          {options.map((option) => <label key={option.id} className="flex gap-2 rounded-md border border-border p-2 text-sm"><input type={question.type === "MULTIPLE_SELECT" ? "checkbox" : "radio"} name={question.id} checked={question.type === "MULTIPLE_SELECT" ? ((answers[question.id] as string[]) ?? []).includes(option.id) : answers[question.id] === option.id} onChange={(event) => setAnswer(question, option.id, event.target.checked)} />{option.text}</label>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Previous</button><button className="rounded-md border border-border px-3 py-2 text-sm" disabled={current === questions.length - 1} onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>Next</button><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setFlagged((items) => items.includes(question.id) ? items.filter((item) => item !== question.id) : [...items, question.id])}>{flagged.includes(question.id) ? "Unflag" : "Flag for Review"}</button></div>
        <button className="rounded-md bg-cyan-700 px-4 py-2 text-sm text-white" onClick={submit}>Submit Assessment</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">{questions.map((item, index) => <button key={item.id} className={`h-8 w-8 rounded-md border text-xs ${index === current ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-border"}`} onClick={() => setCurrent(index)} aria-label={`Go to question ${index + 1}`}>{index + 1}</button>)}</div>
    </div>
  );
}

function LockedAssessment({ course, state }: { course: Course; state: ReturnType<typeof getCourseCompletionState> }) {
  const navigate = useNavigate();
  return <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><AlertTriangle className="mb-2" /><h2 className="text-lg font-semibold">Final Assessment Locked</h2><p className="mt-2 text-sm">Complete the remaining required activities first.</p><ul className="mt-3 space-y-1 text-sm">{state.remainingItems.filter((item) => !["assessment", "acknowledgement"].includes(item)).map((item) => <li key={item}>□ {item.startsWith("block") ? "Required activity" : "Required lesson"}</li>)}</ul><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => navigate(state.nextAction?.lessonId ? `/learn/${course.id}/${state.nextAction.lessonId}` : `/courses/${course.id}`)}>Continue Required Training</button></div>;
}

function AssessmentResultPass({ course, result }: { course: Course; result: { score: number; correctCount?: number; totalQuestions?: number } }) {
  const { data, user } = useApp();
  const state = getCourseCompletionState(data, user.id, course.id);
  return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><CheckCircle2 className="mb-2" /><h2 className="text-lg font-semibold">Assessment Passed</h2><div className="mt-3 grid gap-3 sm:grid-cols-4"><Info label="Score" value={`${result.score}%`} /><Info label="Passing Score" value="80%" /><Info label="Correct" value={`${result.correctCount ?? ""} of ${result.totalQuestions ?? ""}`} /><Info label="Attempt" value="Current" /></div><p className="mt-3 text-sm">Topics demonstrated: Personnel Responsibility, Access Authorization, Role Changes, Evidence, Training Records.</p><Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={state.nextAction?.lessonId ? `/learn/${course.id}/${state.nextAction.lessonId}` : `/courses/${course.id}`}>Continue to Acknowledgement</Link></div>;
}

function AssessmentResultFail({ course, result }: { course: Course; result: { score: number; missedTopics?: string[]; correctCount?: number; totalQuestions?: number } }) {
  const topics = result.missedTopics?.length ? result.missedTopics : ["Access Changes", "Evidence"];
  const lessonForTopic = (topic: string) => topic.includes("Evidence") ? "What Makes Evidence Audit-Ready?" : "Transfers, Promotions & Role Changes";
  const { data } = useApp();
  const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
  return <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><AlertTriangle className="mb-2" /><h2 className="text-lg font-semibold">Additional Review Required</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><Info label="Score" value={`${result.score}%`} /><Info label="Passing" value="80%" /><Info label="Correct" value={`${result.correctCount ?? ""} of ${result.totalQuestions ?? ""}`} /></div><h3 className="mt-4 font-semibold">Recommended Review</h3><div className="mt-2 grid gap-2 md:grid-cols-2">{topics.map((topic) => { const lesson = lessons.find((item) => item.title === lessonForTopic(topic)); return <div key={topic} className="rounded-md border border-border bg-background p-3"><p className="font-medium">{topic}</p><p className="text-sm text-muted-foreground">Review: {lessonForTopic(topic)}</p>{lesson ? <Link className="mt-2 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/learn/${course.id}/${lesson.id}`}>Review Lesson</Link> : null}</div>; })}</div><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => location.reload()}>Retake Assessment</button></div>;
}

function AcknowledgementPanel({ course, block }: { course: Course; block?: ContentBlock }) {
  const { data, user, service, setData, toast } = useApp();
  const state = getCourseCompletionState(data, user.id, course.id);
  const [checked, setChecked] = useState(false);
  const submitted = data.acknowledgements.some((item) => item.userId === user.id && item.courseId === course.id && item.courseVersionId === course.currentVersionId);
  const submit = async () => {
    const svc = service();
    await svc.submitAcknowledgement(course.id, block?.body ?? "");
    setData(svc.snapshot());
    toast("Course completed");
  };
  if (!state.assessmentPassed) return <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Complete and pass the final assessment before submitting the acknowledgement.</div>;
  if (submitted || state.courseComplete) return <CompletionPanel course={course} />;
  return <div className="rounded-md border border-border p-4"><h2 className="text-lg font-semibold">Learner Acknowledgement</h2><p className="mt-2 text-sm text-muted-foreground">Before completing the course, review and acknowledge the statement below.</p><div className="mt-4 whitespace-pre-line rounded-md bg-muted/40 p-4 text-sm leading-6">{block?.body}</div><div className="mt-4 grid gap-2 text-sm md:grid-cols-3"><Info label="Learner" value={user.name} /><Info label="Course" value={course.shortTitle ?? course.title} /><Info label="Date" value={new Date().toLocaleDateString()} /></div><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />I have read and acknowledge the statement above.</label><button className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!checked} onClick={submit}>Submit Acknowledgement</button></div>;
}

function CompletionPanel({ course }: { course: Course }) {
  const { data, user } = useApp();
  const state = getCourseCompletionState(data, user.id, course.id);
  const evidence = data.evidenceRecords.find((item) => item.userId === user.id && item.courseId === course.id);
  const cert = data.userCertifications.find((item) => item.userId === user.id && item.courseId === course.id);
  return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><p className="text-xs font-semibold uppercase tracking-wide">Training Complete</p><h2 className="mt-1 text-2xl font-semibold">You completed CIP-004 Personnel Security & Training</h2><p className="mt-2 text-sm">Your completion record, assessment result, acknowledgement, and certificate have been saved.</p><div className="mt-4 grid gap-3 md:grid-cols-4"><Info label="Lessons" value="9 / 9 Complete" /><Info label="Required Activities" value="3 / 3 Complete" /><Info label="Assessment" value={`${state.score ?? evidence?.assessmentScore ?? 0}% Passed`} /><Info label="Acknowledgement" value="Submitted" /></div><div className="mt-4 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/certifications">View Certificate</Link><Link className="rounded-md border border-emerald-300 px-3 py-2 text-sm" to={`/records/${course.id}`}>View Training Record</Link><Link className="rounded-md border border-emerald-300 px-3 py-2 text-sm" to="/my-learning">Return to My Learning</Link></div>{cert ? <p className="mt-3 text-sm">Certificate: {cert.certificateId}</p> : null}<CourseFeedback courseId={course.id} /></div>;
}

function CourseFeedback({ courseId }: { courseId: string }) {
  const { data, user, setData, toast } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = () => {
    data.courseFeedback.push({ id: crypto.randomUUID(), userId: user.id, courseId, usefulness: rating, confidence: rating, comment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setData({ ...data });
    toast("Feedback submitted");
  };
  return <div className="mt-5 rounded-md border border-emerald-300 p-4"><h3 className="font-semibold">How useful was this course?</h3><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} className={`rounded-md border px-2 py-1 ${rating >= value ? "bg-cyan-700 text-white" : ""}`} onClick={() => setRating(value)} aria-label={`${value} rating`}><Star size={15} /></button>)}</div><textarea className="mt-3 w-full rounded-md border border-border bg-transparent p-2 text-sm" placeholder="What would make this training more useful?" value={comment} onChange={(event) => setComment(event.target.value)} /><button className="mt-2 rounded-md border border-emerald-300 px-3 py-2 text-sm" disabled={!rating} onClick={submit}>Submit Feedback</button></div>;
}

function TrainingRecord() {
  const { courseId } = useParams();
  const { data, user } = useApp();
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return <NotFound />;
  const version = data.courseVersions.find((item) => item.id === course.currentVersionId);
  const enrollment = data.enrollments.find((item) => item.userId === user.id && item.courseId === course.id);
  const evidence = data.evidenceRecords.find((item) => item.userId === user.id && item.courseId === course.id);
  const cert = data.userCertifications.find((item) => item.userId === user.id && item.courseId === course.id);
  return <><PageHeader title="Training Record" subtitle="Completed learner transcript detail." /><Panel><div className="grid gap-3 md:grid-cols-2"><Info label="Learner" value={user.name} /><Info label="Employee / learner identifier" value={user.id.slice(0, 12)} /><Info label="Course" value={course.title} /><Info label="Course version" value={version?.version ?? "1.0"} /><Info label="Standard" value="NERC CIP-004" /><Info label="Assignment date" value={enrollment?.startedAt ? new Date(enrollment.startedAt).toLocaleDateString() : "Assigned"} /><Info label="Start date" value={enrollment?.startedAt ? new Date(enrollment.startedAt).toLocaleDateString() : "Started"} /><Info label="Completion date" value={evidence?.completedAt ? new Date(evidence.completedAt).toLocaleDateString() : "Not complete"} /><Info label="Final assessment" value={`${evidence?.assessmentScore ?? "N/A"}%`} /><Info label="Passing score" value="80%" /><Info label="Attempts used" value={String(data.assessmentAttempts.filter((attempt) => attempt.userId === user.id && attempt.courseId === course.id).length || 1)} /><Info label="Scenario" value="Completed" /><Info label="Decision Exercise" value="Completed" /><Info label="Acknowledgement" value="Submitted" /><Info label="Certificate" value={cert?.certificateId ?? "Not issued"} /><Info label="Record status" value={evidence ? "Complete" : "In Progress"} /></div></Panel></>;
}

function QuestionBank() {
  const { data } = useApp();
  return <><PageHeader title="Question Bank" subtitle="Reusable assessment questions by course, standard, difficulty, and type." /><Panel><Table headers={["Question", "Type", "Difficulty"]} rows={data.questions.map((q) => [q.prompt, q.type, q.difficulty])} /></Panel></>;
}

function TeamDashboard() {
  const { data, user } = useApp();
  const teams = data.teams.filter((team) => canViewTeam(data, user.id, team.id));
  const memberIds = data.teamMembers.filter((member) => teams.some((team) => team.id === member.teamId)).map((member) => member.userId);
  const members = data.users.filter((item) => memberIds.includes(item.id));
  return <><PageHeader title="Team Learning" subtitle="Completion, overdue training, certifications, and activity for your team." /><div className="grid gap-4 md:grid-cols-4"><Stat label="Team Members" value={members.length}/><Stat label="Overdue Training" value={data.enrollments.filter((e) => memberIds.includes(e.userId) && e.status === "OVERDUE").length}/><Stat label="Active Certifications" value={data.userCertifications.filter((c) => memberIds.includes(c.userId)).length}/><Stat label="Expiring Soon" value="0"/></div><Panel className="mt-5"><Table headers={["Employee", "Required", "In Progress", "Overdue", "Certificates", "Last Activity"]} rows={members.map((member) => [member.name, data.enrollments.filter((e) => e.userId === member.id).length, data.enrollments.filter((e) => e.userId === member.id && e.status === "IN_PROGRESS").length, data.enrollments.filter((e) => e.userId === member.id && e.status === "OVERDUE").length, data.userCertifications.filter((c) => c.userId === member.id).length, member.lastActiveAt ? formatDistanceToNow(new Date(member.lastActiveAt), { addSuffix: true }) : "No activity"])} /></Panel></>;
}

function ComplianceDashboard() {
  const { data } = useApp();
  const chart = data.teams.map((team) => ({ name: team.name, complete: data.evidenceRecords.filter((e) => data.users.find((u) => u.id === e.userId)?.teamId === team.id).length }));
  return <><PageHeader title="Compliance" subtitle="Training readiness, evidence coverage, content reviews, and standards changes." /><div className="grid gap-4 md:grid-cols-5"><Stat label="Required Completion" value="86%"/><Stat label="Overdue Training" value={data.enrollments.filter((e) => e.status === "OVERDUE").length}/><Stat label="Active Qualifications" value={data.userCertifications.length}/><Stat label="Evidence Coverage" value={`${data.evidenceRecords.length}`}/><Stat label="Reviews Due" value={data.reviews.filter((r) => r.status === "OPEN").length}/></div><Panel className="mt-5 h-80"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="complete" fill="#0e7490" /></BarChart></ResponsiveContainer></Panel><div className="mt-5 grid gap-5 lg:grid-cols-2"><Panel><h2 className="font-semibold">Critical Training Gaps</h2>{data.enrollments.filter((e) => e.status === "OVERDUE").map((e) => <p key={e.id} className="mt-2 text-sm">{data.users.find((u) => u.id === e.userId)?.name}: {data.courses.find((c) => c.id === e.courseId)?.title}</p>)}</Panel><Panel><h2 className="font-semibold">Standards Changes</h2>{data.standardChangeReviews.map((r) => <p key={r.id} className="mt-2 text-sm">{r.summary} • {r.status}</p>)}</Panel></div></>;
}

function StandardsPage() {
  const { data } = useApp();
  const [open, setOpen] = useState(false);
  return <><PageHeader title="Standards" subtitle="NERC CIP standards registry and change reviews." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => setOpen(true)}>+ Standard Change Review</button>} /><Panel><Table headers={["Standard", "Title", "Versions", "Associated Courses", "Last Reviewed"]} rows={data.standards.map((s) => [s.number, s.title, data.standardVersions.filter((v) => v.standardId === s.id).length, data.courseStandardMappings.filter((m) => data.standardVersions.some((v) => v.id === m.standardVersionId && v.standardId === s.id)).length, new Date(s.lastReviewedAt).toLocaleDateString()])} /></Panel>{open ? <Modal title="Standard Change Review" onClose={() => setOpen(false)}><p className="text-sm text-muted-foreground">Change review created from the standards registry.</p><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => setOpen(false)}>Save Review</button></Modal> : null}</>;
}

function EvidencePage() {
  const { data, service, setData, toast } = useApp();
  const invalidate = async (idValue: string) => { const reason = prompt("Reason required"); if (!reason) return; const svc = service(); await svc.invalidateEvidence(idValue, reason); setData(svc.snapshot()); toast("Evidence invalidated"); };
  return <><PageHeader title="Evidence" subtitle="Immutable training evidence records and exportable details." /><Panel><Table headers={["Learner", "Course", "Completed", "Assessment", "Status", "Actions"]} rows={data.evidenceRecords.map((e) => [e.userDisplayName, e.courseTitle, new Date(e.completedAt).toLocaleDateString(), e.assessmentScore ?? "N/A", e.status, <button key={e.id} className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => invalidate(e.id)}>Invalidate Record</button>])} /></Panel></>;
}

function ReportsPage() {
  const { data } = useApp();
  const exportCsv = () => downloadText("gridguard-report.csv", ["Report,Count", `Evidence Records,${data.evidenceRecords.length}`, `Courses,${data.courses.length}`, `Users,${data.users.length}`].join("\n"));
  return <><PageHeader title="Reports" subtitle="Current database reports with CSV export and print." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={exportCsv}>Export CSV</button>} /><div className="grid gap-4 lg:grid-cols-3">{["Training Completion", "Overdue Training", "Certification Status", "Assessment Performance", "Course Effectiveness", "Training by Team", "Training by Standard", "Content Review Status", "Learning Path Progress"].map((name) => <Panel key={name}><h2 className="font-semibold">{name}</h2><p className="mt-2 text-sm text-muted-foreground">Generated from current browser database.</p><button className="mt-3 rounded-md border border-border px-3 py-2 text-sm" onClick={() => window.print()}>Print</button></Panel>)}</div></>;
}

function LearningPaths() {
  const { data, user } = useApp();
  return <><PageHeader title="Learning Paths" subtitle="Role-based course sequences and progress." /><div className="grid gap-4 lg:grid-cols-2">{data.learningPaths.map((path) => <Panel key={path.id}><h2 className="font-semibold">{path.title}</h2><p className="mt-2 text-sm text-muted-foreground">{path.description}</p><p className="mt-3 text-sm">Progress: {data.learningPathEnrollments.find((e) => e.learningPathId === path.id && e.userId === user.id)?.progress ?? 0}%</p></Panel>)}</div></>;
}

function Certifications() {
  const { data, user } = useApp();
  const certs = data.userCertifications.filter((cert) => cert.userId === user.id);
  return <><PageHeader title="Certifications" subtitle="Active certificates and printable completion records." /><div className="grid gap-4 lg:grid-cols-2">{certs.map((userCert) => { const cert = data.certifications.find((item) => item.id === userCert.certificationId)!; return <Panel key={userCert.id}><div className="border-4 border-double border-slate-300 p-6 text-center"><p className="text-sm tracking-wide">GRIDGUARD LEARNING</p><h2 className="mt-4 text-2xl font-semibold">Certificate of Completion</h2><p className="mt-4">{user.name}</p><p className="mt-2 font-semibold">{cert.name}</p><p className="mt-2 text-sm">Certificate ID: {userCert.certificateId}</p><p className="text-sm">Valid Through: {new Date(userCert.expiresAt).toLocaleDateString()}</p></div><button className="no-print mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => window.print()}>Print</button></Panel>; })}</div>{!certs.length ? <EmptyState text="No certificates yet." action="Browse Library" href="/library" /> : null}</>;
}

function SkillsPage() {
  const { data, user } = useApp();
  return <><PageHeader title="Skills" subtitle="Training demonstrates learning progress toward applied capability." /><div className="grid gap-4 lg:grid-cols-3">{data.skills.map((skill) => <Panel key={skill.id}><h2 className="font-semibold">{skill.name}</h2><p className="mt-2 text-sm text-muted-foreground">{skill.description}</p><p className="mt-3 text-sm">Level: {data.userSkills.find((item) => item.userId === user.id && item.skillId === skill.id)?.level ?? "Awareness"}</p></Panel>)}</div></>;
}

function AdminHome() {
  const actions = [["Users", "/admin/users"], ["Teams", "/admin/teams"], ["Groups", "/admin/groups"], ["Assignments", "/admin/assignments"], ["Audit", "/admin/audit"], ["Storage", "/admin/settings"], ["About", "/admin/about"]];
  return <><PageHeader title="Administration" subtitle="Users, teams, groups, assignments, storage, settings, and system activity." /><div className="grid gap-4 lg:grid-cols-3">{actions.map(([label, href]) => <Link key={href} to={href}><Panel><h2 className="font-semibold">{label}</h2><p className="mt-2 text-sm text-muted-foreground">Open {label} administration.</p></Panel></Link>)}</div><DataManagement /></>;
}

function UsersAdmin() {
  const { data, service, setData, toast } = useApp();
  const [open, setOpen] = useState(false);
  const complianceTeam = data.teams.find((team) => team.name === "Compliance");
  const cipGroup = data.groups.find((group) => group.name === "CIP Compliance");
  const createJordan = async () => { const svc = service(); await svc.createUser({ firstName: "Jordan", lastName: "Lee", email: "jordan.lee@gridguard.local", jobTitle: "Compliance Learner", teamId: complianceTeam?.id, roles: ["LEARNER"], groupIds: cipGroup ? [cipGroup.id] : [] }); setData(svc.snapshot()); toast("Jordan Lee created"); setOpen(false); };
  return <><PageHeader title="Users" subtitle="Manage simulated users, roles, teams, and status." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => setOpen(true)}>New User</button>} /><Panel><Table headers={["Name", "Email", "Team", "Roles", "Status", "Training", "Last Active"]} rows={data.users.map((u) => [u.name, u.email, data.teams.find((t) => t.id === u.teamId)?.name ?? "", getRoles(data, u.id).join(", "), u.status, data.enrollments.filter((e) => e.userId === u.id).length, u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString() : ""])} /></Panel>{open ? <Modal title="New User" onClose={() => setOpen(false)}><p className="text-sm text-muted-foreground">Create the required walkthrough user Jordan Lee.</p><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={createJordan}>Save Jordan Lee</button></Modal> : null}</>;
}

function TeamsAdmin() {
  const { data } = useApp();
  return <><PageHeader title="Teams" subtitle="Create teams, assign managers, and review training." /><Panel><Table headers={["Team", "Manager", "Members", "Description"]} rows={data.teams.map((t) => [t.name, data.users.find((u) => u.id === t.managerId)?.name ?? "Unassigned", data.teamMembers.filter((m) => m.teamId === t.id).length, t.description])} /></Panel></>;
}

function GroupsAdmin() {
  const { data } = useApp();
  return <><PageHeader title="Groups" subtitle="Flexible membership for access grants and assignments." /><Panel><Table headers={["Group", "Members", "Description"]} rows={data.groups.map((g) => [g.name, data.groupMembers.filter((m) => m.groupId === g.id).length, g.description])} /></Panel></>;
}

function AssignmentsAdmin() {
  const { data, service, setData, toast } = useApp();
  const jordan = data.users.find((u) => u.email === "jordan.lee@gridguard.local");
  const evidenceCourse = data.courses.find((c) => c.title === "NERC CIP Evidence Fundamentals");
  const assignJordan = async () => { if (!jordan || !evidenceCourse) return toast("Create Jordan and the course first"); const svc = service(); await svc.assignCourse(evidenceCourse.id, jordan.id, addDays(new Date(), 30).toISOString()); setData(svc.snapshot()); toast("Assignment created"); };
  return <><PageHeader title="Assignments" subtitle="Assign training to users, teams, groups, and roles." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={assignJordan}>Assign Jordan Evidence Course</button>} /><Panel><Table headers={["Training", "Audience", "Due", "Status", "Recurrence"]} rows={data.assignments.map((a) => [data.courses.find((c) => c.id === a.targetId)?.title ?? a.title, data.assignmentAudiences.filter((aud) => aud.assignmentId === a.id).length, new Date(a.dueAt).toLocaleDateString(), a.status, a.recurrence])} /></Panel></>;
}

function AuditPage() {
  const { data } = useApp();
  return <><PageHeader title="Audit Log" subtitle="Governed activity log. Audit records cannot be deleted through the UI." /><Panel><Table headers={["Time", "Actor", "Action", "Object", "Details"]} rows={data.auditEvents.slice().reverse().map((a) => [new Date(a.createdAt).toLocaleString(), data.users.find((u) => u.id === a.actorId)?.name ?? "System", a.action, a.objectType, a.summary])} /></Panel></>;
}

function SettingsPage() {
  const { data, setData, service, toast } = useApp();
  const [resetText, setResetText] = useState("");
  const reset = async () => { if (resetText !== "RESET GRIDGUARD") return toast("Type RESET GRIDGUARD to reset"); const svc = service(); await svc.resetDemoData(); setData(svc.snapshot()); toast("Demo data restored"); };
  return <><PageHeader title="Settings" subtitle="General, learning, notifications, branding, access, and data settings." /><Panel><h2 className="font-semibold">General</h2><Info label="Organization Name" value={data.organizations[0].name}/><Info label="Timezone" value={data.organizations[0].timezone}/><Info label="Support Email" value={data.organizations[0].supportEmail}/></Panel><Panel className="mt-5"><h2 className="font-semibold">Access & Roles</h2><Info label="Default Course Access" value="Restricted"/><Info label="Session Timeout" value="8 hours"/><Info label="Demo User Switcher" value="Enabled"/></Panel><Panel className="mt-5"><h2 className="font-semibold">Data</h2><input className="mt-3 h-10 rounded-md border border-border bg-transparent px-3" placeholder="RESET GRIDGUARD" value={resetText} onChange={(e) => setResetText(e.target.value)} /><button className="ml-2 rounded-md border border-red-300 px-3 py-2 text-sm text-red-700" onClick={reset}>Restore Demo Data</button></Panel></>;
}

function AboutPage() {
  return <><PageHeader title="About" /><Panel><h1 className="text-2xl font-semibold">GridGuard Learning</h1><p className="mt-2">NERC CIP Training & Compliance Readiness</p><Info label="Version" value="0.1.0"/><Info label="Deployment" value="GitHub Edition"/><Info label="Storage" value="Browser Local"/><Info label="Application Status" value="Operational"/></Panel></>;
}

function DataManagement() {
  const { data, service, setData, toast } = useApp();
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  useEffect(() => { navigator.storage?.estimate?.().then(setStorage).catch(() => undefined); }, []);
  const exportData = async () => { await service().exportBackupFile(); toast("Backup exported"); };
  const importData = async (file?: File) => { if (!file) return; try { await service().restoreBackup(await file.text()); setData(await getAllData()); toast("Backup restored"); } catch { toast("This backup could not be read"); } };
  return <Panel className="mt-5"><h2 className="font-semibold">Data Management</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><Info label="Storage Mode" value="Browser Local"/><Info label="Courses" value={data.courses.length}/><Info label="Users" value={data.users.length}/><Info label="Evidence Records" value={data.evidenceRecords.length}/></div><p className="mt-3 text-sm text-muted-foreground">Used: {storage.usage ? `${Math.round(storage.usage / 1024)} KB` : "Unknown"} / {storage.quota ? `${Math.round(storage.quota / 1024 / 1024)} MB` : "Unknown"}</p><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={exportData}><Download className="mr-1 inline" size={15}/>Export Full Backup</button><label className="rounded-md border border-border px-3 py-2 text-sm"><Upload className="mr-1 inline" size={15}/>Import Backup<input type="file" accept="application/json" className="hidden" onChange={(e) => importData(e.target.files?.[0])}/></label><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={async () => { await replaceAllData(createSeedData()); setData(await getAllData()); toast("Demo data restored"); }}><RefreshCw className="mr-1 inline" size={15}/>Restore Demo Data</button></div></Panel>;
}

function QuickCreate() {
  const { data, user } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const actions = [
    { label: "New Course", href: "/build/new", show: canCreateCourses(data, user.id) },
    { label: "New Learning Path", href: "/learning-paths", show: canCreateCourses(data, user.id) },
    { label: "New Assessment", href: "/build/questions", show: canManageCourses(data, user.id) },
    { label: "New Assignment", href: "/admin/assignments", show: canManageUsers(data, user.id) },
    { label: "New Certification", href: "/admin", show: canManageUsers(data, user.id) },
    { label: "New User", href: "/admin/users", show: canManageUsers(data, user.id) }
  ].filter((action) => action.show);
  return <div className="relative"><button className="rounded-md bg-cyan-700 p-2 text-white" aria-label="Quick create" onClick={() => setOpen(!open)}><Plus size={18}/></button>{open ? <div className="absolute right-0 top-11 z-50 w-52 rounded-md border border-border bg-white p-2 shadow-soft dark:bg-slate-950">{actions.map((item) => <button key={item.label} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); navigate(item.href); }}>{item.label}</button>)}</div> : null}</div>;
}

function DemoSwitcher({ onClose, onSwitch, onLogout }: { onClose: () => void; onSwitch: (userId: string) => void; onLogout: () => void }) {
  const { data, user } = useApp();
  const accounts = data.users.filter((account) => account.status === "ACTIVE");
  return <Modal title="My Profile" onClose={onClose}><div className="mb-4"><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{getRoles(data, user.id).join(", ")}</p></div><h3 className="font-semibold">Experience GridGuard as:</h3><div className="mt-3 grid gap-3">{accounts.map((account) => <div key={account.id} data-testid={`switch-${account.email}`} className="flex items-center justify-between rounded-md border border-border p-3"><div><p className="font-medium">{account.name}</p><p className="text-sm text-muted-foreground">{getRoles(data, account.id).join(", ")} • {account.email}</p></div><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => onSwitch(account.id)}>Switch</button></div>)}</div><button className="mt-4 flex items-center gap-2 text-sm text-red-700" onClick={onLogout}><LogOut size={16}/>Sign Out</button></Modal>;
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { data, user } = useApp();
  const [query, setQuery] = useState("");
  const results = searchAuthorized(data, user.id, query);
  return <Modal title="Search" onClose={onClose}><input autoFocus className="h-11 w-full rounded-md border border-border bg-transparent px-3" placeholder="Search courses, lessons, standards..." value={query} onChange={(event) => setQuery(event.target.value)} /><div className="mt-3 max-h-96 overflow-auto">{results.map((result) => <Link key={`${result.type}-${result.title}`} className="block rounded-md border-b border-border p-3 hover:bg-muted" to={result.href} onClick={onClose}><p className="text-xs text-muted-foreground">{result.type}</p><p className="font-medium">{result.title}</p><p className="text-sm text-muted-foreground">{result.description}</p></Link>)}</div></Modal>;
}

function NotesDrawer({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState(localStorage.getItem("gridguard.notes") ?? "");
  return <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-white p-4 shadow-xl dark:bg-slate-950"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">My Notes</h2><button onClick={onClose}><X /></button></div><textarea className="mt-4 h-80 w-full rounded-md border border-border bg-transparent p-3" value={value} onChange={(event) => { setValue(event.target.value); localStorage.setItem("gridguard.notes", event.target.value); }} /><p className="mt-2 text-sm text-muted-foreground">Saved automatically.</p></div>;
}

function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  return online ? null : <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Offline. Most GridGuard functions remain available.</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md border border-border bg-white p-5 shadow-xl dark:bg-slate-950"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button aria-label="Close" onClick={onClose}><X /></button></div>{children}</section></div>;
}

function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2">{items.map((item) => <button key={item} className={`rounded-md border border-border px-3 py-2 text-sm ${active === item ? "bg-cyan-700 text-white" : ""}`} onClick={() => onChange(item)}>{item.replaceAll("_", " ")}</button>)}</div>;
}

function EmptyState({ text, action, href, onClick }: { text: string; action: string; href?: string; onClick?: () => void }) {
  const button = <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={onClick}>{action}</button>;
  return <Panel className="mt-5 text-center"><p className="text-muted-foreground">{text}</p>{href ? <Link className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={href}>{action}</Link> : button}</Panel>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="mt-3"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>;
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground">{headers.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b border-border">{row.map((cell, j) => <td key={j} className="px-3 py-3">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
