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
  LearningRecommendationService,
  SkillMasteryService,
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
  getCoachingOpportunities,
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

  const currentSession = AuthService.getSession();
  const sessionUser = sessionUserId
    ? data.users.find((user) => user.id === sessionUserId) ?? data.users.find((user) => user.email === currentSession?.email)
    : undefined;
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
            <Route path="/practice" element={<PracticeCenter />} />
            <Route path="/practice/:activityId" element={<PracticeActivityPage />} />
            <Route path="/scenarios" element={<ScenarioLab />} />
            <Route path="/scenarios/:scenarioId" element={<ScenarioDetail />} />
            <Route path="/scenarios/:scenarioId/run/:attemptId" element={<ScenarioRun />} />
            <Route path="/learning" element={<LearningCatalog />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/learning-paths" element={<LearningPaths />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/skills/:skillId" element={<SkillDetailPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/challenges/:activityId" element={<PracticeActivityPage />} />
            <Route path="/refresher/:activityId" element={<PracticeActivityPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/learning-map" element={<LearningMapPage />} />
            <Route path="/campaigns/:campaignId" element={<CampaignLearnerPage />} />
            <Route path="/courses/:courseId" element={<CourseLanding />} />
            <Route path="/learn/:courseId/:lessonId?" element={<CoursePlayer />} />
            <Route path="/resources/:resourceId" element={<ResourceDetail />} />
            <Route path="/records/:courseId" element={<TrainingRecord />} />
            <Route path="/build" element={<Guard allow={canManageCourses(data, user.id)} label="Course Management"><CourseManagementDashboard /></Guard>} />
            <Route path="/build/practice" element={<Guard allow={canManageCourses(data, user.id)} label="Practice Activities"><PracticeAuthoring /></Guard>} />
            <Route path="/build/scenarios" element={<Guard allow={canManageCourses(data, user.id)} label="Scenario Builder"><ScenarioAuthoring /></Guard>} />
            <Route path="/build/new" element={<Guard allow={canCreateCourses(data, user.id)} label="Create Course"><CourseCreationWizard /></Guard>} />
            <Route path="/build/questions" element={<Guard allow={canManageCourses(data, user.id)} label="Question Bank"><QuestionBank /></Guard>} />
            <Route path="/build/courses/:courseId" element={<CourseWorkspace />} />
            <Route path="/build/courses/:courseId/assign" element={<Guard allow={canManageCourses(data, user.id)} label="Assign Training"><AssignmentWizard /></Guard>} />
            <Route path="/team" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Team Learning"><TeamDashboard /></Guard>} />
            <Route path="/team/coaching" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Coaching"><ManagerCoaching /></Guard>} />
            <Route path="/team/campaigns" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Campaigns"><ManagerCampaigns /></Guard>} />
            <Route path="/team/challenges" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Challenges"><ManagerCoaching /></Guard>} />
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
  const learnerOnly = !hasAnyRole(data, userId, ["MANAGER", "AUTHOR", "COURSE_OWNER", "REVIEWER", "COMPLIANCE_MANAGER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]);
  const items = learnerOnly ? [
    { label: "Home", href: "/home", icon: Home },
    { label: "My Learning", href: "/my-learning", icon: GraduationCap },
    { label: "Practice", href: "/practice", icon: ClipboardCheck },
    { label: "Scenario Lab", href: "/scenarios", icon: ShieldCheck },
    { label: "Skills", href: "/skills", icon: CheckCircle2 },
    { label: "Learning Paths", href: "/learning-paths", icon: BookOpenCheck },
    { label: "Certificates", href: "/certifications", icon: FileCheck2 }
  ] : [
    { label: "Home", href: "/home", icon: Home },
    { label: "My Learning", href: "/my-learning", icon: GraduationCap },
    { label: "Practice", href: "/practice", icon: ClipboardCheck },
    { label: "Scenario Lab", href: "/scenarios", icon: ShieldCheck },
    { label: "Catalog", href: "/learning", icon: Library },
    { label: "Learning Paths", href: "/learning-paths", icon: BookOpenCheck },
    { label: "Certifications", href: "/certifications", icon: FileCheck2 },
    { label: "Skills", href: "/skills", icon: CheckCircle2 }
  ];
  if (hasAnyRole(data, userId, ["MANAGER", "PLATFORM_ADMIN"])) {
    items.push({ label: "Team Learning", href: "/team", icon: UsersRound });
    items.push({ label: "Coaching", href: "/team/coaching", icon: ClipboardCheck });
  }
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

function titleize(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function HomeDashboard() {
  const { data, user } = useApp();
  const enrollments = data.enrollments.filter((item) => item.userId === user.id);
  const assigned = enrollments.length;
  const completed = enrollments.filter((item) => item.status === "COMPLETED").length;
  const inProgress = enrollments.filter((item) => item.status === "IN_PROGRESS").length;
  const certs = data.userCertifications.filter((item) => item.userId === user.id).length;
  const required = enrollments.map((enrollment) => data.courses.find((course) => course.id === enrollment.courseId)!).filter(Boolean);
  const recommendations = LearningRecommendationService.getRecommendations(data, user.id);
  const next = recommendations[0];
  const practice = recommendations.find((item) => item.recommendationType === "PRACTICE_ACTIVITY" || item.recommendationType === "REFRESHER");
  const fresh = recommendations.find((item) => item.reasonCode === "REINFORCEMENT_DUE");
  const mastery = SkillMasteryService.getSkillMastery(data, user.id).filter((skill) => skill.evidenceCount).slice(0, 4);
  const dueSoon = enrollments
    .map((enrollment) => ({ enrollment, assignment: data.assignments.find((assignment) => assignment.id === enrollment.assignmentId), course: data.courses.find((course) => course.id === enrollment.courseId) }))
    .filter((item) => item.assignment && item.course && item.enrollment.status !== "COMPLETED")
    .sort((left, right) => new Date(left.assignment!.dueAt).getTime() - new Date(right.assignment!.dueAt).getTime())
    .slice(0, 3);

  return (
    <>
      <PageHeader title={`Good afternoon, ${user.firstName}`} subtitle="Recommended next actions, practice, skills, and required learning." />
      {next ? <Panel className="mb-5 border-cyan-200 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/40"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Recommended Next</p><div className="mt-2 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-semibold">{next.title}</h2><p className="mt-1 text-sm text-muted-foreground">{next.reason}</p></div><Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to={next.href}>{next.recommendationType === "CONTINUE_COURSE" ? "Resume" : "Start"}</Link></div></Panel> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Assigned Training" value={assigned} />
        <Stat label="In Progress" value={inProgress} />
        <Stat label="Completed" value={completed} />
        <Stat label="Certifications" value={certs} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
        {dueSoon.length ? <Panel><h2 className="text-lg font-semibold">Due Soon</h2><div className="mt-3 space-y-2">{dueSoon.map(({ assignment, course }) => <Link key={assignment!.id} className="flex justify-between rounded-md border border-border p-3 text-sm" to={`/courses/${course!.id}`}><span>{course!.shortTitle ?? course!.title}</span><span className="text-muted-foreground">{new Date(assignment!.dueAt).toLocaleDateString()}</span></Link>)}</div></Panel> : null}
        {fresh ? <Panel><p className="text-sm font-semibold text-cyan-700">Keep It Fresh</p><h2 className="mt-2 text-lg font-semibold">{fresh.title}</h2><p className="mt-1 text-sm text-muted-foreground">{fresh.reason}</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={fresh.href}>Start Reinforcement</Link></Panel> : null}
        {practice ? <Panel><p className="text-sm font-semibold text-cyan-700">Practice Recommendation</p><h2 className="mt-2 text-lg font-semibold">{practice.title}</h2><p className="mt-1 text-sm text-muted-foreground">{practice.reason}</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={practice.href}>Start Challenge</Link></Panel> : null}
        <Panel>
          <h2 className="text-lg font-semibold">My Learning</h2>
          <div className="mt-3 space-y-3">
            {required.filter((course) => data.enrollments.some((enrollment) => enrollment.courseId === course.id && enrollment.status !== "COMPLETED")).map((course) => <CourseRow key={course.id} course={course} />)}
            {required.length === 0 ? <EmptyState text="You're caught up on required training." action="Explore Practice" href="/practice" /> : null}
          </div>
        </Panel>
        </div>
        <div className="space-y-5">
          {hasAnyRole(data, user.id, ["MANAGER", "PLATFORM_ADMIN"]) ? <ManagerMini /> : null}
          {canViewCompliance(data, user.id) ? <ComplianceMini /> : null}
          <Panel><h2 className="text-lg font-semibold">Learning Paths</h2><div className="mt-3 space-y-2">{data.learningPaths.slice(0, 3).map((path) => <Link key={path.id} className="block rounded-md border border-border p-3 text-sm" to="/learning-paths">{path.title}</Link>)}</div></Panel>
          <Panel><h2 className="text-lg font-semibold">Skills</h2><div className="mt-3 space-y-2">{mastery.map((skill) => <Link key={skill.skillId} className="flex justify-between rounded-md border border-border p-3 text-sm" to={`/skills/${skill.skillId}`}><span>{skill.title}</span><span className="text-muted-foreground">{skill.state.replaceAll("_", " ")}</span></Link>)}</div>{!mastery.length ? <p className="mt-2 text-sm text-muted-foreground">Complete practice or scenarios to build skill evidence.</p> : null}</Panel>
          <Panel><h2 className="text-lg font-semibold">Recent Achievements</h2><div className="mt-3 space-y-2 text-sm"><div className="rounded-md border border-border p-3">CIP Foundations Complete</div><div className="rounded-md border border-border p-3">First Scenario Completed</div></div></Panel>
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
      {!filtered.length ? <EmptyState text="You're all caught up." action="Browse Catalog" href="/learning" /> : null}
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

function LearningCatalog() {
  const { data, user } = useApp();
  const [tab, setTab] = useState("Catalog");
  const [query, setQuery] = useState("");
  const [standard, setStandard] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const enrollments = data.enrollments.filter((item) => item.userId === user.id);
  const visibleCourses = data.courses.filter((course) => {
    const access = canAccessCourse(data, user.id, course.id);
    const version = data.courseVersions.find((item) => item.id === course.currentVersionId);
    const lessonText = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId).map((lesson) => lesson.title).join(" ");
    const searchText = [course.title, course.shortDescription, course.subtitle, course.subcategory, version?.goal, lessonText].join(" ").toLowerCase();
    return (access.allowed || access.discoverable)
      && course.showInCatalog
      && (standard === "All" || course.title.includes(standard) || course.subcategory === standard)
      && (difficulty === "All" || course.difficulty === difficulty)
      && (!query || searchText.includes(query.toLowerCase()));
  });
  const assignedCourses = enrollments.map((enrollment) => data.courses.find((course) => course.id === enrollment.courseId)).filter(Boolean) as Course[];
  const completedCourses = enrollments.filter((enrollment) => enrollment.status === "COMPLETED").map((enrollment) => data.courses.find((course) => course.id === enrollment.courseId)).filter(Boolean) as Course[];
  const continueCourse = assignedCourses.find((course) => getCourseCompletionState(data, user.id, course.id).percent > 0 && getCourseCompletionState(data, user.id, course.id).percent < 100);
  const dueSoon = enrollments
    .map((enrollment) => ({ enrollment, assignment: data.assignments.find((assignment) => assignment.id === enrollment.assignmentId), course: data.courses.find((course) => course.id === enrollment.courseId) }))
    .filter((item) => item.assignment && item.course && new Date(item.assignment.dueAt).getTime() > Date.now())
    .sort((left, right) => new Date(left.assignment!.dueAt).getTime() - new Date(right.assignment!.dueAt).getTime())[0];
  const standards = Array.from(new Set(data.courses.map((course) => course.subcategory).filter(Boolean))).sort();
  const domainCount = new Set(data.courseStandardMappings.map((mapping) => data.standardVersions.find((version) => version.id === mapping.standardVersionId)?.standardId).filter(Boolean)).size;
  const certificateCount = data.courses.filter((course) => course.certificateEnabled && course.showInCatalog).length;
  const clearFilters = () => {
    setQuery("");
    setStandard("All");
    setDifficulty("All");
  };
  const activeCourses = tab === "My Learning" ? assignedCourses : tab === "Completed" ? completedCourses : visibleCourses;
  return (
    <>
      <PageHeader title="Learning Catalog" subtitle="NERC CIP training designed around practical responsibilities, operational decisions, and evidence readiness." />
      <Panel>
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-xl font-semibold">Learning Catalog</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Build knowledge across the NERC CIP lifecycle, from asset categorization and access controls to incident response, recovery, supply chain, and audit readiness.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Courses" value={visibleCourses.length} />
            <Info label="CIP Domains" value={domainCount} />
            <Info label="Learning Paths" value={data.learningPaths.length} />
            <Info label="Certificates" value={certificateCount} />
          </div>
        </div>
      </Panel>
      {continueCourse || dueSoon ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {continueCourse ? <Panel><p className="text-sm font-semibold text-cyan-700">Continue Learning</p><h3 className="mt-2 font-semibold">{continueCourse.title}</h3><p className="mt-1 text-sm text-muted-foreground">{getCourseCompletionState(data, user.id, continueCourse.id).percent}% complete</p><Link className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={getCourseCompletionState(data, user.id, continueCourse.id).resumeDestination}>Resume Course</Link></Panel> : null}
          <Panel><p className="text-sm font-semibold text-cyan-700">Recommended Next</p><h3 className="mt-2 font-semibold">{data.learningPaths[0]?.title ?? "NERC CIP Foundations"}</h3><p className="mt-1 text-sm text-muted-foreground">Follow the next course in your learning path.</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to="/learning-paths">View Path</Link></Panel>
          {dueSoon?.course && dueSoon.assignment ? <Panel><p className="text-sm font-semibold text-amber-700">Due Soon</p><h3 className="mt-2 font-semibold">{dueSoon.course.title}</h3><p className="mt-1 text-sm text-muted-foreground">Due {new Date(dueSoon.assignment.dueAt).toLocaleDateString()}</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${dueSoon.course.id}`}>Open Course</Link></Panel> : null}
        </div>
      ) : null}
      <div className="mt-5">
        <Tabs items={["My Learning", "Catalog", "Learning Paths", "Completed", "Transcript"]} active={tab} onChange={setTab} />
      </div>
      {tab === "Learning Paths" ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{data.learningPaths.map((path) => <Panel key={path.id}><h2 className="font-semibold">{path.title}</h2><p className="mt-2 text-sm text-muted-foreground">{path.description}</p><p className="mt-3 text-sm">Courses: {data.learningPathCourses.filter((item) => item.learningPathId === path.id).length}</p></Panel>)}</div> : null}
      {tab === "Transcript" ? <TranscriptPanel /> : null}
      {tab !== "Learning Paths" && tab !== "Transcript" ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <input className="h-10 min-w-72 rounded-md border border-border bg-transparent px-3" placeholder="Search courses, standards, skills, or topics" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="h-10 rounded-md border border-border bg-transparent px-3" value={standard} onChange={(event) => setStandard(event.target.value)}>
              {["All", ...standards].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-10 rounded-md border border-border bg-transparent px-3" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              {["All", "Foundational", "Intermediate", "Advanced"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={clearFilters}>Clear filters</button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{activeCourses.length} course{activeCourses.length === 1 ? "" : "s"} shown</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {activeCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
          {!activeCourses.length ? <EmptyState text={tab === "My Learning" ? "You're caught up." : "No courses match these filters."} action={tab === "My Learning" ? "Browse Catalog" : "Clear Filters"} onClick={tab === "My Learning" ? () => setTab("Catalog") : clearFilters} /> : null}
        </>
      ) : null}
    </>
  );
}

function TranscriptPanel() {
  const { data, user } = useApp();
  const rows = data.enrollments
    .filter((enrollment) => enrollment.userId === user.id)
    .map((enrollment) => {
      const course = data.courses.find((item) => item.id === enrollment.courseId);
      const version = data.courseVersions.find((item) => item.id === course?.currentVersionId);
      const evidence = data.evidenceRecords.find((item) => item.userId === user.id && item.courseId === enrollment.courseId);
      const cert = data.userCertifications.find((item) => item.userId === user.id && item.courseId === enrollment.courseId);
      return [
        course?.title ?? "Unknown course",
        version?.version ?? "1.0",
        enrollment.status,
        evidence?.assessmentScore ? `${evidence.assessmentScore}%` : "N/A",
        evidence?.completedAt ? new Date(evidence.completedAt).toLocaleDateString() : "In progress",
        cert?.certificateId ?? "Not issued",
        course ? <Link key={course.id} className="text-cyan-700" to={`/records/${course.id}`}>Training Record</Link> : ""
      ];
    });
  return <Panel className="mt-4"><Table headers={["Course", "Version", "Status", "Assessment", "Completed", "Certificate", "Record"]} rows={rows} /></Panel>;
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
              {(hero
                ? ["Complete all required lessons.", "Complete all required knowledge checks.", "Complete the interactive Role Change scenario.", "Complete the Access Termination decision exercise.", "Score at least 80% on the final assessment.", "Complete the learner acknowledgement."]
                : ["Complete all required lessons.", "Complete required practice activities.", "Score at least 80% on the final assessment.", course.certificateEnabled ? "Certificate issued after completion." : "Completion record issued after completion."]
              ).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </Panel>
      </div>
    </>
  );
}

function CoursePlayer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { data, user, service, setData, toast } = useApp();
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth >= 1024);
  const [notesOpen, setNotesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
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
  const activitiesDone = lessonDone || requiredActivities.every((block) => data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED"));
  const canCompleteLesson = lessonDone || !requiredActivities.length || activitiesDone;
  const currentModule = data.modules.find((module) => module.id === lesson.moduleId);
  const moduleLessons = lessons.filter((item) => item.moduleId === lesson.moduleId);
  const lessonIndexInModule = moduleLessons.findIndex((item) => item.id === lesson.id) + 1;
  const resources = data.courseResources.filter((resource) => resource.courseId === course.id);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-border bg-background/95">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${course.id}`}>Back</Link>
            <button className="rounded-md border border-border px-3 py-2 text-sm lg:hidden" onClick={() => setOutlineOpen(true)}>Outline</button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{course.shortTitle ?? course.title}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span>{state.percent}% complete</span><div className="h-1 w-28 rounded-full bg-muted"><div className="h-1 rounded-full bg-cyan-700" style={{ width: `${state.percent}%` }} /></div></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button aria-label="Bookmark lesson" className="rounded-md border border-border px-3 py-2 text-sm" onClick={toggleBookmark}>{bookmarked ? "Saved" : "Save"}</button>
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setNotesOpen(true)}>Notes</button>
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setResourcesOpen(true)}>Resources</button>
            <button className="hidden rounded-md border border-border px-3 py-2 text-sm lg:inline-flex" onClick={() => setOutlineOpen((value) => !value)}>{outlineOpen ? "Hide Outline" : "Show Outline"}</button>
            <Link className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${course.id}`}>Exit</Link>
          </div>
        </div>
      </div>
      <div className={`grid min-h-0 flex-1 ${outlineOpen ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-1"}`}>
        {outlineOpen ? <LearningOutline course={course} lessons={lessons} activeLessonId={lesson.id} state={state} userId={user.id} onClose={() => setOutlineOpen(false)} /> : null}
        <main className="min-h-0 overflow-y-auto">
          <article className="mx-auto max-w-[1100px] px-4 py-8 lg:px-10">
            <div className="mx-auto max-w-[760px]">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Module {currentModule?.position ?? 1} · {currentModule?.title ?? course.subcategory}</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-normal text-slate-950 dark:text-white">{lesson.title}</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{lesson.estimatedMinutes} min · {lesson.required ? "Required" : "Optional"} · Lesson {lessonIndexInModule || index + 1} of {moduleLessons.length || lessons.length}</p>
              <div className="mt-5 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-cyan-700" style={{ width: `${Math.round(((index + 1) / lessons.length) * 100)}%` }} /></div>
            </div>
            {course.id === "course-cip004-annual-refresher" && state.percent > 0 && !sessionStorage.getItem("gridguard.welcomeBack") ? <div className="mx-auto max-w-[760px]"><WelcomeBack percent={state.percent} /></div> : null}
            <div className="mx-auto mt-8 max-w-[760px] text-[17px] leading-8">
              {isAssessment ? <AssessmentPanel course={course} /> : isAcknowledgement ? <AcknowledgementPanel course={course} block={blocks.find((block) => block.type === "acknowledgement")} /> : blocks.map((block) => <LessonBlock key={block.id} block={block} courseId={course.id} lessonId={lesson.id} onComplete={completeActivity} />)}
            </div>
          </article>
        </main>
      </div>
      <div className="border-t border-border bg-background/95 px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-[1100px] justify-between gap-3">
          <button className="min-h-11 rounded-md border border-border px-4 py-2 text-sm" disabled={index === 0} onClick={() => navigate(`/learn/${course.id}/${lessons[index - 1].id}`)}>Previous</button>
          {!lessonDone && !isAssessment && !isAcknowledgement ? <button className="min-h-11 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!canCompleteLesson} onClick={complete}>{canCompleteLesson ? "Complete & Continue" : "Complete Required Activity"}</button> : index < lessons.length - 1 ? <button className="min-h-11 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" onClick={() => navigate(`/learn/${course.id}/${lessons[index + 1].id}`)}>Continue</button> : <Link className="min-h-11 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to="/my-learning">Return to My Learning</Link>}
        </div>
      </div>
      {notesOpen ? <LearningDrawer title="Notes" onClose={() => setNotesOpen(false)}><textarea className="min-h-64 w-full rounded-md border border-border bg-transparent p-3 text-sm" placeholder="Write a private note..." value={note} onChange={(event) => void saveNote(event.target.value)} /><p className="mt-3 text-xs text-muted-foreground">Private note for {lesson.title}</p></LearningDrawer> : null}
      {resourcesOpen ? <LearningDrawer title="Resources" onClose={() => setResourcesOpen(false)}><div className="space-y-2">{resources.map((resource) => resource.url?.startsWith("http") ? <a key={resource.id} className="block rounded-md border border-border p-3 text-sm" href={resource.url} target="_blank" rel="noreferrer"><FileText size={15} className="mr-2 inline" />{resource.title}<p className="mt-1 text-xs text-muted-foreground">{resource.description}</p></a> : <Link key={resource.id} className="block rounded-md border border-border p-3 text-sm" to={`/resources/${resource.id}`}><FileText size={15} className="mr-2 inline" />{resource.title}<p className="mt-1 text-xs text-muted-foreground">{resource.description}</p></Link>)}</div></LearningDrawer> : null}
    </div>
  );
}

function ResourceDetail() {
  const { resourceId } = useParams();
  const { data } = useApp();
  const resource = data.courseResources.find((item) => item.id === resourceId);
  if (!resource) return <NotFound />;
  const course = data.courses.find((item) => item.id === resource.courseId);
  const standard = course?.subcategory ?? "NERC CIP";
  const resourceText = resource.title.includes("Glossary")
    ? ["Access - Permission to use a system, facility, record, or capability.", "Approval - Documented authorization from a responsible owner.", "Evidence - Information retained to demonstrate an activity occurred.", "Traceability - The ability to connect a record to person, activity, timing, result, and process.", "Version - The specific course or procedure release associated with a record."]
    : resource.title.includes("Reference")
      ? [`Use this ${standard} reference to confirm the course's primary standard alignment. Exact requirement text and effective status are managed in the Standards workspace.`]
      : [`Use this checklist while applying ${course?.shortTitle ?? course?.title ?? "this course"} concepts.`, "Identify the trigger or purpose.", "Confirm the responsible owner.", "Follow the approved organizational process.", "Retain date, scope, result, and supporting reference.", "Escalate uncertainty rather than filling gaps with assumptions."];
  return (
    <>
      <PageHeader title={resource.title} subtitle={`${course?.title ?? "GridGuard Learning"} · Last updated ${new Date(resource.updatedAt).toLocaleDateString()}`} action={<button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => window.print()}>Print</button>} />
      <Panel>
        <p className="text-sm text-muted-foreground">{resource.description}</p>
        <div className="mt-5 space-y-3">
          {resourceText.map((line) => <div key={line} className="rounded-md border border-border bg-muted/30 p-3 text-sm">{line}</div>)}
        </div>
        {course ? <Link className="mt-5 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/courses/${course.id}`}>Back to Course</Link> : null}
      </Panel>
    </>
  );
}

function LearningOutline({ course, lessons, activeLessonId, state, userId, onClose }: { course: Course; lessons: ReturnType<typeof sortedLessons>; activeLessonId: string; state: ReturnType<typeof getCourseCompletionState>; userId: string; onClose: () => void }) {
  const { data } = useApp();
  const modules = data.modules.filter((module) => module.courseVersionId === course.currentVersionId).sort((left, right) => left.position - right.position);
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[300px] overflow-y-auto border-r border-border bg-background p-4 shadow-lg lg:static lg:z-auto lg:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Course Outline</p>
          <h2 className="mt-1 text-sm font-semibold">{course.shortTitle ?? course.title}</h2>
        </div>
        <button className="rounded-md border border-border p-2 lg:hidden" aria-label="Close outline" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${state.percent}%` }} /></div>
      <p className="mt-1 text-xs text-muted-foreground">{state.completedItems.length} / {state.requiredItems.length} required complete</p>
      <div className="mt-5 space-y-4">
        {modules.map((module) => {
          const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id);
          const moduleComplete = moduleLessons.length > 0 && moduleLessons.every((lesson) => data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === lesson.id && progress.completedAt));
          const moduleCurrent = moduleLessons.some((lesson) => lesson.id === activeLessonId);
          return (
            <section key={module.id}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{moduleComplete ? "✓" : moduleCurrent ? "●" : "○"}</span>
                <span>{module.title}</span>
              </div>
              <div className="mt-2 space-y-1">
                {moduleLessons.map((lesson) => {
                  const done = data.lessonProgress.some((progress) => progress.userId === userId && progress.lessonId === lesson.id && progress.completedAt);
                  const locked = lesson.title.toLowerCase().includes("final assessment") && !state.canStartAssessment;
                  return <Link key={lesson.id} className={`block rounded-md px-3 py-2 text-sm ${lesson.id === activeLessonId ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100" : "text-muted-foreground"}`} to={`/learn/${course.id}/${lesson.id}`}>{done ? "✓" : locked ? "lock" : "○"} {lesson.title}<span className="mt-0.5 block text-xs">{lesson.estimatedMinutes} min</span></Link>;
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function LearningDrawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/30" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ml-auto h-full w-full max-w-md overflow-y-auto border-l border-border bg-background p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="rounded-md border border-border p-2" aria-label={`Close ${title}`} onClick={onClose}><X size={16} /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
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
  if (block.type === "audit_lens" || block.type === "audit_tip") return <AuditLensBlock block={block} />;
  if (block.type === "before_after" || block.type === "comparison") return <BeforeAfterBlock block={block} />;
  if (block.type === "system_inspector") return <InspectorActivity block={block} onComplete={onComplete} kind="system" />;
  if (block.type === "evidence_inspector" || block.type === "build_record") return <InspectorActivity block={block} onComplete={onComplete} kind="evidence" />;
  if (block.type === "network_explorer" || block.type === "coverage_map") return <NetworkExplorerBlock block={block} onComplete={onComplete} />;
  if (block.type === "sequence_builder" || block.type === "ordering") return <SequenceBuilderBlock block={block} onComplete={onComplete} />;
  if (block.type === "decision_cards" || block.type === "quick_recall") return <DecisionCardsBlock block={block} onComplete={onComplete} />;
  if (block.type === "rapid_decisions") return <RapidDecisionsBlock block={block} onComplete={onComplete} />;
  if (block.type === "matching") return <MatchingBlock block={block} onComplete={onComplete} />;
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

function AuditLensBlock({ block }: { block: ContentBlock }) {
  const data = block.data as { reviewerQuestions?: string[]; evidenceExamples?: string[]; intro?: string } | undefined;
  const questions = data?.reviewerQuestions ?? ["Who performed the activity?", "What was reviewed?", "When did it occur?", "What result was reached?", "Which evidence supports it?"];
  return <details className="mb-5 rounded-md border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950" open><summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Audit Lens</summary><p className="mt-3 text-sm leading-6 text-cyan-950 dark:text-cyan-100">{data?.intro ?? block.body ?? "How might another reviewer examine this activity?"}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{questions.map((question) => <li key={question}>{question}</li>)}</ul>{data?.evidenceExamples?.length ? <div className="mt-3 rounded-md bg-background/70 p-3 text-sm"><p className="font-medium">Evidence examples</p><ul className="mt-1 list-disc pl-5">{data.evidenceExamples.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</details>;
}

function BeforeAfterBlock({ block }: { block: ContentBlock }) {
  const data = block.data as { beforeTitle?: string; before?: string[]; afterTitle?: string; after?: string[]; improvements?: string[] } | undefined;
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="font-semibold">{block.title ?? "Before / After"}</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-md bg-muted/50 p-4"><p className="font-medium">{data?.beforeTitle ?? "Weak"}</p><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{(data?.before ?? ["Unclear owner", "No date", "No result"]).map((item) => <li key={item}>{item}</li>)}</ul></div><div className="rounded-md border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950"><p className="font-medium">{data?.afterTitle ?? "Stronger"}</p><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{(data?.after ?? ["Known owner", "Clear date", "Traceable result"]).map((item) => <li key={item}>{item}</li>)}</ul></div></div>{data?.improvements?.length ? <p className="mt-3 text-sm text-muted-foreground">What improved: {data.improvements.join(", ")}</p> : null}</div>;
}

function InspectorActivity({ block, onComplete, kind }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void>; kind: "system" | "evidence" }) {
  const { data, user } = useApp();
  const saved = data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
  const config = block.data as { prompt?: string; columns?: string[]; rows?: string[][]; fields?: Array<{ label: string; value: string; state?: string; expected?: boolean }>; expected?: number[]; feedback?: string };
  const rows = config.rows ?? [["SSH", "22", "Admin", "Approved"], ["FTP", "21", "Legacy", "Owner Missing"], ["TempAdmin", "Privileged", "Project ended", "Expired"]];
  const fields = config.fields ?? rows.map((row, index) => ({ label: row[0], value: row.slice(1).join(" · "), expected: (config.expected ?? [1]).includes(index), state: row[row.length - 1] }));
  const [selected, setSelected] = useState<number[]>([]);
  const check = async () => {
    const expected = fields.map((field, index) => field.expected ? index : -1).filter((index) => index >= 0);
    const ok = expected.length === selected.length && expected.every((index) => selected.includes(index));
    if (ok) await onComplete(block.id, { selected }, 100);
  };
  return <div className="mb-5 rounded-md border border-border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{kind === "system" ? "System Inspector" : "Evidence Inspector"}</p><h3 className="mt-1 text-lg font-semibold">{block.title ?? (kind === "system" ? "Inspect the System" : "Inspect the Record")}</h3><p className="mt-2 text-sm text-muted-foreground">{config.prompt ?? "Select the items that deserve further review."}</p><div className="mt-4 space-y-2">{fields.map((field, index) => <label key={`${field.label}-${index}`} className="flex min-h-12 items-start gap-3 rounded-md border border-border p-3 text-sm"><input className="mt-1" type="checkbox" checked={selected.includes(index)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, index] : items.filter((item) => item !== index))} /><span><span className="block font-medium">{field.label}</span><span className="text-muted-foreground">{field.value}</span></span></label>)}</div>{saved ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Required activity complete.</p> : <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={check}>Review Selection</button>}</div>;
}

function NetworkExplorerBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const { data, user } = useApp();
  const saved = data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
  const config = block.data as { nodes?: string[]; prompt?: string; expected?: number[] };
  const nodes = config.nodes ?? ["External", "Gateway", "Protected Network", "Server A", "Unmonitored Path"];
  const [selected, setSelected] = useState<number[]>([]);
  const complete = async () => {
    const expected = config.expected ?? [nodes.length - 1];
    if (expected.every((item) => selected.includes(item))) await onComplete(block.id, { selected }, 100);
  };
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="font-semibold">{block.title ?? "Network Explorer"}</h3><p className="mt-2 text-sm text-muted-foreground">{config.prompt ?? "Explore the path and identify the item that needs review."}</p><div className="mt-4 grid gap-2 sm:grid-cols-5">{nodes.map((node, index) => <button key={node} className={`min-h-16 rounded-md border p-3 text-sm ${selected.includes(index) ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-border"}`} onClick={() => setSelected((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])}>{node}</button>)}</div>{saved ? <p className="mt-3 text-sm text-emerald-700">Explorer complete.</p> : <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={complete}>Verify Path</button>}</div>;
}

function SequenceBuilderBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const config = block.data as { steps?: string[]; prompt?: string };
  const correct = config.steps ?? ["Identify", "Evaluate", "Decide", "Implement/Mitigate", "Verify", "Document"];
  const [items, setItems] = useState([...correct].sort().reverse());
  const move = (index: number, direction: number) => setItems((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const submit = async () => { if (items.every((item, index) => item === correct[index])) await onComplete(block.id, { items }, 100); };
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="font-semibold">{block.title ?? "Sequence Builder"}</h3><p className="mt-2 text-sm text-muted-foreground">{config.prompt ?? "Put the process in the recommended order."}</p><ol className="mt-3 space-y-2">{items.map((item, index) => <li key={item} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"><span>{index + 1}. {item}</span><span className="flex gap-1"><button className="rounded border px-2" onClick={() => move(index, -1)}>Up</button><button className="rounded border px-2" onClick={() => move(index, 1)}>Down</button></span></li>)}</ol><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={submit}>Submit Sequence</button></div>;
}

function DecisionCardsBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const config = block.data as { question?: string; prompt?: string; options?: string[]; correct?: number; feedback?: string };
  const options = config.options ?? ["Use the approved process and preserve context.", "Take an informal shortcut.", "Wait until audit.", "Remove the record."];
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = selected === (config.correct ?? 0);
  const submit = async () => {
    setSubmitted(true);
    if (correct && block.required) await onComplete(block.id, { selected }, 100);
  };
  return <div className="mb-5 rounded-md border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{block.type === "quick_recall" ? "Quick Recall" : "Decision"}</p><h3 className="mt-1 font-semibold">{block.title ?? "Choose the Best Response"}</h3><p className="mt-2 text-sm text-muted-foreground">{config.question ?? config.prompt ?? block.body}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{options.map((option, index) => <button key={option} className={`rounded-md border p-3 text-left text-sm ${selected === index ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-border"}`} onClick={() => setSelected(index)}>{option}</button>)}</div><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={selected === null} onClick={submit}>Submit</button>{submitted ? <p className="mt-3 rounded-md bg-muted p-3 text-sm">{correct ? "Correct. " : "Not quite. "}{config.feedback ?? "Remember to choose the response that follows the approved process and creates a traceable result."}</p> : null}</div>;
}

function RapidDecisionsBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const config = block.data as { cards?: Array<{ prompt: string; correct: string; feedback?: string }>; actions?: string[] };
  const cards = config.cards ?? [{ prompt: "Unexpected MFA request you did not initiate.", correct: "REPORT", feedback: "Unexpected MFA should be denied and reported." }, { prompt: "Approved scheduled VPN login.", correct: "PROCEED", feedback: "Known approved activity may proceed." }];
  const actions = config.actions ?? ["PROCEED", "VERIFY", "REPORT"];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const card = cards[index];
  const choose = async (action: string) => {
    const next = [...answers, action];
    setAnswers(next);
    if (index === cards.length - 1) await onComplete(block.id, { answers: next, aligned: next.filter((item, answerIndex) => item === cards[answerIndex].correct).length }, 100);
    else setIndex((value) => value + 1);
  };
  if (answers.length === cards.length) return <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">Rapid decisions complete. {answers.filter((item, answerIndex) => item === cards[answerIndex].correct).length} of {cards.length} decisions aligned with the recommended action.</div>;
  return <div className="mb-5 rounded-md border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Rapid Decisions</p><h3 className="mt-1 font-semibold">{block.title ?? "Choose the Best Action"}</h3><p className="mt-3 rounded-md bg-muted/50 p-4 text-base">{card.prompt}</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{actions.map((action) => <button key={action} className="min-h-12 rounded-md border border-border px-3 py-2 text-sm font-medium" onClick={() => choose(action)}>{action}</button>)}</div><p className="mt-3 text-xs text-muted-foreground">Card {index + 1} of {cards.length}</p></div>;
}

function MatchingBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const config = block.data as { prompt?: string; pairs?: Array<{ left: string; right: string }>; rightItems?: string[] };
  const pairs = config.pairs ?? [{ left: "Evidence", right: "Information retained to demonstrate an activity occurred." }, { left: "Procedure", right: "Steps for performing work consistently." }];
  const rightItems = config.rightItems ?? pairs.map((pair) => pair.right).sort();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = async () => {
    if (pairs.every((pair) => answers[pair.left] === pair.right)) await onComplete(block.id, answers, 100);
  };
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="font-semibold">{block.title ?? "Matching"}</h3><p className="mt-2 text-sm text-muted-foreground">{config.prompt ?? "Match each concept to the best definition."}</p><div className="mt-3 space-y-3">{pairs.map((pair) => <label key={pair.left} className="grid gap-2 text-sm sm:grid-cols-[1fr_1fr]"><span className="font-medium">{pair.left}</span><select className="rounded-md border border-border bg-transparent p-2" value={answers[pair.left] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [pair.left]: event.target.value }))}><option value="">Choose match</option>{rightItems.map((item) => <option key={item}>{item}</option>)}</select></label>)}</div><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={submit}>Submit Matches</button></div>;
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
  const lessonCompleted = data.lessonProgress.some((progress) => progress.userId === user.id && progress.lessonId === block.lessonId && progress.completedAt);
  const saved = lessonCompleted || data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
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
  return <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><p className="text-xs font-semibold uppercase tracking-wide">Training Complete</p><h2 className="mt-1 text-2xl font-semibold">You completed {course.shortTitle ?? course.title}</h2><p className="mt-2 text-sm">Your completion record, assessment result, required activity state, and certificate data where applicable have been saved.</p><div className="mt-4 grid gap-3 md:grid-cols-4"><Info label="Required Items" value={`${state.completedItems.length} / ${state.requiredItems.length} Complete`} /><Info label="Required Activities" value={state.remainingItems.filter((item) => item.startsWith("block")).length ? "Pending" : "Complete"} /><Info label="Assessment" value={`${state.score ?? evidence?.assessmentScore ?? 0}% Passed`} /><Info label="Certificate" value={cert ? "Issued" : course.certificateEnabled ? "Pending" : "Not enabled"} /></div><div className="mt-4 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/certifications">View Certificate</Link><Link className="rounded-md border border-emerald-300 px-3 py-2 text-sm" to={`/records/${course.id}`}>View Training Record</Link><Link className="rounded-md border border-emerald-300 px-3 py-2 text-sm" to="/my-learning">Return to My Learning</Link></div>{cert ? <p className="mt-3 text-sm">Certificate: {cert.certificateId}</p> : null}<CourseFeedback courseId={course.id} /></div>;
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
  return <><PageHeader title="Training Record" subtitle="Completed learner transcript detail." /><Panel><div className="grid gap-3 md:grid-cols-2"><Info label="Learner" value={user.name} /><Info label="Employee / learner identifier" value={user.id.slice(0, 12)} /><Info label="Course" value={course.title} /><Info label="Course version" value={version?.version ?? "1.0"} /><Info label="Standard" value={course.subcategory ?? "NERC CIP"} /><Info label="Assignment date" value={enrollment?.startedAt ? new Date(enrollment.startedAt).toLocaleDateString() : "Assigned"} /><Info label="Start date" value={enrollment?.startedAt ? new Date(enrollment.startedAt).toLocaleDateString() : "Started"} /><Info label="Completion date" value={evidence?.completedAt ? new Date(evidence.completedAt).toLocaleDateString() : "Not complete"} /><Info label="Final assessment" value={`${evidence?.assessmentScore ?? "N/A"}%`} /><Info label="Passing score" value="80%" /><Info label="Attempts used" value={String(data.assessmentAttempts.filter((attempt) => attempt.userId === user.id && attempt.courseId === course.id).length || 1)} /><Info label="Required Activities" value={evidence ? "Completed" : "In progress"} /><Info label="Acknowledgement" value={data.acknowledgements.some((item) => item.userId === user.id && item.courseId === course.id) ? "Submitted" : course.requireAcknowledgement ? "Pending" : "Not required"} /><Info label="Certificate" value={cert?.certificateId ?? "Not issued"} /><Info label="Record status" value={evidence ? "Complete" : "In Progress"} /></div></Panel></>;
}

function PracticeCenter() {
  const { data, user } = useApp();
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("All");
  const recommendations = LearningRecommendationService.getRecommendations(data, user.id).filter((item) => item.recommendationType === "PRACTICE_ACTIVITY" || item.recommendationType === "REFRESHER");
  const visible = data.practiceActivities.filter((activity) => activity.status === "PUBLISHED" && (!query || [activity.title, activity.description, activity.activityType].join(" ").toLowerCase().includes(query.toLowerCase())) && (skill === "All" || activity.skillIds.includes(skill)));
  const recent = data.practiceAttempts.filter((attempt) => attempt.userId === user.id).slice(-5).reverse();
  const categories = ["QUICK_CHALLENGE", "EVIDENCE_CHALLENGE", "SYSTEM_INSPECTION", "DECISION_EXERCISE", "KNOWLEDGE_REFRESH", "MICROLEARNING"];
  return (
    <>
      <PageHeader title="Practice" subtitle="Strengthen specific skills with short, focused learning activities." />
      {recommendations.length ? <div className="grid gap-4 lg:grid-cols-2">{recommendations.slice(0, 2).map((recommendation) => {
        const activity = data.practiceActivities.find((item) => item.id === recommendation.targetId);
        return activity ? <PracticeCard key={recommendation.id} activity={activity} reason={recommendation.reason} /> : null;
      })}</div> : null}
      <Panel className="mt-5">
        <div className="flex flex-wrap gap-3">
          <input className="h-10 min-w-72 rounded-md border border-border bg-transparent px-3" placeholder="Search practice, skills, or topics" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="h-10 rounded-md border border-border bg-transparent px-3" value={skill} onChange={(event) => setSkill(event.target.value)}>
            <option value="All">All skills</option>
            {data.skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {categories.map((category) => {
            const activities = visible.filter((activity) => activity.activityType === category);
            return activities.length ? <section key={category}><h2 className="mb-3 text-lg font-semibold">{titleize(category.toLowerCase())}</h2><div className="grid gap-4 lg:grid-cols-2">{activities.map((activity) => <PracticeCard key={activity.id} activity={activity} />)}</div></section> : null;
          })}
          {!visible.length ? <EmptyState text="No practice activities match these filters." action="Clear Filters" onClick={() => { setQuery(""); setSkill("All"); }} /> : null}
        </div>
        <Panel>
          <h2 className="font-semibold">Recent Practice</h2>
          <div className="mt-3 space-y-2 text-sm">
            {recent.map((attempt) => <div key={attempt.id} className="rounded-md border border-border p-3"><p className="font-medium">{data.practiceActivities.find((activity) => activity.id === attempt.practiceActivityId)?.title}</p><p className="text-muted-foreground">{attempt.topicResults[0]?.result.replaceAll("_", " ") ?? "Completed"} · {attempt.durationSeconds ? Math.round(attempt.durationSeconds / 60) : 0} min</p></div>)}
            {!recent.length ? <p className="text-muted-foreground">No practice attempts yet.</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PracticeCard({ activity, reason }: { activity: AppData["practiceActivities"][number]; reason?: string }) {
  const { data } = useApp();
  return <Panel><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{activity.activityType.replaceAll("_", " ")}</p><h3 className="mt-2 font-semibold">{activity.title}</h3><p className="mt-1 text-sm text-muted-foreground">{activity.description}</p><p className="mt-3 text-sm">{activity.estimatedMinutes} min · {titleize(activity.difficulty.toLowerCase())}</p><p className="mt-2 text-xs text-muted-foreground">Skills: {activity.skillIds.map((idValue) => data.skills.find((skill) => skill.id === idValue)?.name).filter(Boolean).join(", ")}</p>{reason ? <div className="mt-3 rounded-md bg-cyan-50 p-3 text-sm text-cyan-950 dark:bg-cyan-950 dark:text-cyan-100">Recommended because: {reason}</div> : null}<Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" to={`/practice/${activity.id}`}>Practice Now</Link></Panel>;
}

function PracticeActivityPage() {
  const { activityId } = useParams();
  const { data, user, service, setData, toast } = useApp();
  const navigate = useNavigate();
  const activity = data.practiceActivities.find((item) => item.id === activityId);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  if (!activity) return <NotFound />;
  const submit = async () => {
    const svc = service();
    const attempt = await svc.completePracticeActivity(activity.id, answers, "SELF_SELECTED");
    setData(svc.snapshot());
    toast("Practice completed");
    setDone(true);
    return attempt;
  };
  if (done) {
    const latest = data.practiceAttempts.filter((attempt) => attempt.userId === user.id && attempt.practiceActivityId === activity.id).at(-1);
    return <><PageHeader title="Challenge Complete" subtitle={activity.title} /><Panel><h2 className="text-2xl font-semibold">Recommended action</h2><p className="mt-2 text-muted-foreground">{activity.blocks.find((block) => block.type === "decision_cards")?.body ?? "Follow the approved process and retain useful evidence."}</p><div className="mt-4 grid gap-3 md:grid-cols-3"><Info label="Result" value={latest?.topicResults[0]?.result.replaceAll("_", " ") ?? "Strong"} /><Info label="Skill" value={activity.skillIds.map((idValue) => data.skills.find((skill) => skill.id === idValue)?.name).filter(Boolean).join(", ")} /><Info label="Record" value="Practice activity saved" /></div><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/practice">Try Another</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/skills">View Skills</Link><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => navigate("/home")}>Return Home</button></div></Panel></>;
  }
  return (
    <>
      <PageHeader title={activity.title} subtitle={`${activity.activityType.replaceAll("_", " ")} · ${activity.estimatedMinutes} min · ${activity.difficulty}`} />
      <div className="mx-auto max-w-3xl">
        {activity.blocks.map((block) => block.type === "decision_cards" ? <PracticeDecision key={block.id} block={block} value={answers[block.id]} onChange={(value) => setAnswers((current) => ({ ...current, [block.id]: value }))} /> : <Panel key={block.id} className="mb-4"><h2 className="font-semibold">{block.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-line">{block.body}</p></Panel>)}
        <button className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!activity.blocks.filter((block) => block.required).every((block) => answers[block.id] !== undefined)} onClick={submit}>Complete Challenge</button>
      </div>
    </>
  );
}

function PracticeDecision({ block, value, onChange }: { block: AppData["practiceActivities"][number]["blocks"][number]; value?: number; onChange: (value: number) => void }) {
  const data = block.data as { question?: string; options?: string[]; correct?: number; feedback?: string[] } | undefined;
  return <Panel className="mb-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Decision</p><h2 className="mt-2 text-xl font-semibold">{data?.question ?? block.title}</h2><div className="mt-4 grid gap-3">{(data?.options ?? []).map((option, index) => <button key={option} className={`rounded-md border p-4 text-left ${value === index ? "border-cyan-700 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => onChange(index)}>{option}{value === index ? <p className="mt-2 text-sm text-muted-foreground">{data?.feedback?.[index]}</p> : null}</button>)}</div></Panel>;
}

function ScenarioLab() {
  const { data } = useApp();
  const categories = Array.from(new Set(data.scenarioDefinitions.map((scenario) => scenario.category)));
  return <><PageHeader title="Scenario Lab" subtitle="Practice making cybersecurity and compliance decisions in realistic situations." /><div className="grid gap-4 md:grid-cols-4">{["Personnel", "Access", "System Security", "Incident Response"].map((label) => <Panel key={label}><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">{data.scenarioDefinitions.filter((scenario) => scenario.category.includes(label)).length} scenarios</p></Panel>)}</div><div className="mt-5 space-y-5">{categories.map((category) => <section key={category}><h2 className="mb-3 text-lg font-semibold">{category}</h2><div className="grid gap-4 lg:grid-cols-2">{data.scenarioDefinitions.filter((scenario) => scenario.category === category).map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} />)}</div></section>)}</div></>;
}

function ScenarioCard({ scenario }: { scenario: AppData["scenarioDefinitions"][number] }) {
  const { data } = useApp();
  return <Panel><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{scenario.category}</p><h3 className="mt-2 font-semibold">{scenario.title}</h3><p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p><p className="mt-3 text-sm">{scenario.estimatedMinutes} min · {scenario.difficulty}</p><p className="mt-2 text-xs text-muted-foreground">Skills: {scenario.skillIds.map((idValue) => data.skills.find((skill) => skill.id === idValue)?.name).filter(Boolean).join(", ")}</p><Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white" to={`/scenarios/${scenario.id}`}>Start Scenario</Link></Panel>;
}

function ScenarioDetail() {
  const { scenarioId } = useParams();
  const { data, service, setData } = useApp();
  const navigate = useNavigate();
  const scenario = data.scenarioDefinitions.find((item) => item.id === scenarioId);
  if (!scenario) return <NotFound />;
  const attempts = data.branchingScenarioAttempts.filter((attempt) => attempt.scenarioId === scenario.id);
  const start = async (replayOfAttemptId?: string) => {
    const svc = service();
    const attempt = await svc.startBranchingScenario(scenario.id, replayOfAttemptId);
    setData(svc.snapshot());
    navigate(`/scenarios/${scenario.id}/run/${attempt.id}`);
  };
  return <><PageHeader title={scenario.title} subtitle={scenario.description} action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => start()}>Start Scenario</button>} /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><h2 className="font-semibold">What You’ll Practice</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{scenario.skillIds.map((idValue) => <li key={idValue}>{data.skills.find((skill) => skill.id === idValue)?.name}</li>)}</ul><h2 className="mt-6 font-semibold">Related Courses</h2><div className="mt-3 flex flex-wrap gap-2">{scenario.relatedCourseIds.map((idValue) => <Link key={idValue} className="rounded-md border border-border px-3 py-2 text-sm" to={`/courses/${idValue}`}>{data.courses.find((course) => course.id === idValue)?.shortTitle ?? idValue}</Link>)}</div></Panel><Panel><h2 className="font-semibold">Previous Attempts</h2><div className="mt-3 space-y-2">{attempts.map((attempt) => <div key={attempt.id} className="rounded-md border border-border p-3 text-sm"><p>{attempt.completedAt ? "Completed" : "In progress"} · {attempt.overallResult.replaceAll("_", " ")}</p><button className="mt-2 rounded-md border border-border px-2 py-1 text-xs" onClick={() => start(attempt.id)}>Replay</button></div>)}{!attempts.length ? <p className="text-sm text-muted-foreground">No attempts yet.</p> : null}</div></Panel></div></>;
}

function ScenarioRun() {
  const { scenarioId, attemptId } = useParams();
  const { data, service, setData, toast } = useApp();
  const navigate = useNavigate();
  const scenario = data.scenarioDefinitions.find((item) => item.id === scenarioId);
  const attempt = data.branchingScenarioAttempts.find((item) => item.id === attemptId);
  if (!scenario || !attempt) return <NotFound />;
  if (attempt.completedAt) return <ScenarioResult scenario={scenario} attempt={attempt} />;
  const step = scenario.steps.find((item) => item.id === attempt.currentStepId) ?? scenario.steps[0];
  const choose = async (choice: NonNullable<AppData["scenarioDefinitions"][number]["steps"][number]["choices"]>[number]) => {
    const svc = service();
    const nextAttempt = await svc.chooseScenarioChoice(attempt.id, step.id, choice.id);
    setData(svc.snapshot());
    toast(choice.quality === "RECOMMENDED" ? "Recommended decision saved" : "Decision saved");
    if (nextAttempt.completedAt) navigate(`/scenarios/${scenario.id}/run/${attempt.id}`);
  };
  return <div className="-m-4 min-h-[calc(100vh-2rem)] bg-slate-950 p-4 text-slate-100 md:-m-6 md:p-6"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{scenario.category} · Step {scenario.steps.findIndex((item) => item.id === step.id) + 1} of {scenario.steps.length}</p><h1 className="mt-1 text-3xl font-semibold">{scenario.title}</h1></div><Link className="rounded-md border border-slate-700 px-3 py-2 text-sm" to={`/scenarios/${scenario.id}`}>Exit Scenario</Link></div><div className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]"><section className="rounded-md border border-slate-800 bg-slate-900 p-4"><h2 className="font-semibold">Workspace State</h2><div className="mt-3 space-y-2 text-sm">{Object.entries(attempt.currentState).map(([key, value]) => <div key={key} className="flex justify-between gap-3 border-b border-slate-800 py-2"><span className="text-slate-400">{titleize(key)}</span><span>{String(value)}</span></div>)}</div></section><section className="rounded-md border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">{step.title ?? "Decision"}</h2><p className="mt-3 leading-7 text-slate-300">{step.narrative}</p><div className="mt-5 grid gap-3">{step.choices?.map((choice) => <button key={choice.id} className="rounded-md border border-slate-700 bg-slate-950 p-4 text-left hover:border-cyan-400 focus:border-cyan-400" onClick={() => choose(choice)}><span className="font-medium">{choice.label}</span>{choice.description ? <span className="mt-1 block text-sm text-slate-400">{choice.description}</span> : null}</button>)}</div></section></div></div></div>;
}

function ScenarioResult({ scenario, attempt }: { scenario: AppData["scenarioDefinitions"][number]; attempt: AppData["branchingScenarioAttempts"][number] }) {
  return <><PageHeader title="Scenario Complete" subtitle={scenario.title} /><Panel><h2 className="text-2xl font-semibold">Overall: {attempt.overallResult.replaceAll("_", " ")}</h2><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h3 className="font-semibold">Strong decisions</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{attempt.decisions.filter((decision) => decision.quality === "RECOMMENDED").map((decision) => <li key={`${decision.stepId}-${decision.choiceId}`}>{decision.feedback}</li>)}</ul></div><div><h3 className="font-semibold">Review opportunities</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{attempt.decisions.filter((decision) => decision.quality !== "RECOMMENDED").map((decision) => <li key={`${decision.stepId}-${decision.choiceId}`}>{decision.feedback}</li>)}</ul></div></div><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/scenarios/${scenario.id}`}>Replay</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/practice">Recommended Practice</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/scenarios">Return to Scenario Lab</Link></div></Panel></>;
}

function RecommendationsPage() {
  const { data, user, service, setData, toast } = useApp();
  const recommendations = LearningRecommendationService.getRecommendations(data, user.id);
  const dismiss = async (idValue: string) => { const svc = service(); await svc.dismissRecommendation(idValue); setData(svc.snapshot()); toast("Recommendation dismissed"); };
  return <><PageHeader title="Recommendations" subtitle="Your next learning actions based on assignments, progress, skills, and reinforcement." /><div className="grid gap-4 lg:grid-cols-2">{recommendations.map((recommendation) => <Panel key={recommendation.id}><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{recommendation.reasonCode.replaceAll("_", " ")}</p><h2 className="mt-2 font-semibold">{recommendation.title}</h2><p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p><div className="mt-4 flex gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={recommendation.href}>Open</Link>{!recommendation.required ? <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => dismiss(recommendation.id)}>Dismiss</button> : null}</div></Panel>)}</div></>;
}

function FollowUpsPage() {
  const { data, user, service, setData, toast } = useApp();
  const [title, setTitle] = useState("");
  const mine = data.learnerFollowUps.filter((item) => item.userId === user.id);
  const create = async () => { if (!title.trim()) return; const svc = service(); await svc.createLearnerFollowUp({ title, sourceType: "MANUAL" }); setData(svc.snapshot()); setTitle(""); toast("Follow-up saved"); };
  const complete = async (idValue: string) => { const svc = service(); await svc.updateFollowUp(idValue, { completed: true }); setData(svc.snapshot()); };
  return <><PageHeader title="My Follow-Ups" subtitle="Private actions you want to remember after training." /><Panel><div className="flex gap-2"><input className="h-10 flex-1 rounded-md border border-border bg-transparent px-3" placeholder="Add a private follow-up..." value={title} onChange={(event) => setTitle(event.target.value)} /><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={create}>Add</button></div></Panel><div className="mt-5 grid gap-4 lg:grid-cols-2">{mine.map((followUp) => <Panel key={followUp.id}><h2 className="font-semibold">{followUp.title}</h2><p className="mt-1 text-sm text-muted-foreground">{followUp.visibility === "PRIVATE" ? "Private" : "Shared with manager"} · {followUp.completedAt ? "Completed" : "Open"}</p>{!followUp.completedAt ? <button className="mt-3 rounded-md border border-border px-3 py-2 text-sm" onClick={() => complete(followUp.id)}>Mark Complete</button> : null}</Panel>)}</div></>;
}

function LearningMapPage() {
  const { data, user } = useApp();
  const nodes = ["course-annual-awareness", "course-cip004-foundations", "course-cip005-esp-access", "course-cip006-physical-security", "course-cip007-system-security", "course-cip010-change-vulnerability", "course-cip008-incident-response", "course-cip015-insm", "course-cip002-categorization", "course-cip003-security-management", "course-audit-preparation"];
  return <><PageHeader title="Learning Map" subtitle="See how NERC CIP capabilities build across courses, practice, and scenarios." /><Panel><div className="grid gap-3 md:grid-cols-3">{nodes.map((courseId, index) => { const course = data.courses.find((item) => item.id === courseId); if (!course) return null; const state = getCourseCompletionState(data, user.id, course.id); return <Link key={course.id} className="rounded-md border border-border p-4 hover:border-cyan-700" to={`/courses/${course.id}`}><p className="text-xs text-muted-foreground">Step {index + 1}</p><h2 className="mt-1 font-semibold">{course.shortTitle ?? course.title}</h2><p className="mt-2 text-sm text-muted-foreground">{state.courseComplete ? "Complete" : state.percent ? "In Progress" : "Available"} · {state.percent}%</p></Link>; })}</div></Panel></>;
}

function CampaignLearnerPage() {
  const { campaignId } = useParams();
  const { data } = useApp();
  const campaign = data.learningCampaigns.find((item) => item.id === campaignId);
  if (!campaign) return <NotFound />;
  return <><PageHeader title={campaign.title} subtitle={campaign.description} /><Panel><p className="text-sm text-muted-foreground">Due {campaign.dueAt ? new Date(campaign.dueAt).toLocaleDateString() : "No due date"}.</p><div className="mt-4 space-y-2">{campaign.items.sort((left, right) => left.order - right.order).map((item) => <CampaignItem key={item.id} item={item} />)}</div></Panel></>;
}

function CampaignItem({ item }: { item: AppData["learningCampaigns"][number]["items"][number] }) {
  const { data } = useApp();
  const label = item.itemType === "COURSE" ? data.courses.find((course) => course.id === item.targetId)?.title : item.itemType === "PRACTICE" ? data.practiceActivities.find((activity) => activity.id === item.targetId)?.title : data.scenarioDefinitions.find((scenario) => scenario.id === item.targetId)?.title;
  const href = item.itemType === "COURSE" ? `/courses/${item.targetId}` : item.itemType === "PRACTICE" ? `/practice/${item.targetId}` : `/scenarios/${item.targetId}`;
  return <Link className="flex items-center justify-between rounded-md border border-border p-3 text-sm" to={href}><span>{label}</span><span className="text-muted-foreground">{item.required ? "Required" : "Optional"}</span></Link>;
}

function ManagerCoaching() {
  const { data, user, service, setData, toast } = useApp();
  const opportunities = getCoachingOpportunities(data, user.id);
  const assign = async (learnerId: string, activityId?: string) => {
    if (!activityId) return;
    const svc = service();
    await svc.assignLearningItem("PRACTICE", activityId, [{ audienceType: "USER", audienceId: learnerId }], addDays(new Date(), 14).toISOString(), "Practice assigned from manager coaching.");
    setData(svc.snapshot());
    toast("Practice assigned");
  };
  return <><PageHeader title="Coaching" subtitle="Identify meaningful learning opportunities based on recent activity." /><div className="grid gap-4 lg:grid-cols-2">{opportunities.map((item) => { const learner = data.users.find((candidate) => candidate.id === item.userId); const skill = data.skills.find((candidate) => candidate.id === item.skillId); const activity = data.practiceActivities.find((candidate) => candidate.id === item.activityId); return <Panel key={`${item.userId}-${item.skillId}`}><h2 className="font-semibold">{learner?.name}</h2><p className="mt-1 text-sm text-muted-foreground">{skill?.name} · {item.priority} priority</p><p className="mt-3 text-sm">Suggested: assign {activity?.title ?? "targeted practice"}.</p><button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => assign(item.userId, item.activityId)}>Assign Practice</button></Panel>; })}</div>{!opportunities.length ? <EmptyState text="No coaching opportunities require attention." action="View Team" href="/team" /> : null}</>;
}

function ManagerCampaigns() {
  const { data, user, service, setData, toast } = useApp();
  const create = async () => {
    const team = data.teams.find((item) => item.managerId === user.id) ?? data.teams[0];
    const svc = service();
    await svc.createCampaign({ title: "Q4 Cybersecurity Readiness", description: "Awareness, MFA practice, and incident scenario reinforcement.", audienceType: "TEAM", audienceIds: team ? [team.id] : [], dueAt: addDays(new Date(), 45).toISOString(), items: [{ id: "new-campaign-awareness", order: 1, itemType: "COURSE", targetId: "course-annual-awareness", required: true }, { id: "new-campaign-mfa", order: 2, itemType: "PRACTICE", targetId: "practice-unexpected-mfa", required: true }, { id: "new-campaign-admin", order: 3, itemType: "SCENARIO", targetId: "scenario-unexpected-admin-connection", required: true }] });
    setData(svc.snapshot());
    toast("Campaign created");
  };
  return <><PageHeader title="Campaigns" subtitle="Group courses, practice, and scenarios into a focused learning push." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={create}>Create Q4 Campaign</button>} /><div className="grid gap-4 lg:grid-cols-2">{data.learningCampaigns.map((campaign) => <Panel key={campaign.id}><h2 className="font-semibold">{campaign.title}</h2><p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p><p className="mt-3 text-sm">{campaign.items.length} items · {campaign.status}</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/campaigns/${campaign.id}`}>View Campaign</Link></Panel>)}</div></>;
}

function PracticeAuthoring() {
  const { data, service, setData, toast } = useApp();
  const create = async () => {
    const title = prompt("Practice activity title", "Temporary Elevated Access Challenge");
    if (!title) return;
    const svc = service();
    const snapshot = svc.snapshot();
    const skill = snapshot.skills.find((item) => item.name === "Access Management") ?? snapshot.skills[0];
    const idValue = `practice-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    const activity = {
      id: idValue,
      title,
      subtitle: "Author-created decision practice",
      description: "A short decision activity created in Course Management.",
      activityType: "DECISION_EXERCISE" as const,
      status: "PUBLISHED" as const,
      estimatedMinutes: 5,
      difficulty: "INTERMEDIATE" as const,
      standardIds: [],
      skillIds: skill ? [skill.id] : [],
      topicIds: skill ? [skill.id] : [],
      relatedCourseIds: [],
      relatedLessonIds: [],
      blocks: [
        { id: `${idValue}-brief`, type: "paragraph", title: "Situation", body: "A temporary elevated access request needs review before approval.", position: 1 },
        { id: `${idValue}-decision`, type: "decision_cards", title: "Decision", body: "Choose the responsible approval action.", required: true, position: 2, data: { question: "What should the approver confirm?", options: ["Purpose, scope, owner, duration, and evidence", "Only that the requester is busy", "Nothing if access is temporary"], correct: 0, feedback: ["Recommended.", "Not enough basis.", "Temporary access still needs control."] } }
      ],
      scoringMode: "COMPETENCY" as const,
      passingScore: 80,
      repeatable: true,
      recommendationWeight: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    snapshot.practiceActivities.push(activity);
    await svc.persist();
    setData(svc.snapshot());
    toast("Practice activity published");
  };
  return <><PageHeader title="Practice Activity Builder" subtitle="Create standalone practice that can be recommended or assigned." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={create}>Create Practice</button>} /><div className="grid gap-4 lg:grid-cols-2">{data.practiceActivities.map((activity) => <Panel key={activity.id}><h2 className="font-semibold">{activity.title}</h2><p className="mt-1 text-sm text-muted-foreground">{activity.description}</p><p className="mt-3 text-sm">{activity.status} · {activity.blocks.length} blocks · {activity.skillIds.length} skills</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/practice/${activity.id}`}>Preview</Link></Panel>)}</div></>;
}

function ScenarioAuthoring() {
  const { data, service, setData, toast } = useApp();
  const create = async () => {
    const title = prompt("Scenario title", "Late-Night Vendor Access");
    if (!title) return;
    const svc = service();
    const snapshot = svc.snapshot();
    const skill = snapshot.skills.find((item) => item.name === "Electronic Access") ?? snapshot.skills[0];
    const idValue = `scenario-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
    snapshot.scenarioDefinitions.push({
      id: idValue,
      title,
      description: "A branching scenario created in Course Management.",
      category: "Access",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 7,
      relatedCourseIds: ["course-cip005-esp-access"],
      skillIds: skill ? [skill.id] : [],
      topicIds: skill ? [skill.id] : [],
      initialState: { request: "urgent vendor access", schedule: "late night" },
      steps: [
        { id: `${idValue}-1`, stepType: "DECISION", narrative: "A vendor requests late-night access outside the normal schedule.", choices: [{ id: "approved-path", label: "Use approved emergency access path", feedback: "Recommended. Urgency still needs accountability.", principleTags: ["authorization"], impact: [{ field: "authorized", value: true }], nextStepId: `${idValue}-2`, quality: "RECOMMENDED" }, { id: "shortcut", label: "Share a credential temporarily", feedback: "Risky. Shared informal access weakens accountability.", principleTags: ["least privilege"], impact: [{ field: "shortcut", value: true }], nextStepId: `${idValue}-2`, quality: "INCORRECT" }] },
        { id: `${idValue}-2`, stepType: "DECISION", narrative: "What evidence should be retained?", choices: [{ id: "trace", label: "Sponsor, reason, method, scope, start/end, approval, closure", feedback: "Recommended.", principleTags: ["evidence"], impact: [{ field: "evidence", value: true }], quality: "RECOMMENDED" }, { id: "thin", label: "A note saying access happened", feedback: "Too thin for later review.", principleTags: ["evidence"], impact: [{ field: "evidence", value: false }], quality: "RISKY" }] }
      ],
      resultRules: [{ id: `${idValue}-strong`, result: "STRONG", minRecommendedChoices: 2 }, { id: `${idValue}-developing`, result: "DEVELOPING", minRecommendedChoices: 1 }],
      repeatable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await svc.persist();
    setData(svc.snapshot());
    toast("Scenario published");
  };
  return <><PageHeader title="Scenario Builder" subtitle="Create branching operational scenarios with decisions, feedback, and state changes." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={create}>Create Scenario</button>} /><div className="grid gap-4 lg:grid-cols-2">{data.scenarioDefinitions.map((scenario) => <Panel key={scenario.id}><h2 className="font-semibold">{scenario.title}</h2><p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p><p className="mt-3 text-sm">{scenario.steps.length} steps · {scenario.skillIds.length} skills</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/scenarios/${scenario.id}`}>Preview</Link></Panel>)}</div></>;
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
  const mastery = SkillMasteryService.getSkillMastery(data, user.id);
  const categories = Array.from(new Set(mastery.map((skill) => skill.category)));
  return <><PageHeader title="My Skills" subtitle="See the capabilities you are building across courses, scenarios and practice." /><div className="space-y-5">{categories.map((category) => <section key={category}><h2 className="mb-3 text-lg font-semibold">{category}</h2><div className="grid gap-4 lg:grid-cols-3">{mastery.filter((skill) => skill.category === category).map((skill) => <Link key={skill.skillId} to={`/skills/${skill.skillId}`}><Panel><h3 className="font-semibold">{skill.title}</h3><p className="mt-2 text-sm text-muted-foreground">{skill.state.replaceAll("_", " ")}</p><p className="mt-3 text-xs text-muted-foreground">{skill.evidenceCount ? `${skill.evidenceCount} evidence item${skill.evidenceCount === 1 ? "" : "s"}` : "No evidence yet"}</p>{skill.recommendedActivityId ? <p className="mt-3 text-sm text-cyan-700">Recommended practice available</p> : null}</Panel></Link>)}</div></section>)}</div></>;
}

function SkillDetailPage() {
  const { skillId } = useParams();
  const { data, user } = useApp();
  const mastery = SkillMasteryService.getSkillMastery(data, user.id).find((item) => item.skillId === skillId);
  const skill = data.skills.find((item) => item.id === skillId);
  if (!skill || !mastery) return <NotFound />;
  const evidence = data.skillEvidence.filter((item) => item.userId === user.id && item.skillId === skill.id).sort((left, right) => new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime());
  const practices = data.practiceActivities.filter((activity) => activity.skillIds.includes(skill.id));
  const scenarios = data.scenarioDefinitions.filter((scenario) => scenario.skillIds.includes(skill.id));
  return <><PageHeader title={skill.name} subtitle={skill.description} /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><h2 className="text-xl font-semibold">{mastery.state.replaceAll("_", " ")}</h2><p className="mt-2 text-sm text-muted-foreground">Current state is calculated from recent course, practice, and scenario evidence.</p><h3 className="mt-6 font-semibold">Recent Evidence</h3><div className="mt-3 space-y-2">{evidence.map((item) => <div key={item.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{item.details ?? item.sourceType.replaceAll("_", " ")}</p><p className="text-muted-foreground">{item.result.replaceAll("_", " ")} · {new Date(item.observedAt).toLocaleDateString()}</p></div>)}{!evidence.length ? <p className="text-sm text-muted-foreground">Complete related courses, practice, or scenarios to build evidence.</p> : null}</div></Panel><Panel><h2 className="font-semibold">Recommended Next</h2><div className="mt-3 space-y-2">{practices.slice(0, 3).map((activity) => <Link key={activity.id} className="block rounded-md border border-border p-3 text-sm" to={`/practice/${activity.id}`}>{activity.title}<span className="block text-xs text-muted-foreground">{activity.estimatedMinutes} min practice</span></Link>)}{scenarios.slice(0, 3).map((scenario) => <Link key={scenario.id} className="block rounded-md border border-border p-3 text-sm" to={`/scenarios/${scenario.id}`}>{scenario.title}<span className="block text-xs text-muted-foreground">{scenario.estimatedMinutes} min scenario</span></Link>)}</div></Panel></div></>;
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
