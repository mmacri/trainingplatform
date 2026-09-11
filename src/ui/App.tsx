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
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  calculateCourseReadiness,
  getCourseCompletionState,
  getCoachingOpportunities,
  getRoles,
  hasAnyRole,
  searchAuthorized
} from "../services/appServices";
import { ContentHealthService } from "../services/contentHealthService";
import { ActivityVariantService } from "../services/activityVariantService";
import { ArtifactService } from "../services/artifactService";
import { CourseDepthAuditService } from "../services/courseDepthAuditService";
import { InvestigationService } from "../services/investigationService";
import { LearnerJourneyService, type LearnerJourneyAction } from "../services/learnerJourneyService";
import { LearnerGoalService } from "../services/learnerGoalService";
import { LearningSearchService } from "../services/learningSearchService";
import { LearningSessionService } from "../services/learningSessionService";
import { LearningTimeService } from "../services/learningTimeService";
import { LearningContentValidator } from "../services/learningContentValidator";
import { MicroLearningRouteService } from "../services/microLearningRouteService";
import { PracticeSetService } from "../services/practiceSetService";
import { ProgramService } from "../services/programService";
import { SkillCompetencyService } from "../services/skillMasteryService";
import { TrainingWorldService } from "../services/trainingWorldService";
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
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    const pref = data.learningPreferences.find((item) => item.userId === user.id && item.key === "learningPreferences")?.value as { onboardingCompletedAt?: string } | undefined;
    const learnerOnly = roles.includes("LEARNER") && !hasAnyRole(data, user.id, ["MANAGER", "AUTHOR", "COURSE_OWNER", "REVIEWER", "COMPLIANCE_MANAGER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]);
    return learnerOnly && !pref?.onboardingCompletedAt;
  });
  const nav = buildNav(data, user.id);
  const unread = data.notifications.filter((note) => note.userId === user.id && !note.readAt).length;

  const logout = () => {
    AuthService.logout(data, user.id);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-white px-4 dark:bg-slate-950">
        <button className="flex min-h-11 min-w-11 items-center justify-center rounded-md lg:hidden" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
          <Menu />
        </button>
        <Link to="/home" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-white">
            <ShieldCheck size={19} />
          </span>
          <span className="hidden font-semibold sm:block">GridGuard Learning</span>
        </Link>
        <button className="ml-auto hidden h-11 min-w-72 items-center gap-2 rounded-md border border-border px-3 text-left text-sm text-muted-foreground md:flex" onClick={() => setSearchOpen(true)}>
          <Search size={17} /> Search courses, standards, evidence
        </button>
        {canCreateCourses(data, user.id) ? <QuickCreate /> : null}
        <button className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2" aria-label="Notifications" onClick={() => toast(`${unread} unread notifications`)}>
          <Bell size={18} />
          {unread ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{unread}</span> : null}
        </button>
        <button className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2" aria-label="Search" onClick={() => setSearchOpen(true)}>
          <Search size={18} />
        </button>
        <div className="relative">
          <button className="flex min-h-11 items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm" onClick={() => setSwitchOpen(true)}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-xs text-white">{user.firstName[0]}{user.lastName[0]}</span>
            <span className="hidden md:block">{user.firstName}</span>
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className={`no-print fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-white p-3 transition-transform dark:bg-slate-950 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] ${navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <span className="font-semibold">Navigation</span>
            <button className="flex min-h-11 min-w-11 items-center justify-center rounded-md" onClick={() => setNavOpen(false)} aria-label="Close navigation"><X /></button>
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
                <button key={mode} className={`min-h-11 rounded-md border border-border px-2 py-1 ${theme === mode ? "bg-muted text-foreground" : ""}`} onClick={() => setTheme(mode)}>
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
            <Route path="/learn-home" element={<LearnHome />} />
            <Route path="/progress" element={<ProgressHome />} />
            <Route path="/session" element={<LearningSessionPage />} />
            <Route path="/review" element={<ReviewMistakesPage />} />
            <Route path="/my-learning" element={<MyLearning />} />
            <Route path="/practice" element={<PracticeCenter />} />
            <Route path="/practice/:activityId" element={<PracticeActivityPage />} />
            <Route path="/scenarios" element={<ScenarioLab />} />
            <Route path="/scenarios/:scenarioId" element={<ScenarioDetail />} />
            <Route path="/scenarios/:scenarioId/run/:attemptId" element={<ScenarioRun />} />
            <Route path="/learning" element={<LearningCatalog />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/learning-paths" element={<LearningPaths />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:programId" element={<ProgramDetailPage />} />
            <Route path="/certifications" element={<Certifications />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/skills/:skillId" element={<SkillDetailPage />} />
            <Route path="/teach/:skillId" element={<TeachMeThisPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/challenges/:activityId" element={<PracticeActivityPage />} />
            <Route path="/refresher/:activityId" element={<PracticeActivityPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="/learning-map" element={<LearningMapPage />} />
            <Route path="/settings/learning" element={<LearningSettingsPage />} />
            <Route path="/campaigns/:campaignId" element={<CampaignLearnerPage />} />
            <Route path="/environment" element={<EnvironmentExplorer />} />
            <Route path="/environment/timeline" element={<EnvironmentTimelinePage />} />
            <Route path="/environment/map" element={<EnvironmentMapPage />} />
            <Route path="/investigations/:investigationId" element={<InvestigationDetailPage />} />
            <Route path="/investigations/:investigationId/run/:attemptId" element={<InvestigationRunPage />} />
            <Route path="/courses/:courseId" element={<CourseLanding />} />
            <Route path="/courses/:courseId/reference" element={<CourseReferencePage />} />
            <Route path="/learn/:courseId/:lessonId?" element={<CoursePlayer />} />
            <Route path="/goals" element={<LearnerGoalsPage />} />
            <Route path="/resources" element={<ResourceCenter />} />
            <Route path="/resources/:resourceId" element={<ResourceDetail />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/progress/portfolio" element={<LearnerPortfolioPage />} />
            <Route path="/records/:courseId" element={<TrainingRecord />} />
            <Route path="/build" element={<Guard allow={canManageCourses(data, user.id)} label="Course Management"><CourseManagementDashboard /></Guard>} />
            <Route path="/build/quality" element={<Guard allow={canManageCourses(data, user.id)} label="Course Quality"><CourseQualityDashboard /></Guard>} />
            <Route path="/build/practice" element={<Guard allow={canManageCourses(data, user.id)} label="Practice Activities"><PracticeAuthoring /></Guard>} />
            <Route path="/build/scenarios" element={<Guard allow={canManageCourses(data, user.id)} label="Scenario Builder"><ScenarioAuthoring /></Guard>} />
            <Route path="/build/new" element={<Guard allow={canCreateCourses(data, user.id)} label="Create Course"><CourseCreationWizard /></Guard>} />
            <Route path="/build/questions" element={<Guard allow={canManageCourses(data, user.id)} label="Question Bank"><QuestionBank /></Guard>} />
            <Route path="/build/courses/:courseId" element={<CourseWorkspace />} />
            <Route path="/build/courses/:courseId/assign" element={<Guard allow={canManageCourses(data, user.id)} label="Assign Training"><AssignmentWizard /></Guard>} />
            <Route path="/team" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Team Learning"><TeamDashboard /></Guard>} />
            <Route path="/team/operations" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Learning Operations"><ManagerOperationsHome /></Guard>} />
            <Route path="/team/coaching" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Coaching"><ManagerCoaching /></Guard>} />
            <Route path="/team/campaigns" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Campaigns"><ManagerCampaigns /></Guard>} />
            <Route path="/team/challenges" element={<Guard allow={roles.includes("MANAGER") || canManageUsers(data, user.id)} label="Challenges"><ManagerCoaching /></Guard>} />
            <Route path="/compliance" element={<Guard allow={canViewCompliance(data, user.id)} label="Compliance"><ComplianceDashboard /></Guard>} />
            <Route path="/standards" element={<Guard allow={canViewCompliance(data, user.id) || roles.includes("LEARNER")} label="Standards"><StandardsPage /></Guard>} />
            <Route path="/standards/:standardId/impact" element={<Guard allow={canViewCompliance(data, user.id) || canManageCourses(data, user.id)} label="Standard Impact"><StandardImpactPage /></Guard>} />
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
      {onboardingOpen && !window.location.hash.startsWith("#/learn/") ? <LearnerOnboarding onClose={async () => { const svc = new WorkflowService(data, user.id); const current = (data.learningPreferences.find((item) => item.userId === user.id && item.key === "learningPreferences")?.value as Record<string, unknown> | undefined) ?? {}; await svc.saveLearningPreference("learningPreferences", { ...current, onboardingCompletedAt: new Date().toISOString() }); await refresh(); setOnboardingOpen(false); }} /> : null}
    </div>
  );
}

function buildNav(data: AppData, userId: string) {
  const learnerOnly = !hasAnyRole(data, userId, ["MANAGER", "AUTHOR", "COURSE_OWNER", "REVIEWER", "COMPLIANCE_MANAGER", "LEARNING_ADMIN", "PLATFORM_ADMIN"]);
  const items = learnerOnly ? [
    { label: "Home", href: "/home", icon: Home },
    { label: "Learn", href: "/learn-home", icon: GraduationCap },
    { label: "My Learning", href: "/my-learning", icon: BookOpenCheck },
    { label: "Practice", href: "/practice", icon: ClipboardCheck },
    { label: "Progress", href: "/progress", icon: CheckCircle2 }
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
  if (canManageCourses(data, userId)) {
    items.push({ label: "Course Management", href: "/build", icon: ClipboardCheck });
    items.push({ label: "Course Quality", href: "/build/quality", icon: FileCheck2 });
  }
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
  const { data, user, roles } = useApp();
  if (canManageUsers(data, user.id)) return <AdminRoleHome />;
  if (canViewCompliance(data, user.id) && !roles.includes("MANAGER")) return <ComplianceRoleHome />;
  if (roles.includes("AUTHOR") && !roles.includes("MANAGER")) return <AuthorRoleHome />;
  if (roles.includes("MANAGER")) return <ManagerOperationsHome />;
  return <LearnerJourneyHome />;
}

function LearnerJourneyHome() {
  const { data, user } = useApp();
  const enrollments = data.enrollments.filter((item) => item.userId === user.id);
  const journey = LearnerJourneyService.getLearnerJourney(data, user.id);
  const next = journey.primaryAction;
  const required = enrollments.map((enrollment) => data.courses.find((course) => course.id === enrollment.courseId)!).filter(Boolean);
  const dueSoon = enrollments
    .map((enrollment) => ({ enrollment, assignment: data.assignments.find((assignment) => assignment.id === enrollment.assignmentId), course: data.courses.find((course) => course.id === enrollment.courseId) }))
    .filter((item) => item.assignment && item.course && item.enrollment.status !== "COMPLETED")
    .sort((left, right) => new Date(left.assignment!.dueAt).getTime() - new Date(right.assignment!.dueAt).getTime())
    .slice(0, 3);

  return (
    <>
      <PageHeader title={`Welcome, ${user.firstName}`} subtitle="GridGuard recommends the next useful step across courses, practice, scenarios, and skills." action={<Link className="rounded-md border border-border px-3 py-2 text-sm" to="/settings/learning">Learning Settings</Link>} />
      {next ? <JourneyPrimaryCard action={next} /> : <EmptyState text="You're caught up. No required training is currently due." action="Start 15-Minute Session" href="/session" />}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {journey.upcomingActions.length ? <Panel><h2 className="text-lg font-semibold">Up Next</h2><div className="mt-3 divide-y divide-border">{journey.upcomingActions.slice(0, 4).map((action, index) => <JourneyRow key={action.id} action={action} index={index + 1} />)}</div></Panel> : null}
          {dueSoon.length ? <Panel><h2 className="text-lg font-semibold">Due Soon</h2><div className="mt-3 space-y-2">{dueSoon.map(({ assignment, course }) => <Link key={assignment!.id} className="flex justify-between rounded-md border border-border p-3 text-sm" to={`/courses/${course!.id}`}><span>{course!.shortTitle ?? course!.title}</span><span className="text-muted-foreground">{new Date(assignment!.dueAt).toLocaleDateString()}</span></Link>)}</div></Panel> : null}
          {journey.reinforcementActions.length ? <Panel><p className="text-sm font-semibold text-cyan-700">Keep It Fresh</p><div className="mt-3 space-y-2">{journey.reinforcementActions.map((action) => <JourneyRow key={action.id} action={action} />)}</div></Panel> : null}
          {journey.resumeItems.length ? <Panel><h2 className="text-lg font-semibold">Continue Where You Left Off</h2><div className="mt-3 space-y-2">{journey.resumeItems.slice(0, 3).map((item) => <Link key={item.id} className="block rounded-md border border-border p-3 text-sm" to={item.href}><span className="font-medium">{item.title}</span><span className="block text-muted-foreground">{item.subtitle} · {item.progressText}</span></Link>)}</div></Panel> : null}
          <Panel>
            <h2 className="text-lg font-semibold">My Learning</h2>
            <div className="mt-3 space-y-3">
              {required.filter((course) => data.enrollments.some((enrollment) => enrollment.courseId === course.id && enrollment.status !== "COMPLETED")).slice(0, 4).map((course) => <CourseRow key={course.id} course={course} />)}
              {required.length === 0 ? <EmptyState text="You're caught up on required training." action="Explore Practice" href="/practice" /> : null}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel><h2 className="text-lg font-semibold">Start a Learning Session</h2><p className="mt-2 text-sm text-muted-foreground">Build a short sequence from your reinforcement, practice, and scenario recommendations.</p><Link className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/session">Start 15-Minute Session</Link></Panel>
          {journey.activeLearningPath ? <Panel><h2 className="text-lg font-semibold">Active Path</h2><p className="mt-2 font-medium">{journey.activeLearningPath.title}</p><p className="mt-1 text-sm text-muted-foreground">{journey.activeLearningPath.progress}% complete</p><Link className="mt-3 inline-flex text-sm font-medium text-cyan-700" to={journey.activeLearningPath.href}>View Path</Link></Panel> : null}
          <Panel><h2 className="text-lg font-semibold">Your Development</h2><div className="mt-3 space-y-2">{journey.skillFocus.map((skill) => <Link key={skill.skillId} className="flex justify-between rounded-md border border-border p-3 text-sm" to={skill.href}><span>{skill.title}</span><span className="text-muted-foreground">{skill.state.replaceAll("_", " ")} · {skill.stage}</span></Link>)}</div>{!journey.skillFocus.length ? <p className="mt-2 text-sm text-muted-foreground">Your skills will appear as you complete courses, practice, and scenarios.</p> : null}<Link className="mt-3 inline-flex text-sm font-medium text-cyan-700" to="/skills">View All Skills</Link></Panel>
          <Panel><h2 className="text-lg font-semibold">Recent Progress</h2><div className="mt-3 space-y-2 text-sm">{journey.recentAchievements.map((achievement) => <div key={achievement.id} className="rounded-md border border-border p-3"><p className="font-medium">{achievement.title}</p><p className="text-muted-foreground">{achievement.description}</p></div>)}{!journey.recentAchievements.length ? <p className="text-muted-foreground">Complete learning activities to build your progress timeline.</p> : null}</div></Panel>
        </div>
      </div>
    </>
  );
}

function JourneyPrimaryCard({ action }: { action: LearnerJourneyAction }) {
  return <Panel className="mb-5 border-cyan-200 bg-cyan-50/70 dark:border-cyan-900 dark:bg-cyan-950/40"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Your Next Step</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">{action.title}</h2>{action.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{action.subtitle}</p> : null}<p className="mt-2 text-sm font-medium">{action.reasonText}</p>{action.estimatedMinutes ? <p className="mt-1 text-xs text-muted-foreground">{action.estimatedMinutes} min</p> : null}</div><Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to={action.href}>{action.reason === "IN_PROGRESS" ? "Resume Learning" : "Start"}</Link></div></Panel>;
}

function JourneyRow({ action, index }: { action: LearnerJourneyAction; index?: number }) {
  return <Link className="flex items-center justify-between gap-3 py-3 text-sm" to={action.href}><span className="flex min-w-0 gap-3">{index ? <span className="text-muted-foreground">{index}</span> : null}<span><span className="block font-medium">{action.title}</span><span className="block text-muted-foreground">{action.reasonText}{action.estimatedMinutes ? ` · ${action.estimatedMinutes} min` : ""}</span></span></span><ChevronRight size={17} /></Link>;
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

function ManagerOperationsHome() {
  const { data, user } = useApp();
  const teams = data.teams.filter((team) => canViewTeam(data, user.id, team.id));
  const memberIds = data.teamMembers.filter((member) => teams.some((team) => team.id === member.teamId)).map((member) => member.userId);
  const opportunities = getCoachingOpportunities(data, user.id);
  const overdue = data.enrollments.filter((item) => memberIds.includes(item.userId) && item.status === "OVERDUE").length;
  const campaigns = data.learningCampaigns.filter((campaign) => campaign.createdByUserId === user.id || campaign.status === "ACTIVE");
  return <><PageHeader title="Learning Operations" subtitle="Needs attention, team progress, coaching, campaigns, expirations, and skill development." /><div className="grid gap-4 md:grid-cols-4"><Stat label="Overdue Assignments" value={overdue} tone={overdue ? "amber" : "cyan"} /><Stat label="Coaching Opportunities" value={opportunities.length} /><Stat label="Active Campaigns" value={campaigns.length} /><Stat label="Team Members" value={memberIds.length} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]"><Panel><h2 className="font-semibold">Needs Attention</h2><div className="mt-3 space-y-2 text-sm">{opportunities.slice(0, 4).map((item) => { const learner = data.users.find((candidate) => candidate.id === item.userId); const skill = data.skills.find((candidate) => candidate.id === item.skillId); return <div key={`${item.userId}-${item.skillId}`} className="rounded-md border border-border p-3"><p className="font-medium">{learner?.name}</p><p className="text-muted-foreground">{skill?.name} is {item.priority === "HIGH" ? "needs review" : "developing"}. Suggested: assign targeted practice.</p></div>; })}{!opportunities.length ? <p className="text-muted-foreground">No coaching opportunities require attention.</p> : null}</div><Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/team/coaching">Open Coaching</Link></Panel><Panel><h2 className="font-semibold">Team Skills</h2>{["skill-patch-management", "skill-access-management", "skill-evidence-quality"].map((skillId) => { const skill = data.skills.find((item) => item.id === skillId); const states = memberIds.map((idValue) => SkillMasteryService.getSkillMastery(data, idValue).find((item) => item.skillId === skillId)?.state ?? "NEEDS_REVIEW"); return <div key={skillId} className="mt-3 rounded-md border border-border p-3 text-sm"><p className="font-medium">{skill?.name}</p><p className="text-muted-foreground">Strong {states.filter((state) => state === "STRONG").length} · Developing {states.filter((state) => state === "DEVELOPING").length} · Needs Review {states.filter((state) => state === "NEEDS_REVIEW").length}</p></div>; })}</Panel></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><Panel><h2 className="font-semibold">Campaigns</h2>{campaigns.map((campaign) => <Link key={campaign.id} className="mt-3 block rounded-md border border-border p-3 text-sm" to="/team/campaigns">{campaign.title}<span className="block text-muted-foreground">{campaign.items.length} learning items</span></Link>)}</Panel><Panel><h2 className="font-semibold">Actionable Analytics</h2><p className="mt-2 text-sm text-muted-foreground">Patch Management has visible developing evidence for parts of the Operations team.</p><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to="/team/coaching">Assign Patch Practice</Link></Panel></div></>;
}

function AuthorRoleHome() {
  const { data } = useApp();
  const health = data.courses.slice(0, 6).map((course) => ({ course, health: ContentHealthService.getCourseHealth(data, course.id), audit: CourseDepthAuditService.auditCourse(data, course.id) }));
  return <><PageHeader title="Content Operations" subtitle="Courses needing attention, reviews, feedback, question insights, content health, and standards impact." /><div className="grid gap-4 lg:grid-cols-2">{health.map(({ course, health: state, audit }) => <Panel key={course.id}><h2 className="font-semibold">{course.title}</h2><p className="mt-1 text-sm text-muted-foreground">Content Health: {state.state} · Depth Audit: {audit.overallState.replaceAll("_", " ")}</p><p className="mt-2 text-sm">{audit.findings[0]?.message ?? (state.signals.join(", ") || "No active signals.")}</p><div className="mt-3 flex flex-wrap gap-2 text-xs">{Object.entries(audit.dimensions).slice(0, 4).map(([key, value]) => <span key={key} className="rounded-md bg-muted px-2 py-1">{titleize(key)}: {value.replaceAll("_", " ")}</span>)}</div><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to={`/build/courses/${course.id}`}>Open Course</Link></Panel>)}</div></>;
}

function ComplianceRoleHome() {
  const { data } = useApp();
  return <><PageHeader title="Compliance Learning Readiness" subtitle="Assignment completion, evidence records, standards change reviews, certifications, and training gaps." /><div className="grid gap-4 md:grid-cols-4"><Stat label="Evidence Records" value={data.evidenceRecords.length} /><Stat label="Standards Reviews" value={data.standardChangeReviews.length} /><Stat label="Overdue" value={data.enrollments.filter((item) => item.status === "OVERDUE").length} /><Stat label="Certificates" value={data.userCertifications.length} /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><ComplianceMini /><Panel><h2 className="font-semibold">Standard Impact Reviews</h2>{data.standardChangeReviews.map((review) => <Link key={review.id} className="mt-3 block rounded-md border border-border p-3 text-sm" to={`/standards/${review.standardId}/impact`}>{review.summary}<span className="block text-muted-foreground">{review.status}</span></Link>)}</Panel></div></>;
}

function AdminRoleHome() {
  return <><PageHeader title="Platform Administration" subtitle="Users, roles, data health, backup, demo data, and application settings." /><AdminHome /></>;
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

function LearnHome() {
  const { data, user } = useApp();
  return <><PageHeader title="Learn" subtitle="Assigned learning, catalog courses, learning paths, and resources." /><Tabs items={["My Learning", "Catalog", "Learning Paths", "Resources"]} active="My Learning" onChange={(value) => { if (value === "Catalog") location.hash = "#/learning"; else if (value === "Learning Paths") location.hash = "#/learning-paths"; else if (value === "Resources") location.hash = "#/resources"; }} /><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><h2 className="text-lg font-semibold">Assigned Learning</h2><div className="mt-3 space-y-3">{data.enrollments.filter((item) => item.userId === user.id && item.status !== "COMPLETED").map((enrollment) => { const course = data.courses.find((item) => item.id === enrollment.courseId); return course ? <CourseRow key={enrollment.id} course={course} /> : null; })}</div></Panel><Panel><h2 className="text-lg font-semibold">Learning Resources</h2><div className="mt-3 space-y-2">{data.learningResources.slice(0, 5).map((resource) => <Link key={resource.id} className="block rounded-md border border-border p-3 text-sm" to={`/resources/${resource.id}`}>{resource.title}<span className="block text-xs text-muted-foreground">{resource.type.replaceAll("_", " ")}</span></Link>)}</div></Panel></div></>;
}

function ProgressHome() {
  const { data, user } = useApp();
  const [tab, setTab] = useState("Skills");
  const activity = [
    ...data.practiceAttempts.filter((item) => item.userId === user.id && item.completedAt).map((item) => ({ date: item.completedAt!, label: data.practiceActivities.find((activity) => activity.id === item.practiceActivityId)?.title ?? "Practice", type: "Practice Completed", result: item.topicResults[0]?.result })),
    ...data.branchingScenarioAttempts.filter((item) => item.userId === user.id && item.completedAt).map((item) => ({ date: item.completedAt!, label: data.scenarioDefinitions.find((scenario) => scenario.id === item.scenarioId)?.title ?? "Scenario", type: "Scenario Completed", result: item.overallResult })),
    ...data.userCertifications.filter((item) => item.userId === user.id).map((item) => ({ date: item.issuedAt, label: data.certifications.find((cert) => cert.id === item.certificationId)?.name ?? "Certificate", type: "Certificate Earned", result: "ACTIVE" }))
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const saved = data.savedLearningItems.filter((item) => item.userId === user.id);
  return <><PageHeader title="Progress" subtitle="Skills, certificates, transcript, activity, and achievements." action={<Link className="rounded-md border border-border px-3 py-2 text-sm" to="/progress/portfolio">Portfolio</Link>} /><Tabs items={["Skills", "Certificates", "Transcript", "Activity", "Saved", "Achievements"]} active={tab} onChange={setTab} />{tab === "Skills" ? <div className="mt-4"><SkillsPage /></div> : null}{tab === "Certificates" ? <div className="mt-4"><Certifications /></div> : null}{tab === "Transcript" ? <TranscriptPanel /> : null}{tab === "Activity" ? <Panel className="mt-4"><div className="space-y-2">{activity.map((item) => <div key={`${item.type}-${item.label}-${item.date}`} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{item.label}</p><p className="text-muted-foreground">{item.type} · {String(item.result).replaceAll("_", " ")} · {new Date(item.date).toLocaleDateString()}</p></div>)}{!activity.length ? <p className="text-sm text-muted-foreground">Meaningful learning activity will appear here.</p> : null}</div></Panel> : null}{tab === "Saved" ? <Panel className="mt-4"><div className="space-y-2">{saved.map((item) => <Link key={item.id} className="block rounded-md border border-border p-3 text-sm" to={item.href}><span className="font-medium">{item.title}</span><span className="block text-xs text-muted-foreground">{item.targetType} · saved {new Date(item.createdAt).toLocaleDateString()}</span></Link>)}{!saved.length ? <p className="text-sm text-muted-foreground">Saved lessons, sections, resources, scenarios, and practice activities will appear here.</p> : null}</div></Panel> : null}{tab === "Achievements" ? <Panel className="mt-4"><div className="grid gap-3 md:grid-cols-2">{data.learnerAchievements.filter((item) => item.userId === user.id).map((achievement) => <div key={achievement.id} className="rounded-md border border-border p-3"><p className="font-medium">{achievement.title}</p><p className="text-sm text-muted-foreground">{achievement.description}</p></div>)}</div></Panel> : null}</>;
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
  const contextEntities = TrainingWorldService.courseEntities(data, course);
  const profile = data.courseExperienceProfiles.find((item) => item.courseId === course.id);
  const missions = data.courseMissions.filter((mission) => mission.courseId === course.id);
  const practiceSet = PracticeSetService.buildForCourse(data, user.id, course.id, { limit: 5 });
  return (
    <>
      <PageHeader title={course.title} subtitle={course.subtitle ?? course.shortDescription} action={<div className="flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white" to={state.resumeDestination}>{state.percent ? "Resume Course" : "Start Course"}</Link>{state.courseComplete ? <Link className="rounded-md border border-border px-4 py-2 text-sm" to={`/courses/${course.id}/reference`}>Use at Work</Link> : null}</div>} />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Panel>
          {hero ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">NERC CIP Training</p> : null}
          <p className="text-muted-foreground">{hero ? "Personnel security depends on more than policies. It depends on people recognizing when access is appropriate, when circumstances have changed, when action is required, and how the organization proves those actions occurred." : version.goal}</p>
          {hero ? <p className="mt-3 text-muted-foreground">This refresher walks through the practical responsibilities that help keep personnel access aligned with current job needs and create clear, repeatable evidence of completed training and access-management activities.</p> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(hero ? ["75 min", course.difficulty, "Annual Training", "Certificate", "CIP-004", "Final Assessment"] : [`${course.estimatedMinutes} min`, course.difficulty, course.category, course.certificateEnabled ? "Certificate" : "No certificate", version.version, course.status]).map((item) => <div key={item} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-medium">{item}</div>)}
          </div>
          {contextEntities.length ? (
            <div className="mt-6 rounded-md border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Training Context</p>
              <h2 className="mt-1 text-lg font-semibold">North Valley Energy</h2>
              <p className="mt-2 text-sm text-muted-foreground">This course uses a fictional utility training world so systems, people, vendors, and evidence recur across lessons.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contextEntities.slice(0, 5).map((entity) => <Link key={`${entity.kind}-${entity.item.id}`} className="rounded-md border border-border bg-background px-3 py-2 text-xs" to="/environment">{entity.item.name}</Link>)}
              </div>
            </div>
          ) : null}
          {profile ? (
            <div className="mt-6 rounded-md border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Course Experience</p>
              <h2 className="mt-1 text-lg font-semibold">{profile.primaryLearningMode.toLowerCase().replaceAll("_", " ")} · {profile.visualMotif}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{profile.signatureScenarioStyle}. You will work with {profile.primaryInteractionTypes.slice(0, 3).join(", ")}.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {profile.primaryArtifactTypes.map((item) => <span key={item} className="rounded-md bg-muted px-2 py-1">{item.replaceAll("_", " ")}</span>)}
              </div>
            </div>
          ) : null}
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
          <div className="mt-3 rounded-md border border-border p-4">
            <p className="text-sm font-semibold">Course Journey</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {modules.map((module, index) => <div key={module.id} className="rounded-md bg-muted/50 p-3 text-sm"><p className="text-xs text-muted-foreground">Stage {index + 1}</p><p className="font-medium">{module.title}</p><p className="mt-1 text-xs text-muted-foreground">{moduleProgress(data, user.id, module.id)}% complete</p></div>)}
            </div>
          </div>
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
          {missions.length ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Missions / Cases</h3>
              <div className="mt-2 space-y-2">
                {missions.slice(0, 5).map((mission) => <div key={mission.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{mission.title}</p><p className="text-muted-foreground">{mission.objective}</p></div>)}
              </div>
            </div>
          ) : null}
          {practiceSet.length ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Practice This Course</h3>
              <div className="mt-2 space-y-2">
                {practiceSet.slice(0, 4).map((item) => <Link key={`${item.type}-${item.id}`} className="block rounded-md border border-border p-3 text-sm" to={item.href}><span className="font-medium">{item.title}</span><span className="block text-xs text-muted-foreground">{item.type.toLowerCase()} · {item.reason}</span></Link>)}
              </div>
            </div>
          ) : null}
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
  const [coachOpen, setCoachOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [stoppingPoint, setStoppingPoint] = useState(false);
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
  const currentModule = data.modules.find((module) => module.id === lesson.moduleId);
  const moduleLessons = lessons.filter((item) => item.moduleId === lesson.moduleId);
  const lessonIndexInModule = moduleLessons.findIndex((item) => item.id === lesson.id) + 1;
  const isLastInModule = moduleLessons.at(-1)?.id === lesson.id;
  const contextEntities = TrainingWorldService.courseEntities(data, course);
  const courseRemaining = LearningTimeService.estimateCourseRemaining(data, course.id, user.id);
  const moduleRemaining = currentModule ? LearningTimeService.estimateModuleRemaining(data, currentModule.id, user.id) : 0;
  const lessonRemaining = LearningTimeService.estimateLessonRemaining(data, lesson, user.id);
  const stageRows = lesson.instructionalStages?.length
    ? lesson.instructionalStages
    : inferLessonStages(blocks);
  useEffect(() => {
    const svc = service();
    void svc.recordExperienceEvent("LESSON_STARTED", lesson.id, { courseId: course.id });
  }, [course.id, lesson.id]);
  const complete = async () => {
    const svc = service();
    await svc.completeLesson(course.id, lesson.id);
    setData(svc.snapshot());
    toast("Lesson completed");
    const next = lessons[index + 1];
    if (next && isLastInModule) setStoppingPoint(true);
    else if (next) navigate(`/learn/${course.id}/${next.id}`);
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
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{state.percent}% complete</span><span>{LearningTimeService.formatApprox(courseRemaining)} remaining</span><div className="h-1 w-28 rounded-full bg-muted"><div className="h-1 rounded-full bg-cyan-700" style={{ width: `${state.percent}%` }} /></div></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button aria-label="Bookmark lesson" className="rounded-md border border-border px-3 py-2 text-sm" onClick={toggleBookmark}>{bookmarked ? "Saved" : "Save"}</button>
            {contextEntities.length ? <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setContextOpen(true)}>Context</button> : null}
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => setCoachOpen(true)}>Coach</button>
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
              <p className="mt-3 text-base leading-7 text-muted-foreground">{LearningTimeService.formatApprox(lessonRemaining)} · Module {LearningTimeService.formatApprox(moduleRemaining)} left · {lesson.required ? "Required" : "Optional"} · Lesson {lessonIndexInModule || index + 1} of {moduleLessons.length || lessons.length}</p>
              <div className="mt-5 h-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-cyan-700" style={{ width: `${Math.round(((index + 1) / lessons.length) * 100)}%` }} /></div>
              <LessonStageProgress stages={stageRows} blocks={blocks} />
            </div>
            {state.percent > 0 && !sessionStorage.getItem("gridguard.welcomeBack") ? <div className="mx-auto max-w-[760px]"><WelcomeBack percent={state.percent} /></div> : null}
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
      {coachOpen ? <LearningDrawer title="Learning Coach" onClose={() => setCoachOpen(false)}><LearningCoach lesson={lesson} course={course} /></LearningDrawer> : null}
      {contextOpen ? <LearningDrawer title="North Valley Context" onClose={() => setContextOpen(false)}><EnvironmentContext entities={contextEntities} /></LearningDrawer> : null}
      {resourcesOpen ? <LearningDrawer title="Resources" onClose={() => setResourcesOpen(false)}><div className="space-y-2">{resources.map((resource) => resource.url?.startsWith("http") ? <a key={resource.id} className="block rounded-md border border-border p-3 text-sm" href={resource.url} target="_blank" rel="noreferrer"><FileText size={15} className="mr-2 inline" />{resource.title}<p className="mt-1 text-xs text-muted-foreground">{resource.description}</p></a> : <Link key={resource.id} className="block rounded-md border border-border p-3 text-sm" to={`/resources/${resource.id}`}><FileText size={15} className="mr-2 inline" />{resource.title}<p className="mt-1 text-xs text-muted-foreground">{resource.description}</p></Link>)}</div></LearningDrawer> : null}
      {stoppingPoint ? <Modal title="Good Stopping Point" onClose={() => setStoppingPoint(false)}><p className="text-sm text-muted-foreground">You've completed {currentModule?.title ?? "this module"}.</p><p className="mt-3 text-sm">Next: {lessons[index + 1]?.title ?? "Course completion"} · {lessons[index + 1] ? LearningTimeService.formatApprox(lessons[index + 1].estimatedMinutes) : "Complete"}</p><div className="mt-5 flex justify-end gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => navigate("/home")}>Finish Later</button>{lessons[index + 1] ? <button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => navigate(`/learn/${course.id}/${lessons[index + 1].id}`)}>Continue</button> : null}</div></Modal> : null}
    </div>
  );
}

function LearningCoach({ lesson, course }: { lesson: AppData["lessons"][number]; course: Course }) {
  const lower = `${lesson.title} ${course.title}`.toLowerCase();
  const guidance = lower.includes("patch")
    ? "Applicability and implementation are separate decisions. Use the approved process to evaluate operational constraints before acting."
    : lower.includes("evidence") || lower.includes("audit")
      ? "A useful record helps another reviewer reconstruct who acted, what happened, when, the result, and why it connects to the process."
      : lower.includes("access") || lower.includes("role")
        ? "Access should reflect current responsibilities and approved need. A role change is a trigger to review, not a reason to assume access is still appropriate."
        : lower.includes("incident") || lower.includes("monitor")
          ? "Separate known facts from assumptions. Preserve useful context and escalate through the approved response path."
          : "Use the lesson objective to decide what action, record, or escalation would be appropriate in a real operational setting.";
  return <div><p className="text-sm text-muted-foreground">You're working on {lesson.title}.</p><div className="mt-4 rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm dark:border-cyan-900 dark:bg-cyan-950"><p className="font-semibold">Remember</p><p className="mt-2 text-muted-foreground">{guidance}</p></div><div className="mt-4 grid gap-2"><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/review">Review Related Patterns</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/practice">Practice This Skill</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/resources">Open Resources</Link></div></div>;
}

function ResourceDetail() {
  const { resourceId } = useParams();
  const { data } = useApp();
  const globalResource = data.learningResources.find((item) => item.id === resourceId);
  const resource = data.courseResources.find((item) => item.id === resourceId);
  if (globalResource) return <GlobalResourceDetail resource={globalResource} />;
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

function ResourceCenter() {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const resources = data.learningResources.filter((resource) => (type === "All" || resource.type === type) && (!query || [resource.title, resource.description, resource.type].join(" ").toLowerCase().includes(query.toLowerCase())));
  const types = Array.from(new Set(data.learningResources.map((resource) => resource.type)));
  return <><PageHeader title="Resources" subtitle="Quick references, checklists, job aids, process guides, evidence templates, glossary, and standards references." /><Panel><div className="flex flex-wrap gap-3"><input className="h-10 min-w-72 rounded-md border border-border bg-transparent px-3" placeholder="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} /><select className="h-10 rounded-md border border-border bg-transparent px-3" value={type} onChange={(event) => setType(event.target.value)}><option>All</option>{types.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div></Panel><div className="mt-5 grid gap-4 lg:grid-cols-3">{resources.map((resource) => <Link key={resource.id} to={`/resources/${resource.id}`}><Panel><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{resource.type.replaceAll("_", " ")}</p><h2 className="mt-2 font-semibold">{resource.title}</h2><p className="mt-2 text-sm text-muted-foreground">{resource.description}</p></Panel></Link>)}</div>{!resources.length ? <EmptyState text="No resources match this search." action="Clear Filters" onClick={() => { setQuery(""); setType("All"); }} /> : null}</>;
}

function GlobalResourceDetail({ resource }: { resource: AppData["learningResources"][number] }) {
  const [worksheet, setWorksheet] = useState<Record<string, string>>({});
  const checklist = resource.contentBlocks.find((block) => block.type === "checklist")?.data as { items?: string[] } | undefined;
  const items = checklist?.items ?? [];
  const missing = items.filter((item) => !worksheet[item]?.trim());
  const interactive = resource.id === "resource-incident-capture-guide";
  return <><PageHeader title={resource.title} subtitle={`Resource Center · Last updated ${new Date(resource.updatedAt).toLocaleDateString()}`} action={<button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => window.print()}>Print</button>} /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><p className="text-sm text-muted-foreground">{resource.description}</p><div className="mt-5 grid gap-3 md:grid-cols-2">{items.map((item) => <div key={item} className="rounded-md border border-border bg-muted/30 p-3 text-sm">{item}</div>)}</div>{interactive ? <div className="mt-6 rounded-md border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Training / Job Aid</p><h2 className="mt-1 font-semibold">Start Worksheet</h2><p className="mt-2 text-sm text-muted-foreground">This is not an official incident-management system. Use it to practice completeness.</p><div className="mt-4 grid gap-3">{items.map((item) => <label key={item} className="text-sm"><span className="font-medium">{item}</span><input className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3" value={worksheet[item] ?? ""} onChange={(event) => setWorksheet((current) => ({ ...current, [item]: event.target.value }))} /></label>)}</div></div> : null}</Panel><Panel><h2 className="font-semibold">Review Completeness</h2>{interactive ? <><p className="mt-2 text-sm text-muted-foreground">{missing.length ? `${missing.length} categories still need information.` : "All categories include practice information."}</p><div className="mt-3 space-y-2">{missing.map((item) => <div key={item} className="rounded-md border border-border p-2 text-sm">{item}</div>)}</div></> : <p className="mt-2 text-sm text-muted-foreground">Use the print action for a clean reference copy.</p>}<Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/resources">Back to Resources</Link></Panel></div></>;
}

function LearningSettingsPage() {
  const { data, user, service, setData, toast } = useApp();
  const existing = data.learningPreferences.find((item) => item.userId === user.id && item.key === "learningPreferences")?.value as Record<string, string> | undefined;
  const [prefs, setPrefs] = useState({
    defaultSupportMode: existing?.defaultSupportMode ?? "STANDARD",
    textSize: existing?.textSize ?? "STANDARD",
    reducedMotion: existing?.reducedMotion ?? "SYSTEM",
    outlineMode: existing?.outlineMode ?? "EXPANDED",
    scenarioTheme: existing?.scenarioTheme ?? "SYSTEM"
  });
  const save = async () => {
    const svc = service();
    await svc.saveLearningPreference("learningPreferences", prefs);
    setData(svc.snapshot());
    toast("Learning preferences saved");
  };
  return <><PageHeader title="Learning Settings" subtitle="Set default guidance, text size, motion, outline, and scenario theme preferences." /><Panel><div className="grid gap-4 md:grid-cols-2">{Object.entries({ defaultSupportMode: ["GUIDED", "STANDARD", "CHALLENGE"], textSize: ["STANDARD", "LARGE"], reducedMotion: ["SYSTEM", "ON", "OFF"], outlineMode: ["EXPANDED", "COMPACT"], scenarioTheme: ["SYSTEM", "LIGHT", "DARK"] }).map(([key, options]) => <label key={key} className="text-sm"><span className="font-medium">{titleize(key)}</span><select className="mt-1 h-10 w-full rounded-md border border-border bg-transparent px-3" value={prefs[key as keyof typeof prefs]} onChange={(event) => setPrefs((current) => ({ ...current, [key]: event.target.value }))}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div><button className="mt-5 rounded-md bg-cyan-700 px-4 py-2 text-sm text-white" onClick={save}>Save Preferences</button></Panel></>;
}

function StandardImpactPage() {
  const { standardId } = useParams();
  const { data, service, setData, toast } = useApp();
  const standard = data.standards.find((item) => item.id === standardId);
  if (!standard) return <NotFound />;
  const versionIds = data.standardVersions.filter((version) => version.standardId === standard.id).map((version) => version.id);
  const affectedCourses = data.courseStandardMappings.filter((mapping) => versionIds.includes(mapping.standardVersionId)).map((mapping) => data.courses.find((course) => course.id === mapping.courseId)).filter(Boolean) as Course[];
  const review = data.standardChangeReviews.find((item) => item.standardId === standard.id);
  const addNote = async (status: string) => {
    const svc = service();
    const snapshot = svc.snapshot();
    if (review) {
      review.status = status === "No Content Change Needed" ? "COMPLETE" : "CONTENT_UPDATE_REQUIRED";
      review.updatedAt = new Date().toISOString();
    }
    await svc.persist();
    setData(snapshot);
    toast(status);
  };
  return <><PageHeader title={`${standard.number} Impact Review`} subtitle="Review related courses, lessons, assessments, and resources before deciding whether content changes are needed." /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><h2 className="font-semibold">Affected Courses</h2><div className="mt-3 space-y-3">{affectedCourses.map((course) => { const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId); const resources = data.learningResources.filter((resource) => resource.relatedCourseIds.includes(course.id)); return <div key={course.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{course.title}</p><p className="text-muted-foreground">{lessons.length} lessons · {resources.length} resources · Health: {ContentHealthService.getCourseHealth(data, course.id).state}</p><Link className="mt-2 inline-flex rounded-md border border-border px-2 py-1 text-xs" to={`/build/courses/${course.id}`}>Open Course</Link></div>; })}</div></Panel><Panel><h2 className="font-semibold">Content Decision</h2><p className="mt-2 text-sm text-muted-foreground">{review?.summary ?? "No active standard change review is open for this standard."}</p><div className="mt-4 flex flex-col gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => addNote("No Content Change Needed")}>No Content Change Needed</button><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => addNote("Create Draft Update")}>Create Draft Update</button><Link className="rounded-md border border-border px-3 py-2 text-sm text-center" to="/standards">Back to Standards</Link></div></Panel></div></>;
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
          <button className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2" aria-label={`Close ${title}`} onClick={onClose}><X size={16} /></button>
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

function LessonStageProgress({ stages, blocks }: { stages: NonNullable<AppData["lessons"][number]["instructionalStages"]>; blocks: ContentBlock[] }) {
  const blockIds = new Set(blocks.map((block) => block.id));
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Lesson stage progress">
      {stages.map((stage, index) => {
        const active = stage.blockIds.some((blockId) => blockIds.has(blockId));
        const state = index === 0 ? "✓" : active ? "●" : "○";
        return <span key={stage.id} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">{stage.label} {state}</span>;
      })}
    </div>
  );
}

function inferLessonStages(blocks: ContentBlock[]) {
  const first = blocks[0];
  const visual = blocks.find((block) => ["learning_diagram", "process_diagram", "timeline", "artifact_review", "system_inspector", "evidence_inspector"].includes(block.type));
  const activity = blocks.find((block) => ["decision_cards", "classification", "sequence_builder", "matching", "knowledge_check", "quick_recall"].includes(block.type));
  const last = blocks.at(-1);
  return [
    first ? { id: "stage-understand", type: "UNDERSTAND" as const, label: "Understand", blockIds: [first.id] } : undefined,
    visual ? { id: "stage-see", type: "SEE" as const, label: "See It", blockIds: [visual.id] } : undefined,
    activity ? { id: "stage-try", type: "TRY" as const, label: "Try It", blockIds: [activity.id] } : undefined,
    last ? { id: "stage-takeaway", type: "TAKEAWAY" as const, label: "Takeaway", blockIds: [last.id] } : undefined
  ].filter(Boolean) as NonNullable<AppData["lessons"][number]["instructionalStages"]>;
}

function EnvironmentContext({ entities }: { entities: ReturnType<typeof TrainingWorldService.courseEntities> }) {
  return <div className="space-y-3">{entities.map((entity) => <div key={`${entity.kind}-${entity.item.id}`} className="rounded-md border border-border p-3 text-sm"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{entity.kind}</p><h3 className="mt-1 font-semibold">{entity.item.name}</h3><p className="mt-1 text-muted-foreground">{entityDescription(entity.item)}</p>{"attributes" in entity.item ? <div className="mt-2 grid gap-1 text-xs text-muted-foreground">{Object.entries(entity.item.attributes).map(([key, value]) => <div key={key}><span className="font-medium">{titleize(key)}:</span> {value}</div>)}</div> : null}</div>)}</div>;
}

function entityDescription(item: ReturnType<typeof TrainingWorldService.courseEntities>[number]["item"]) {
  if ("roleSummary" in item) return item.roleSummary;
  if ("description" in item) return item.description;
  return "";
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
  if (block.type === "learning_diagram") return <LearningDiagramBlock block={block} />;
  if (block.type === "timeline") return <TimelineBlock title={block.title} steps={(data.steps as string[]) ?? []} />;
  if (block.type === "audit_lens" || block.type === "audit_tip") return <AuditLensBlock block={block} />;
  if (block.type === "before_after" || block.type === "comparison") return <BeforeAfterBlock block={block} />;
  if (block.type === "system_inspector") return <InspectorActivity block={block} onComplete={onComplete} kind="system" />;
  if (block.type === "evidence_inspector" || block.type === "build_record") return <InspectorActivity block={block} onComplete={onComplete} kind="evidence" />;
  if (block.type === "artifact_review" || block.type === "investigation_activity") return <ArtifactReviewBlock block={block} onComplete={onComplete} />;
  if (block.type === "record_repair") return <RecordRepairBlock block={block} onComplete={onComplete} />;
  if (block.type === "quality_comparison") return <QualityComparison block={block} />;
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

function LearningDiagramBlock({ block }: { block: ContentBlock }) {
  const { data } = useApp();
  const config = block.data as { diagramId?: string } | undefined;
  const diagram = data.learningDiagrams.find((item) => item.id === config?.diagramId);
  const [activeId, setActiveId] = useState(diagram?.nodes[0]?.id);
  if (!diagram) return <MalformedActivity title={block.title ?? "Learning Diagram"} />;
  const active = diagram.nodes.find((node) => node.id === activeId) ?? diagram.nodes[0];
  return (
    <div className="mb-5 rounded-md border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{diagram.type.replaceAll("_", " ")}</p>
      <h3 className="mt-1 text-lg font-semibold">{block.title ?? diagram.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{block.body ?? diagram.description}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_260px]">
        <div className="grid gap-2 md:grid-cols-3">
          {diagram.nodes.map((node, index) => <button key={node.id} className={`min-h-16 rounded-md border p-3 text-left text-sm ${active?.id === node.id ? "border-cyan-700 bg-cyan-50 text-cyan-950 dark:bg-cyan-950 dark:text-cyan-100" : "border-border"}`} onClick={() => setActiveId(node.id)}><span className="text-xs text-muted-foreground">Step {index + 1}</span><span className="block font-medium">{node.label}</span>{node.subtitle ? <span className="text-xs text-muted-foreground">{node.subtitle}</span> : null}</button>)}
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="font-semibold">{active?.label}</p>
          <p className="mt-2 text-muted-foreground">{active?.description}</p>
          {active?.metadata ? <dl className="mt-3 space-y-1 text-xs text-muted-foreground">{Object.entries(active.metadata).map(([key, value]) => <div key={key}><dt className="inline font-medium">{titleize(key)}: </dt><dd className="inline">{value}</dd></div>)}</dl> : null}
        </div>
      </div>
    </div>
  );
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

function ArtifactReviewBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const { data, user } = useApp();
  const config = block.data as { artifactId?: string } | undefined;
  const artifact = data.trainingArtifacts.find((item) => item.id === config?.artifactId);
  const saved = data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof ArtifactService.review> | null>(null);
  if (!artifact) return <MalformedActivity title={block.title ?? "Artifact Review"} />;
  const submit = async () => {
    const review = ArtifactService.review(artifact, selected);
    setResult(review);
    const expected = artifact.issues?.filter((issue) => issue.learnerShouldIdentify).length ?? 0;
    const score = expected ? Math.round((review.identified.length / expected) * 100) : 100;
    await onComplete(block.id, { selected, result: review }, score);
  };
  return (
    <div className="mb-5 rounded-md border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{artifact.artifactType.replaceAll("_", " ")}</p>
      <h3 className="mt-1 text-lg font-semibold">{block.title ?? artifact.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{block.body ?? artifact.subtitle}</p>
      <div className="mt-4 rounded-md border border-border">
        {artifact.fields.map((field) => <label key={field.id} className="flex min-h-12 items-start gap-3 border-b border-border p-3 text-sm last:border-b-0"><input className="mt-1" type="checkbox" checked={selected.includes(field.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, field.id] : items.filter((item) => item !== field.id))} /><span><span className="block font-medium">{field.label}</span><span className="text-muted-foreground">{field.value}</span>{field.traceabilityRole ? <span className="mt-1 block text-xs text-muted-foreground">{field.traceabilityRole}</span> : null}</span></label>)}
      </div>
      {result ? <ArtifactResult result={result} /> : saved ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Artifact review complete.</p> : <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={submit}>Submit Findings</button>}
    </div>
  );
}

function ArtifactResult({ result }: { result: ReturnType<typeof ArtifactService.review> }) {
  return <div className="mt-4 rounded-md border border-border bg-muted/30 p-4 text-sm"><p className="font-semibold">Review Complete</p><div className="mt-3 grid gap-3 md:grid-cols-3"><FindingList title="You identified" items={result.identified} /><FindingList title="You missed" items={result.missed} /><FindingList title="Needs context" items={result.needsContext} /></div>{result.falsePositives.length ? <FindingList title="Not shown as a concern" items={result.falsePositives} /> : null}</div>;
}

function FindingList({ title, items }: { title: string; items: Array<{ label: string; explanation: string }> }) {
  return <div><p className="font-medium">{title}</p>{items.length ? <ul className="mt-2 space-y-2">{items.map((item) => <li key={item.label} className="rounded-md bg-background p-2"><span className="font-medium">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.explanation}</span></li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">None.</p>}</div>;
}

function RecordRepairBlock({ block, onComplete }: { block: ContentBlock; onComplete: (blockId: string, answers: unknown, score?: number) => Promise<void> }) {
  const { data, user } = useApp();
  const config = block.data as { artifactId?: string; requiredFieldIds?: string[] } | undefined;
  const artifact = data.trainingArtifacts.find((item) => item.id === config?.artifactId);
  const saved = data.scenarioAttempts.some((attempt) => attempt.userId === user.id && attempt.scenarioId === block.id && attempt.status === "COMPLETED");
  const [selected, setSelected] = useState<string[]>([]);
  const issueFieldIds = (artifact?.issues?.map((issue) => issue.fieldId).filter(Boolean) ?? []) as string[];
  const required = config?.requiredFieldIds ?? issueFieldIds;
  if (!artifact) return <MalformedActivity title={block.title ?? "Record Repair"} />;
  const complete = async () => {
    const ok = required.every((fieldId) => selected.includes(fieldId));
    if (ok) await onComplete(block.id, { selected, preview: ArtifactService.repairedPreview(artifact, selected) }, 100);
  };
  const preview = ArtifactService.repairedPreview(artifact, selected);
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="text-lg font-semibold">{block.title ?? "Fix the Record"}</h3><p className="mt-2 text-sm text-muted-foreground">{block.body ?? "Choose the fields that make the record traceable."}</p><div className="mt-4 grid gap-2 md:grid-cols-2">{artifact.fields.map((field) => <label key={field.id} className="flex gap-2 rounded-md border border-border p-3 text-sm"><input type="checkbox" checked={selected.includes(field.id)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, field.id] : items.filter((item) => item !== field.id))} />{field.label}</label>)}</div><div className="mt-4 rounded-md bg-muted/40 p-3 text-sm"><p className="font-medium">Improved record preview</p><ul className="mt-2 list-disc pl-5 text-muted-foreground">{preview.map((line) => <li key={line}>{line}</li>)}</ul></div>{saved ? <p className="mt-3 text-sm text-emerald-700">Record repair complete.</p> : <button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!required.every((fieldId) => selected.includes(fieldId))} onClick={complete}>Complete Repair</button>}</div>;
}

function QualityComparison({ block }: { block: ContentBlock }) {
  const data = block.data as { examples?: Array<{ id: string; label: string; content: string; quality: string; explanation: string }>; prompt?: string } | undefined;
  const examples = data?.examples ?? [
    { id: "weak", label: "Weak", content: "Approved.", quality: "WEAK", explanation: "The record does not show who, what, why, scope, duration, or approver." },
    { id: "strong", label: "Stronger", content: "Riley Patel approved temporary access to OPS-SRV-12 for patch validation from Sep 9-13.", quality: "STRONG", explanation: "The record connects person, system, purpose, scope, duration, and approval." }
  ];
  return <div className="mb-5 rounded-md border border-border p-4"><h3 className="font-semibold">{block.title ?? "Good vs Better"}</h3>{data?.prompt ? <p className="mt-2 text-sm text-muted-foreground">{data.prompt}</p> : null}<div className="mt-3 grid gap-3 md:grid-cols-2">{examples.map((example) => <div key={example.id} className="rounded-md border border-border bg-muted/30 p-3 text-sm"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{example.quality}</p><h4 className="mt-1 font-semibold">{example.label}</h4><p className="mt-2">{example.content}</p><p className="mt-2 text-muted-foreground">{example.explanation}</p></div>)}</div></div>;
}

function MalformedActivity({ title }: { title: string }) {
  return <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><p className="font-semibold">{title}</p><p className="mt-1">This learning activity could not be loaded. Continue the course and notify the course owner if this persists.</p></div>;
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
  const { data, user, service, setData, toast } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const usefulness = rating >= 5 ? "VERY_USEFUL" : rating >= 4 ? "USEFUL" : rating >= 2 ? "SOMEWHAT_USEFUL" : "NOT_USEFUL";
  const submit = async () => {
    const svc = service();
    await svc.recordContentFeedback({ targetType: "COURSE", targetId: courseId, courseId, usefulness, comment });
    setData(svc.snapshot());
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
  const attemptNumber = data.practiceAttempts.filter((attempt) => attempt.userId === user.id && attempt.practiceActivityId === activity.id).length + 1;
  const variant = ActivityVariantService.selectVariant(data, user.id, activity.id, attemptNumber);
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
        {variant ? <Panel className="mb-4"><h2 className="font-semibold">Practice Variant</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(variant.variables).map(([key, value]) => <Info key={key} label={titleize(key)} value={String(value)} />)}</div><p className="mt-3 text-xs text-muted-foreground">Variants are deterministic for this attempt so refresh keeps the same case.</p></Panel> : null}
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
  return <><PageHeader title="Scenario Lab" subtitle="Practice making cybersecurity and compliance decisions in realistic situations." /><div className="grid gap-4 md:grid-cols-4">{["Personnel", "Access", "System Security", "Incident Response"].map((label) => <Panel key={label}><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">{data.scenarioDefinitions.filter((scenario) => scenario.category.includes(label)).length} scenarios</p></Panel>)}</div>{data.scenarioSeries.length ? <section className="mt-5"><h2 className="mb-3 text-lg font-semibold">Investigation Series</h2><div className="grid gap-4 lg:grid-cols-2">{data.scenarioSeries.map((series) => <Panel key={series.id}><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Scenario Series</p><h3 className="mt-2 font-semibold">{series.title}</h3><p className="mt-1 text-sm text-muted-foreground">{series.description}</p><div className="mt-3 space-y-2">{series.scenarioIds.map((scenarioId, index) => { const scenario = data.scenarioDefinitions.find((item) => item.id === scenarioId); return scenario ? <Link key={scenario.id} className="block rounded-md border border-border p-2 text-sm" to={`/scenarios/${scenario.id}`}>{index + 1}. {scenario.title}</Link> : null; })}</div></Panel>)}</div></section> : null}<div className="mt-5 space-y-5">{categories.map((category) => <section key={category}><h2 className="mb-3 text-lg font-semibold">{category}</h2><div className="grid gap-4 lg:grid-cols-2">{data.scenarioDefinitions.filter((scenario) => scenario.category === category).map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} />)}</div></section>)}</div></>;
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
  return <><PageHeader title={scenario.title} subtitle={scenario.description} action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => start()}>Start Scenario</button>} /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel className="border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/30"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Mission</p><h2 className="mt-2 text-2xl font-semibold">Mission Briefing</h2><p className="mt-2 text-sm text-muted-foreground">Situation: {scenario.description}</p><h3 className="mt-5 font-semibold">Your Objectives</h3><div className="mt-3 grid gap-2 md:grid-cols-2">{(scenario.objectives ?? scenario.skillIds.map((skillId) => ({ id: skillId, label: data.skills.find((skill) => skill.id === skillId)?.name ?? skillId, skillId, required: true }))).map((objective) => <div key={objective.id} className="rounded-md border border-border bg-background p-3 text-sm">✓ {objective.label}</div>)}</div><h3 className="mt-5 font-semibold">Systems Available</h3><p className="mt-2 text-sm text-muted-foreground">{titleize((scenario.workspaceType ?? "ACCESS_MANAGER").toLowerCase())}</p></Panel><Panel><h2 className="font-semibold">Previous Attempts</h2><div className="mt-3 space-y-2">{attempts.map((attempt) => <div key={attempt.id} className="rounded-md border border-border p-3 text-sm"><p>{attempt.completedAt ? "Completed" : "In progress"} · {attempt.overallResult.replaceAll("_", " ")}</p><div className="mt-2 flex gap-2"><Link className="rounded-md border border-border px-2 py-1 text-xs" to={`/scenarios/${scenario.id}/run/${attempt.id}`}>{attempt.completedAt ? "Review" : "Resume"}</Link><button className="rounded-md border border-border px-2 py-1 text-xs" onClick={() => start(attempt.id)}>Replay</button></div></div>)}{!attempts.length ? <p className="text-sm text-muted-foreground">No attempts yet.</p> : null}</div></Panel></div></>;
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
  const recordAction = async (actionType: "INSPECT" | "FLAG" | "VERIFY" | "ESCALATE" | "PRESERVE" | "DOCUMENT", targetId?: string) => {
    const svc = service();
    if (actionType === "INSPECT" && targetId && simulationTabs(scenario.workspaceType).includes(targetId)) {
      await svc.setScenarioSimulationTab(attempt.id, targetId);
    } else {
      await svc.recordSimulationAction(attempt.id, actionType, targetId);
    }
    setData(svc.snapshot());
    toast(`${titleize(actionType.toLowerCase())} saved`);
  };
  return <div className="-m-4 min-h-[calc(100vh-2rem)] bg-slate-950 p-4 text-slate-100 md:-m-6 md:p-6"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{scenario.category} · Step {scenario.steps.findIndex((item) => item.id === step.id) + 1} of {scenario.steps.length} · {attempt.supportMode ?? "STANDARD"} mode</p><h1 className="mt-1 text-3xl font-semibold">{scenario.title}</h1></div><Link className="rounded-md border border-slate-700 px-3 py-2 text-sm" to={`/scenarios/${scenario.id}`}>Exit Scenario</Link></div><div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><SimulationWorkspace scenario={scenario} attempt={attempt} onAction={recordAction} /><section className="rounded-md border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-semibold">{step.title ?? "Decision"}</h2><p className="mt-3 leading-7 text-slate-300">{step.narrative}</p>{attempt.supportMode === "GUIDED" ? <div className="mt-4 rounded-md border border-cyan-800 bg-cyan-950/50 p-3 text-sm text-cyan-100">Learning Coach: preserve facts, verify context, and document the decision path before acting.</div> : null}<div className="mt-5 grid gap-3">{step.choices?.map((choice) => <button key={choice.id} className="rounded-md border border-slate-700 bg-slate-950 p-4 text-left hover:border-cyan-400 focus:border-cyan-400" onClick={() => choose(choice)}><span className="font-medium">{choice.label}</span>{choice.description ? <span className="mt-1 block text-sm text-slate-400">{choice.description}</span> : null}</button>)}</div></section></div></div></div>;
}

function SimulationWorkspace({ scenario, attempt, onAction }: { scenario: AppData["scenarioDefinitions"][number]; attempt: AppData["branchingScenarioAttempts"][number]; onAction: (action: "INSPECT" | "FLAG" | "VERIFY" | "ESCALATE" | "PRESERVE" | "DOCUMENT", targetId?: string) => void }) {
  const tabs = simulationTabs(scenario.workspaceType);
  const active = attempt.simulationState?.activeTab ?? tabs[0];
  const flags = attempt.simulationState?.flags ?? [];
  return <section className="rounded-md border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{titleize((scenario.workspaceType ?? "ACCESS_MANAGER").toLowerCase())}</p><div className="mt-3 flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab} className={`rounded-md border px-3 py-2 text-sm ${active === tab ? "border-cyan-400 bg-cyan-950" : "border-slate-700"}`} onClick={() => onAction("INSPECT", tab)}>{tab}</button>)}</div></div><div className="p-4"><SimulationRecords type={scenario.workspaceType} flags={flags} onAction={onAction} /><div className="mt-4 rounded-md border border-slate-800 bg-slate-950 p-3"><h3 className="font-semibold">State</h3><div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(attempt.currentState).map(([key, value]) => <div key={key} className="flex justify-between gap-3 border-b border-slate-800 py-2"><span className="text-slate-400">{titleize(key)}</span><span>{String(value)}</span></div>)}</div></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-md border border-slate-700 px-3 py-2 text-sm" onClick={() => onAction("PRESERVE", "current-evidence")}>Preserve Evidence</button><button className="rounded-md border border-slate-700 px-3 py-2 text-sm" onClick={() => onAction("VERIFY", "maintenance-context")}>Check Maintenance</button><button className="rounded-md border border-slate-700 px-3 py-2 text-sm" onClick={() => onAction("ESCALATE", "approved-channel")}>Escalate</button><button className="rounded-md border border-slate-700 px-3 py-2 text-sm" onClick={() => onAction("DOCUMENT", "scenario-summary")}>Document</button></div></div></section>;
}

function simulationTabs(type?: AppData["scenarioDefinitions"][number]["workspaceType"]) {
  if (type === "SYSTEM_CONSOLE") return ["Overview", "Services", "Accounts", "Patches", "Configuration", "Vulnerabilities"];
  if (type === "INCIDENT_CONSOLE") return ["Events", "Timeline", "Systems", "Accounts", "Evidence", "Response"];
  if (type === "RECOVERY_CONSOLE") return ["Systems", "Dependencies", "Backups", "Procedures", "Exercises", "Issues"];
  if (type === "VENDOR_WORKSPACE") return ["Supplier", "Product", "Access", "Contract", "Security Review", "Issues"];
  if (type === "AUDIT_WORKSPACE") return ["Requirement", "Procedure", "Population", "Samples", "Evidence", "Exceptions"];
  return ["Person", "Role", "Electronic Access", "Physical Access", "Approvals", "History"];
}

function SimulationRecords({ type, flags, onAction }: { type?: AppData["scenarioDefinitions"][number]["workspaceType"]; flags: string[]; onAction: (action: "INSPECT" | "FLAG" | "VERIFY" | "ESCALATE" | "PRESERVE" | "DOCUMENT", targetId?: string) => void }) {
  const rows = type === "SYSTEM_CONSOLE"
    ? [["FTP 21", "Legacy service", "Owner missing"], ["RDP 3389", "Temporary project", "Expired"], ["svc_backup", "Service account", "Unassigned"], ["PATCH-2026-042", "Applicable", "Constraint under review"]]
    : type === "INCIDENT_CONSOLE"
      ? [["02:12 HIGH", "Unexpected administrative connection", "ENG-WS-22 to OPS-SRV-04"], ["02:14 MED", "Authentication pattern change", "jrivera-admin"], ["02:20 MED", "Additional admin connection", "No maintenance visible"]]
      : type === "RECOVERY_CONSOLE"
        ? [["Identity", "Dependency", "Undocumented"], ["Storage", "Procedure", "Retired platform"], ["Backup", "Available", "Validation pending"]]
        : type === "AUDIT_WORKSPACE"
          ? [["Sample C", "Evidence", "Missing approval"], ["Exception", "Record", "Expired"], ["Population", "Reconciliation", "42 expected / 39 included"]]
          : [["Jordan Lee", "Role change", "Operational access active"], ["Remote Administration", "Electronic access", "Review required"], ["Restricted Workspace", "Physical access", "Review required"]];
  return <div className="space-y-2">{rows.map(([idValue, label, status]) => <div key={idValue} className="rounded-md border border-slate-800 bg-slate-950 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{idValue}</p><p className="text-slate-400">{label} · {status}</p></div><div className="flex gap-2"><button className="rounded-md border border-slate-700 px-2 py-1 text-xs" onClick={() => onAction("INSPECT", idValue)}>Inspect</button><button className="rounded-md border border-slate-700 px-2 py-1 text-xs" onClick={() => onAction("FLAG", idValue)}>{flags.includes(idValue) ? "Flagged" : "Flag"}</button></div></div></div>)}</div>;
}

function ScenarioResult({ scenario, attempt }: { scenario: AppData["scenarioDefinitions"][number]; attempt: AppData["branchingScenarioAttempts"][number] }) {
  const strong = attempt.decisions.filter((decision) => decision.quality === "RECOMMENDED");
  const review = attempt.decisions.filter((decision) => decision.quality !== "RECOMMENDED");
  const flags = attempt.simulationState?.flags ?? [];
  return <><PageHeader title="Scenario Complete" subtitle={scenario.title} /><Panel><h2 className="text-2xl font-semibold">Overall: {attempt.overallResult.replaceAll("_", " ")}</h2><div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h3 className="font-semibold">Strong decisions</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{strong.map((decision) => <li key={`${decision.stepId}-${decision.choiceId}`}>{decision.feedback}</li>)}</ul></div><div><h3 className="font-semibold">Review opportunities</h3><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{review.map((decision) => <li key={`${decision.stepId}-${decision.choiceId}`}>{decision.feedback}</li>)}</ul>{!review.length ? <p className="mt-2 text-sm text-muted-foreground">No major review opportunities in this attempt.</p> : null}</div></div></Panel><div className="mt-5 grid gap-4 lg:grid-cols-2"><Panel><h3 className="font-semibold">What Happened</h3><p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p></Panel><Panel><h3 className="font-semibold">What You Noticed</h3><p className="mt-2 text-sm text-muted-foreground">{flags.length ? flags.join(", ") : "Your decisions and inspections were recorded for review."}</p></Panel><Panel><h3 className="font-semibold">What Mattered</h3><p className="mt-2 text-sm text-muted-foreground">The strongest scenarios preserve known facts, verify context, use approved escalation, and retain a defensible record.</p></Panel><Panel><h3 className="font-semibold">Practitioner Perspective</h3><p className="mt-2 text-sm text-muted-foreground">An experienced practitioner usually distinguishes unknown, needs verification, potential concern, and confirmed issue before drawing a final conclusion.</p></Panel></div><Panel className="mt-5"><h3 className="font-semibold">Try This at Work</h3><p className="mt-2 text-sm text-muted-foreground">Identify where this type of record, escalation, or review would be captured in your organization. Save a private follow-up if you need to verify it later.</p><div className="mt-5 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/scenarios/${scenario.id}`}>Replay</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/practice">Recommended Practice</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/scenarios">Return to Scenario Lab</Link></div></Panel></>;
}

function EnvironmentExplorer() {
  const { data } = useApp();
  const world = TrainingWorldService.primaryWorld(data);
  const [tab, setTab] = useState("Overview");
  if (!world) return <NotFound />;
  const entityLabel = (id: string) => TrainingWorldService.entityById(data, id)?.item.name ?? id;
  return <><PageHeader title={world.name} subtitle={world.description} action={<div className="flex flex-wrap gap-2"><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/environment/timeline">Story Timeline</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/environment/map">Environment Map</Link></div>} /><Tabs items={["Overview", "People", "Facilities", "Systems", "Vendors", "Relationships"]} active={tab} onChange={setTab} />{tab === "Overview" ? <Panel className="mt-4"><h2 className="text-lg font-semibold">Fictional Training Environment</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">North Valley Energy provides recurring people, systems, facilities, vendors, and evidence artifacts so learners can investigate realistic situations across courses instead of reading isolated examples.</p><div className="mt-4 grid gap-3 md:grid-cols-4"><Info label="People" value={world.people.length} /><Info label="Systems" value={world.systems.length} /><Info label="Facilities" value={world.facilities.length} /><Info label="Vendors" value={world.vendors.length} /></div></Panel> : null}{tab === "People" ? <WorldGrid items={world.people} render={(person) => <><h3 className="font-semibold">{person.name}</h3><p className="text-sm text-muted-foreground">{person.title}</p><p className="mt-2 text-sm">{person.roleSummary}</p></>} /> : null}{tab === "Facilities" ? <WorldGrid items={world.facilities} render={(facility) => <><h3 className="font-semibold">{facility.name}</h3><p className="text-sm text-muted-foreground">{facility.facilityType} · {facility.locationSummary}</p><p className="mt-2 text-sm">{facility.description}</p></>} /> : null}{tab === "Systems" ? <WorldGrid items={world.systems} render={(system) => <><h3 className="font-semibold">{system.name}</h3><p className="text-sm text-muted-foreground">{system.systemType} · Owner: {system.owner}</p><p className="mt-2 text-sm">{system.description}</p><dl className="mt-2 text-xs text-muted-foreground">{Object.entries(system.attributes).map(([key, value]) => <div key={key}><dt className="inline font-medium">{titleize(key)}: </dt><dd className="inline">{value}</dd></div>)}</dl></>} /> : null}{tab === "Vendors" ? <WorldGrid items={world.vendors} render={(vendor) => <><h3 className="font-semibold">{vendor.name}</h3><p className="mt-2 text-sm">{vendor.description}</p><p className="mt-2 text-xs text-muted-foreground">Services: {vendor.services.join(", ")}</p></>} /> : null}{tab === "Relationships" ? <Panel className="mt-4"><div className="space-y-2">{world.relationships.map((relationship) => <div key={relationship.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{entityLabel(relationship.sourceId)} → {entityLabel(relationship.targetId)}</p><p className="text-muted-foreground">{relationship.label}</p></div>)}</div></Panel> : null}</>;
}

function WorldGrid<T extends { id: string }>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  return <div className="mt-4 grid gap-4 lg:grid-cols-2">{items.map((item) => <Panel key={item.id}>{render(item)}</Panel>)}</div>;
}

function EnvironmentTimelinePage() {
  const { data } = useApp();
  const events = data.trainingWorldEvents.slice().sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime());
  return <><PageHeader title="North Valley Story Timeline" subtitle="Connected fictional events that recur across courses, scenarios, investigations, and audit evidence." action={<Link className="rounded-md border border-border px-3 py-2 text-sm" to="/environment/map">Open Map</Link>} /><div className="space-y-4">{events.map((event, index) => <Panel key={event.id}><div className="grid gap-4 lg:grid-cols-[80px_1fr_260px]"><div className="text-sm font-semibold text-cyan-700">Event {index + 1}</div><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{event.eventType.replaceAll("_", " ")}</p><h2 className="mt-1 text-lg font-semibold">{event.title}</h2><p className="mt-2 text-sm text-muted-foreground">{event.description}</p><div className="mt-3 flex flex-wrap gap-2">{event.entityIds.map((entityId) => <span key={entityId} className="rounded-md bg-muted px-2 py-1 text-xs">{TrainingWorldService.entityById(data, entityId)?.item.name ?? entityId}</span>)}</div></div><div className="space-y-2 text-sm">{event.relatedCourseIds.slice(0, 3).map((courseId) => { const course = data.courses.find((item) => item.id === courseId); return course ? <Link key={course.id} className="block rounded-md border border-border p-2" to={`/courses/${course.id}`}>{course.shortTitle ?? course.title}</Link> : null; })}</div></div></Panel>)}</div></>;
}

function EnvironmentMapPage() {
  const { data } = useApp();
  const world = TrainingWorldService.primaryWorld(data);
  const [selectedId, setSelectedId] = useState("system-ops-srv-12");
  if (!world) return <NotFound />;
  const nodes = [
    ...world.facilities.map((item) => ({ id: item.id, label: item.name, type: "Facility", detail: item.description })),
    ...world.systems.map((item) => ({ id: item.id, label: item.name, type: "System", detail: item.description })),
    ...world.people.map((item) => ({ id: item.id, label: item.name, type: "Person", detail: item.roleSummary })),
    ...world.vendors.map((item) => ({ id: item.id, label: item.name, type: "Vendor", detail: item.description }))
  ];
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const relatedEvents = data.trainingWorldEvents.filter((event) => event.entityIds.includes(selected?.id ?? ""));
  const entityLabel = (id: string) => TrainingWorldService.entityById(data, id)?.item.name ?? id;
  return <><PageHeader title="North Valley Environment Map" subtitle="A touch-friendly map of recurring facilities, systems, people, vendors, and relationships." /><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><Panel><div className="grid gap-3 md:grid-cols-3">{nodes.map((node) => <button key={node.id} className={`min-h-24 rounded-md border p-3 text-left text-sm ${selected?.id === node.id ? "border-cyan-700 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => setSelectedId(node.id)}><span className="text-xs uppercase tracking-wide text-muted-foreground">{node.type}</span><span className="mt-1 block font-semibold">{node.label}</span></button>)}</div><div className="mt-5 rounded-md border border-border p-4"><h2 className="font-semibold">Relationships</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{world.relationships.slice(0, 12).map((relationship) => <div key={relationship.id} className="rounded-md bg-muted/60 p-2 text-xs"><span className="font-medium">{relationship.label}</span><span className="block text-muted-foreground">{entityLabel(relationship.sourceId)} → {entityLabel(relationship.targetId)}</span></div>)}</div></div></Panel><Panel><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{selected?.type}</p><h2 className="mt-1 text-xl font-semibold">{selected?.label}</h2><p className="mt-2 text-sm text-muted-foreground">{selected?.detail}</p><h3 className="mt-5 font-semibold">Appears In</h3><div className="mt-2 space-y-2">{relatedEvents.map((event) => <Link key={event.id} className="block rounded-md border border-border p-3 text-sm" to="/environment/timeline">{event.title}<span className="block text-xs text-muted-foreground">{event.relatedCourseIds.map((courseId) => data.courses.find((course) => course.id === courseId)?.shortTitle ?? data.courses.find((course) => course.id === courseId)?.title).filter(Boolean).join(", ")}</span></Link>)}</div>{selected?.id === "system-ops-srv-12" ? <Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/courses/course-cip007-system-security">Open CIP-007</Link> : null}</Panel></div></>;
}

function InvestigationDetailPage() {
  const { investigationId } = useParams();
  const navigate = useNavigate();
  const { data } = useApp();
  const investigation = data.investigationDefinitions.find((item) => item.id === investigationId);
  if (!investigation) return <NotFound />;
  const start = () => navigate(`/investigations/${investigation.id}/run/${crypto.randomUUID()}`);
  return <><PageHeader title={investigation.title} subtitle={investigation.description} action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={start}>Begin Investigation</button>} /><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><Panel><h2 className="text-lg font-semibold">Mission Briefing</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{investigation.conclusionPrompt}</p><h3 className="mt-5 font-semibold">Tools Available</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{investigation.availableTools.map((tool) => <div key={tool.id} className="rounded-md border border-border p-3"><p className="font-medium">{tool.label}</p><p className="text-sm text-muted-foreground">{tool.toolType.replaceAll("_", " ")} · {tool.records.length} records</p></div>)}</div></Panel><Panel><h2 className="font-semibold">Objectives</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{investigation.objectives.map((objective) => <li key={objective.id}>✓ {objective.label}</li>)}</ul><h3 className="mt-5 font-semibold">Related Courses</h3><div className="mt-2 space-y-2">{investigation.relatedCourseIds.map((courseId) => { const course = data.courses.find((item) => item.id === courseId); return course ? <Link key={course.id} className="block rounded-md border border-border p-2 text-sm" to={`/courses/${course.id}`}>{course.shortTitle ?? course.title}</Link> : null; })}</div></Panel></div></>;
}

function InvestigationRunPage() {
  const { investigationId, attemptId } = useParams();
  const { data, service, setData, toast } = useApp();
  const investigation = data.investigationDefinitions.find((item) => item.id === investigationId);
  const [activeToolId, setActiveToolId] = useState(investigation?.availableTools[0]?.id ?? "");
  const [manualNote, setManualNote] = useState("");
  if (!investigation || !attemptId) return <NotFound />;
  const notes = InvestigationService.notesForAttempt(data, attemptId);
  const hypothesis = InvestigationService.latestHypothesis(data, attemptId);
  const result = InvestigationService.evaluate(data, investigation.id, attemptId);
  const activeTool = investigation.availableTools.find((tool) => tool.id === activeToolId) ?? investigation.availableTools[0];
  const addNote = async (noteType: "FINDING" | "EVIDENCE", record: { id: string; title: string; summary: string }) => {
    const svc = service();
    await svc.addInvestigationNote({ attemptId, noteType, title: record.title, content: record.summary, sourceToolId: activeTool.id, sourceRecordId: record.id });
    setData(svc.snapshot());
    toast(noteType === "FINDING" ? "Finding added" : "Evidence preserved");
  };
  const setHypothesis = async (value: "AUTHORIZED_ACTIVITY" | "MISCONFIGURATION" | "POTENTIAL_UNAUTHORIZED_ACTIVITY" | "INSUFFICIENT_INFORMATION") => {
    const svc = service();
    await svc.setInvestigationHypothesis({ attemptId, hypothesis: value, confidence: value === "INSUFFICIENT_INFORMATION" ? "LOW" : "MEDIUM" });
    setData(svc.snapshot());
  };
  const saveManual = async () => {
    if (!manualNote.trim()) return;
    const svc = service();
    await svc.addInvestigationNote({ attemptId, noteType: "MANUAL", title: "Investigation note", content: manualNote });
    setManualNote("");
    setData(svc.snapshot());
  };
  const complete = async () => {
    const svc = service();
    const completed = await svc.completeInvestigation(investigation.id, attemptId);
    setData(svc.snapshot());
    toast(`Investigation completed: ${completed.replaceAll("_", " ").toLowerCase()}`);
  };
  return <><PageHeader title={investigation.title} subtitle="Inspect tools, collect findings, preserve evidence, update your hypothesis, and document a conclusion." action={<button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={complete}>Complete Debrief</button>} /><div className="grid gap-5 xl:grid-cols-[1fr_360px]"><Panel><div className="flex flex-wrap gap-2">{investigation.availableTools.map((tool) => <button key={tool.id} className={`min-h-11 rounded-md border px-3 py-2 text-sm ${activeTool.id === tool.id ? "border-cyan-700 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => setActiveToolId(tool.id)}>{tool.label}</button>)}</div><div className="mt-5 rounded-md border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{activeTool.toolType.replaceAll("_", " ")}</p><h2 className="mt-1 text-lg font-semibold">{activeTool.label}</h2><div className="mt-4 space-y-3">{activeTool.records.map((record) => <div key={record.id} className="rounded-md border border-border p-3"><p className="font-medium">{record.title}</p><p className="mt-1 text-sm text-muted-foreground">{record.summary}</p><div className="mt-3 flex flex-wrap gap-2"><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => addNote("FINDING", record)}>Add to Findings</button><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => addNote("EVIDENCE", record)}>Preserve Evidence</button></div></div>)}</div></div><div className="mt-5 rounded-md border border-border p-4"><h2 className="font-semibold">Current Working Hypothesis</h2><div className="mt-3 grid gap-2 md:grid-cols-2">{(["INSUFFICIENT_INFORMATION", "AUTHORIZED_ACTIVITY", "MISCONFIGURATION", "POTENTIAL_UNAUTHORIZED_ACTIVITY"] as const).map((value) => <button key={value} className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${hypothesis?.hypothesis === value ? "border-cyan-700 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`} onClick={() => setHypothesis(value)}>{value.replaceAll("_", " ")}</button>)}</div></div></Panel><Panel><h2 className="font-semibold">Investigation Notebook</h2><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Info label="Findings" value={notes.filter((note) => note.noteType === "FINDING").length} /><Info label="Evidence" value={notes.filter((note) => note.noteType === "EVIDENCE").length} /><Info label="Hypothesis" value={hypothesis?.confidence ?? "None"} /></div><div className="mt-4 space-y-2">{notes.map((note) => <div key={note.id} className="rounded-md border border-border p-3 text-sm"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{note.noteType}</p><p className="font-medium">{note.title}</p><p className="text-muted-foreground">{note.content}</p></div>)}</div><textarea className="mt-4 min-h-24 w-full rounded-md border border-border bg-transparent p-3 text-sm" placeholder="Add a manual investigation note..." value={manualNote} onChange={(event) => setManualNote(event.target.value)} /><button className="mt-2 rounded-md border border-border px-3 py-2 text-sm" onClick={saveManual}>Save Note</button><div className="mt-5 rounded-md bg-muted/50 p-3 text-sm"><p className="font-semibold">Debrief Preview</p><p className="mt-1 text-muted-foreground">Finding coverage: {result.findingCoverage} ({result.foundCount}/{result.expectedCount})</p><p className="text-muted-foreground">Evidence quality: {result.evidenceQuality}</p><p className="text-muted-foreground">{result.verificationState}</p><p className="text-muted-foreground">{result.escalationState}</p></div></Panel></div></>;
}

function CourseReferencePage() {
  const { courseId } = useParams();
  const { data, service, setData, toast } = useApp();
  const course = data.courses.find((item) => item.id === courseId);
  if (!course) return <NotFound />;
  const resources = data.learningResources.filter((resource) => resource.relatedCourseIds.includes(course.id));
  const artifacts = TrainingWorldService.artifactsForCourse(data, course.id);
  const diagrams = data.learningDiagrams.filter((diagram) => course.storyArc && (diagram.title.toLowerCase().includes(course.shortTitle?.toLowerCase() ?? "") || diagram.relatedCourseIds.includes(course.id))).slice(0, 5);
  const save = async (title: string, href: string) => {
    const svc = service();
    await svc.saveLearningItem({ targetType: "RESOURCE", targetId: href, title, href });
    setData(svc.snapshot());
    toast("Saved for later");
  };
  return <><PageHeader title={`${course.shortTitle ?? course.title} Reference`} subtitle="Use at Work: concise job aids, diagrams, artifacts, and checklists from this course." action={<button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => window.print()}>Print</button>} /><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><Panel><h2 className="text-lg font-semibold">Quick References</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{resources.map((resource) => <div key={resource.id} className="rounded-md border border-border p-3"><p className="font-medium">{resource.title}</p><p className="mt-1 text-sm text-muted-foreground">{resource.description}</p><div className="mt-3 flex gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/resources/${resource.id}`}>Open</Link><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => save(resource.title, `/resources/${resource.id}`)}>Save</button></div></div>)}</div>{!resources.length ? <p className="mt-3 text-sm text-muted-foreground">No reusable resources are attached yet.</p> : null}</Panel><Panel><h2 className="text-lg font-semibold">Training Context</h2><EnvironmentContext entities={TrainingWorldService.courseEntities(data, course)} /><Link className="mt-3 inline-flex rounded-md border border-border px-3 py-2 text-sm" to="/environment">Explore North Valley</Link></Panel></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><Panel><h2 className="text-lg font-semibold">Artifacts</h2><div className="mt-3 space-y-2">{artifacts.map((artifact) => <div key={artifact.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{artifact.title}</p><p className="text-muted-foreground">{artifact.subtitle}</p></div>)}{!artifacts.length ? <p className="text-sm text-muted-foreground">No artifacts attached.</p> : null}</div></Panel><Panel><h2 className="text-lg font-semibold">Visual Models</h2><div className="mt-3 space-y-2">{diagrams.map((diagram) => <div key={diagram.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{diagram.title}</p><p className="text-muted-foreground">{diagram.description}</p></div>)}{!diagrams.length ? <p className="text-sm text-muted-foreground">Visual models appear here as the course is expanded.</p> : null}</div></Panel></div><p className="mt-4 text-xs text-muted-foreground">Reference mode is a learning/job-aid view. It does not change course completion, certificate status, or compliance evidence.</p></>;
}

function LearnerGoalsPage() {
  const { data, user, service, setData, toast } = useApp();
  const options = LearnerGoalService.options(data);
  const goals = LearnerGoalService.activeGoals(data, user.id);
  const create = async (skillId: string) => {
    const svc = service();
    await svc.createLearnerGoal(skillId);
    setData(svc.snapshot());
    toast("Learning goal saved");
  };
  return <><PageHeader title="Learning Goals" subtitle="Choose a capability you want to strengthen through courses, practice, and scenarios." /><div className="grid gap-4 lg:grid-cols-2">{options.map((option) => <Panel key={option.skillId}><h2 className="font-semibold">{option.label}</h2><p className="mt-1 text-sm text-muted-foreground">{option.skill?.description}</p><button className="mt-3 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => create(option.skillId)}>Strengthen This</button></Panel>)}</div><h2 className="mt-6 text-lg font-semibold">Active Goals</h2><div className="mt-3 grid gap-4 lg:grid-cols-2">{goals.map((goal) => { const skill = data.skills.find((item) => item.id === goal.skillId); const recs = LearnerGoalService.recommendations(data, goal); return <Panel key={goal.id}><h3 className="font-semibold">{skill?.name ?? goal.skillId}</h3><p className="mt-1 text-sm text-muted-foreground">{skill?.description}</p><div className="mt-3 space-y-2">{recs.practice.map((activity) => <Link key={activity.id} className="block rounded-md border border-border p-2 text-sm" to={`/practice/${activity.id}`}>{activity.title}</Link>)}{recs.scenarios.map((scenario) => <Link key={scenario.id} className="block rounded-md border border-border p-2 text-sm" to={`/scenarios/${scenario.id}`}>{scenario.title}</Link>)}</div></Panel>; })}</div></>;
}

function LearnerPortfolioPage() {
  const { data, user } = useApp();
  const completedCourses = data.enrollments.filter((item) => item.userId === user.id && item.status === "COMPLETED").map((item) => data.courses.find((course) => course.id === item.courseId)).filter(Boolean) as Course[];
  const scenarios = data.branchingScenarioAttempts.filter((item) => item.userId === user.id && item.completedAt);
  const practices = data.practiceAttempts.filter((item) => item.userId === user.id && item.completedAt);
  return <><PageHeader title="Learner Portfolio" subtitle="A private summary of courses, scenarios, practice highlights, skills, and certificates." /><div className="grid gap-5 xl:grid-cols-2"><Panel><h2 className="text-lg font-semibold">Courses</h2><div className="mt-3 space-y-2">{completedCourses.map((course) => <Link key={course.id} className="block rounded-md border border-border p-3 text-sm" to={`/courses/${course.id}`}>{course.title}<span className="block text-xs text-muted-foreground">Completed training</span></Link>)}</div></Panel><Panel><h2 className="text-lg font-semibold">Scenario Highlights</h2><div className="mt-3 space-y-2">{scenarios.map((attempt) => <div key={attempt.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{data.scenarioDefinitions.find((scenario) => scenario.id === attempt.scenarioId)?.title ?? "Scenario"}</p><p className="text-muted-foreground">{attempt.overallResult.replaceAll("_", " ")} · {new Date(attempt.completedAt!).toLocaleDateString()}</p></div>)}</div></Panel><Panel><h2 className="text-lg font-semibold">Practice Highlights</h2><div className="mt-3 space-y-2">{practices.map((attempt) => <div key={attempt.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{data.practiceActivities.find((activity) => activity.id === attempt.practiceActivityId)?.title ?? "Practice"}</p><p className="text-muted-foreground">{attempt.topicResults[0]?.result.replaceAll("_", " ") ?? "Complete"}</p></div>)}</div></Panel><Panel><h2 className="text-lg font-semibold">Certificates</h2><div className="mt-3 space-y-2">{data.userCertifications.filter((cert) => cert.userId === user.id).map((cert) => <div key={cert.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{data.certifications.find((item) => item.id === cert.certificationId)?.name ?? "Certificate"}</p><p className="text-muted-foreground">Issued {new Date(cert.issuedAt).toLocaleDateString()}</p></div>)}</div></Panel></div><p className="mt-4 text-xs text-muted-foreground">Portfolio notes are private in this demo. Managers continue to use Team Learning and Coaching views for organizational status.</p></>;
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

function LearningSessionPage() {
  const { data, user, service, setData, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const minutes = Number(params.get("minutes") ?? 15) as 5 | 10 | 15 | 30;
  const sessionId = params.get("sessionId");
  const existing = sessionId ? data.learningSessions.find((item) => item.id === sessionId) : undefined;
  const [session, setSession] = useState(existing ?? LearningSessionService.buildSession(data, user.id, [5, 10, 15, 30].includes(minutes) ? minutes : 15));

  useEffect(() => {
    if (existing) return;
    const svc = service();
    void svc.saveLearningSession(session).then(() => {
      setData(svc.snapshot());
      setParams({ sessionId: session.id });
    });
  }, []);

  const completeItem = async (targetId: string) => {
    const svc = service();
    await svc.completeLearningSessionItem(session.id, targetId);
    setData(svc.snapshot());
    const updated = svc.snapshot().learningSessions.find((item) => item.id === session.id);
    if (updated) setSession(updated);
    toast("Session step completed");
  };
  const completed = session.items.filter((item) => item.completedAt).length;
  const current = session.items.find((item) => !item.completedAt);
  if (session.completedAt) return <><PageHeader title="Session Complete" subtitle={`${session.targetMinutes} minutes of targeted reinforcement.`} /><Panel><h2 className="text-2xl font-semibold">You reinforced</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{session.skillIds.map((skillId) => <Info key={skillId} label={data.skills.find((skill) => skill.id === skillId)?.name ?? skillId} value="Strong" />)}</div><div className="mt-5 flex gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/home">Return Home</Link><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/scenarios/scenario-unexpected-admin-connection">Recommended Scenario</Link></div></Panel></>;
  return <><PageHeader title={session.title} subtitle="A short guided sequence assembled from your current recommendations." /><Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">{completed} of {session.items.length} steps complete</p><h2 className="mt-1 text-xl font-semibold">Today you'll reinforce {session.skillIds.map((skillId) => data.skills.find((skill) => skill.id === skillId)?.name).filter(Boolean).join(", ") || "core GridGuard skills"}</h2></div><Link className="rounded-md border border-border px-3 py-2 text-sm" to="/review">Review My Mistakes</Link></div></Panel><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]"><Panel><h2 className="font-semibold">Current Step</h2>{current ? <SessionItem item={current} onComplete={completeItem} /> : null}</Panel><Panel><h2 className="font-semibold">Sequence</h2><div className="mt-3 space-y-2">{session.items.map((item) => <SessionItemSummary key={item.id} item={item} />)}</div></Panel></div></>;
}

function SessionItem({ item, onComplete }: { item: AppData["learningSessions"][number]["items"][number]; onComplete: (targetId: string) => void }) {
  const { data } = useApp();
  const target = item.itemType === "SCENARIO" ? data.scenarioDefinitions.find((scenario) => scenario.id === item.targetId) : data.practiceActivities.find((activity) => activity.id === item.targetId);
  const href = item.itemType === "SCENARIO" ? `/scenarios/${item.targetId}` : `/practice/${item.targetId}`;
  return <div className="mt-3 rounded-md border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{item.itemType.replaceAll("_", " ")}</p><h3 className="mt-2 text-xl font-semibold">{target?.title ?? item.targetId}</h3><p className="mt-2 text-sm text-muted-foreground">{target?.description}</p><p className="mt-3 text-sm">{item.estimatedMinutes} min</p><div className="mt-4 flex flex-wrap gap-2"><Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={href}>Open Activity</Link><button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => onComplete(item.targetId)}>Mark Step Complete</button></div></div>;
}

function SessionItemSummary({ item }: { item: AppData["learningSessions"][number]["items"][number] }) {
  const { data } = useApp();
  const target = item.itemType === "SCENARIO" ? data.scenarioDefinitions.find((scenario) => scenario.id === item.targetId) : data.practiceActivities.find((activity) => activity.id === item.targetId);
  return <div className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{target?.title ?? item.targetId}</p><p className="text-muted-foreground">{item.completedAt ? "Complete" : "Open"} · {item.estimatedMinutes} min</p></div>;
}

function ReviewMistakesPage() {
  const { data, user } = useApp();
  const misconceptions = buildMisconceptions(data, user.id);
  return <><PageHeader title="Review My Mistakes" subtitle="Revisit concepts that have caused difficulty across courses, practice, and scenarios." /><div className="grid gap-4 lg:grid-cols-2">{misconceptions.map((item) => <Panel key={item.id}><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Pattern detected</p><h2 className="mt-2 text-xl font-semibold">{item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.explanation}</p><p className="mt-3 text-sm">Seen in {item.occurrences} learning result{item.occurrences === 1 ? "" : "s"}.</p><div className="mt-4 flex flex-wrap gap-2">{item.recommendedActivityIds.map((activityId) => <Link key={activityId} className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/practice/${activityId}`}>Try New Challenge</Link>)}<Link className="rounded-md border border-border px-3 py-2 text-sm" to="/learning">Review Lesson</Link></div></Panel>)}</div>{!misconceptions.length ? <EmptyState text="No recurring review patterns are visible right now." action="Explore Practice" href="/practice" /> : null}</>;
}

function buildMisconceptions(data: AppData, userId: string) {
  const weakEvidence = data.skillEvidence.filter((item) => item.userId === userId && item.result !== "STRONG");
  const failedTopics = data.assessmentAttempts.filter((item) => item.userId === userId && !item.passed).flatMap((item) => item.missedTopics ?? []);
  const ids = Array.from(new Set([...weakEvidence.map((item) => item.skillId), ...failedTopics.map((topic) => data.skills.find((skill) => topic.toLowerCase().includes(skill.name.toLowerCase().split(" ")[0]))?.id).filter(Boolean) as string[]]));
  return ids.map((skillId) => {
    const skill = data.skills.find((item) => item.id === skillId)!;
    const activities = data.practiceActivities.filter((activity) => activity.skillIds.includes(skillId)).slice(0, 2);
    const occurrences = weakEvidence.filter((item) => item.skillId === skillId).length + failedTopics.filter((topic) => topic.toLowerCase().includes(skill.name.toLowerCase().split(" ")[0])).length;
    return { id: `misconception-${userId}-${skillId}`, userId, topicId: skillId, skillId, title: skill.name, explanation: misconceptionExplanation(skill.name), evidenceSources: [], occurrences: Math.max(1, occurrences), recommendedActivityIds: activities.map((activity) => activity.id) };
  });
}

function misconceptionExplanation(skillName: string) {
  if (skillName.includes("Patch")) return "You sometimes treat applicability and implementation as the same decision. Applicability asks whether a patch applies; implementation asks how it should be handled through the approved process.";
  if (skillName.includes("Incident")) return "The pattern suggests a need to separate known facts from final incident classification.";
  if (skillName.includes("Evidence")) return "The recurring issue is traceability: another reviewer needs who, what, when, result, and process connection.";
  return `This topic has recent developing or needs-review evidence. A short practice activity can reinforce the underlying decision pattern.`;
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
  const assignBundle = async () => {
    const bundle = data.learningAssignmentBundles.find((item) => item.id === "bundle-cip007-readiness") ?? data.learningAssignmentBundles[0];
    const learner = data.users.find((item) => item.email === "jamie.rivera@gridguard.local") ?? data.users[0];
    if (!bundle || !learner) return;
    const svc = service();
    await svc.assignLearningBundle(bundle.id, [{ audienceType: "USER", audienceId: learner.id }], addDays(new Date(), 21).toISOString(), "Readiness bundle assigned from coaching.");
    setData(svc.snapshot());
    toast("Readiness bundle assigned");
  };
  return <><PageHeader title="Coaching" subtitle="Identify meaningful learning opportunities based on recent activity." action={<button className="rounded-md border border-border px-3 py-2 text-sm" onClick={assignBundle}>Assign CIP-007 Bundle</button>} /><div className="grid gap-4 lg:grid-cols-2">{opportunities.map((item) => { const learner = data.users.find((candidate) => candidate.id === item.userId); const skill = data.skills.find((candidate) => candidate.id === item.skillId); const activity = data.practiceActivities.find((candidate) => candidate.id === item.activityId); const guide = data.skillCoachingGuides.find((candidate) => candidate.skillId === item.skillId) ?? data.skillCoachingGuides[0]; return <Panel key={`${item.userId}-${item.skillId}`}><h2 className="font-semibold">{learner?.name}</h2><p className="mt-1 text-sm text-muted-foreground">{skill?.name} · {item.priority} priority</p><p className="mt-3 text-sm">Suggested: assign {activity?.title ?? "targeted practice"}.</p>{guide ? <div className="mt-4 rounded-md bg-muted/50 p-3"><p className="text-sm font-semibold">Coaching prompts</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{guide.prompts.slice(0, 3).map((prompt) => <li key={prompt}>• {prompt}</li>)}</ul></div> : null}<button className="mt-4 rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => assign(item.userId, item.activityId)}>Assign Practice</button></Panel>; })}</div>{!opportunities.length ? <EmptyState text="No coaching opportunities require attention." action="View Team" href="/team" /> : null}</>;
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
  return <><PageHeader title="Learning Paths" subtitle="Role-based course sequences and progress." action={<Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to="/programs">Open Programs</Link>} /><div className="grid gap-4 lg:grid-cols-2">{data.learningPaths.map((path) => <Panel key={path.id}><h2 className="font-semibold">{path.title}</h2><p className="mt-2 text-sm text-muted-foreground">{path.description}</p><p className="mt-3 text-sm">Progress: {data.learningPathEnrollments.find((e) => e.learningPathId === path.id && e.userId === user.id)?.progress ?? 0}%</p></Panel>)}</div></>;
}

function ProgramsPage() {
  const { data, user } = useApp();
  return <><PageHeader title="Programs" subtitle="Cross-course readiness programs that combine courses, practice, scenarios, and capstones." /><div className="grid gap-4 lg:grid-cols-3">{data.learningPrograms.filter((program) => program.status === "PUBLISHED").map((program) => { const progress = ProgramService.getProgramProgress(data, user.id, program.id); return <Panel key={program.id}><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Program</p><h2 className="mt-2 text-lg font-semibold">{program.title}</h2><p className="mt-2 text-sm text-muted-foreground">{program.description}</p><div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${progress?.percent ?? 0}%` }} /></div><p className="mt-2 text-sm text-muted-foreground">{progress?.requiredComplete ?? 0} of {progress?.requiredTotal ?? 0} required complete</p><Link className="mt-4 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/programs/${program.id}`}>Open Program</Link></Panel>; })}</div></>;
}

function ProgramDetailPage() {
  const { programId } = useParams();
  const { data, user } = useApp();
  const progress = programId ? ProgramService.getProgramProgress(data, user.id, programId) : undefined;
  if (!progress) return <NotFound />;
  return <><PageHeader title={progress.program.title} subtitle={progress.program.description} action={progress.program.capstoneScenarioId ? <Link className={`rounded-md px-3 py-2 text-sm ${progress.capstoneAvailable ? "bg-cyan-700 text-white" : "border border-border text-muted-foreground"}`} to={progress.capstoneAvailable ? `/scenarios/${progress.program.capstoneScenarioId}` : "#"}>Open Capstone</Link> : null} /><div className="grid gap-5 xl:grid-cols-[1fr_320px]"><Panel><div className="mb-5"><p className="text-sm text-muted-foreground">{progress.requiredComplete} of {progress.requiredTotal} required items complete</p><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-700" style={{ width: `${progress.percent}%` }} /></div></div><div className="space-y-5">{progress.program.stages.map((stage) => <section key={stage.id}><h2 className="font-semibold">{stage.title}</h2>{stage.description ? <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p> : null}<div className="mt-3 space-y-2">{stage.items.map((item) => { const itemProgress = progress.items.find((candidate) => candidate.item.id === item.id)!; return <Link key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm" to={itemProgress.href}><span><span className="font-medium">{itemProgress.title}</span><span className="block text-xs text-muted-foreground">{item.type.toLowerCase()} · {item.required ? "required" : "optional"}</span></span><span>{itemProgress.complete ? "✓ Complete" : item.type === "CAPSTONE" && !progress.capstoneAvailable ? "Available after required items" : "Open"}</span></Link>; })}</div></section>)}</div></Panel><Panel><h2 className="font-semibold">Program Outcome</h2><p className="mt-2 text-sm text-muted-foreground">{progress.complete ? "Program complete. This demo can issue a professional program completion certificate when configured." : "Complete required items to unlock the capstone and program completion."}</p><h3 className="mt-5 font-semibold">Skills Developed</h3><div className="mt-2 flex flex-wrap gap-2">{Array.from(new Set(progress.items.flatMap((item) => item.item.type === "COURSE" ? data.courseSkills.filter((skill) => skill.courseId === item.item.targetId).map((skill) => skill.skillId) : item.item.type === "PRACTICE" ? data.practiceActivities.find((practice) => practice.id === item.item.targetId)?.skillIds ?? [] : data.scenarioDefinitions.find((scenario) => scenario.id === item.item.targetId)?.skillIds ?? []))).slice(0, 10).map((skillId) => <Link key={skillId} className="rounded-md bg-muted px-2 py-1 text-xs" to={`/skills/${skillId}`}>{data.skills.find((skill) => skill.id === skillId)?.name ?? skillId}</Link>)}</div></Panel></div></>;
}

function TeachMeThisPage() {
  const { skillId } = useParams();
  const { data, user } = useApp();
  const skill = data.skills.find((item) => item.id === skillId);
  const route = MicroLearningRouteService.buildTopicRoute(data, user.id, skillId ?? "", 10);
  return <><PageHeader title={`${skill?.name ?? "Topic"} - Teach Me This`} subtitle="A short route using existing GridGuard content. No generated content or external AI is used." /><Panel><div className="space-y-3">{route.map((item, index) => <Link key={`${item.type}-${item.href}`} className="flex items-center justify-between rounded-md border border-border p-3 text-sm" to={item.href}><span><span className="text-xs text-muted-foreground">Step {index + 1} · {item.type}</span><span className="block font-medium">{item.title}</span></span><span>{item.minutes} min</span></Link>)}</div>{!route.length ? <p className="text-sm text-muted-foreground">No short learning route is available yet. Try related courses, practice, or resources.</p> : null}</Panel></>;
}

function HelpPage() {
  const topics = [
    ["Getting Started", "Use Home for your next best action. Learn contains courses and resources. Practice contains short challenges and Scenario Lab."],
    ["Skills", "Needs Review, Developing, and Strong summarize evidence from courses, practice, scenarios, and assessments without showing a raw ranking."],
    ["Scenario Results", "Scenario outcomes consider decisions, evidence preservation, verification, escalation, and documentation. They are learning records, not formal certifications."],
    ["Recommendations", "Recommendations are deterministic and local. Required training outranks optional practice."],
    ["Accessibility", "Interactions support keyboard operation, non-drag alternatives, visible focus, and reduced-motion preferences."]
  ];
  return <><PageHeader title="Help" subtitle="How to use GridGuard's continuous learning environment." /><div className="grid gap-4 lg:grid-cols-2">{topics.map(([title, body]) => <Panel key={title}><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{body}</p></Panel>)}</div></>;
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
  const competency = SkillCompetencyService.getCompetencyStates(data, user.id).find((item) => item.skillId === skillId);
  const skill = data.skills.find((item) => item.id === skillId);
  if (!skill || !mastery) return <NotFound />;
  const evidence = data.skillEvidence.filter((item) => item.userId === user.id && item.skillId === skill.id).sort((left, right) => new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime());
  const practices = data.practiceActivities.filter((activity) => activity.skillIds.includes(skill.id));
  const scenarios = data.scenarioDefinitions.filter((scenario) => scenario.skillIds.includes(skill.id));
  return <><PageHeader title={skill.name} subtitle={skill.description} action={<Link className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" to={`/teach/${skill.id}`}>Teach Me This</Link>} /><div className="grid gap-5 lg:grid-cols-[1fr_340px]"><Panel><h2 className="text-xl font-semibold">{mastery.state.replaceAll("_", " ")}</h2><p className="mt-2 text-sm text-muted-foreground">Current state is calculated from recent course, practice, and scenario evidence.</p>{competency ? <div className="mt-6"><h3 className="font-semibold">Competency Progression</h3><div className="mt-3 grid gap-2 sm:grid-cols-4">{(["LEARN", "PRACTICE", "APPLY", "DEMONSTRATE"] as const).map((stage) => { const done = competency.stageEvidence[stage.toLowerCase() as keyof typeof competency.stageEvidence]; const current = competency.currentStage === stage; return <div key={stage} className={`rounded-md border p-3 text-sm ${current ? "border-cyan-700 bg-cyan-50 dark:bg-cyan-950" : "border-border"}`}><p className="font-medium">{done ? "✓" : current ? "●" : "○"} {stage}</p></div>; })}</div><p className="mt-3 text-sm text-muted-foreground">Current stage: {competency.currentStage}. The next useful step is selected from related practice, scenarios, and assessments.</p></div> : null}<h3 className="mt-6 font-semibold">Recent Evidence</h3><div className="mt-3 space-y-2">{evidence.map((item) => <div key={item.id} className="rounded-md border border-border p-3 text-sm"><p className="font-medium">{item.details ?? item.sourceType.replaceAll("_", " ")}</p><p className="text-muted-foreground">{item.result.replaceAll("_", " ")} · {new Date(item.observedAt).toLocaleDateString()}</p></div>)}{!evidence.length ? <p className="text-sm text-muted-foreground">Complete related courses, practice, or scenarios to build evidence.</p> : null}</div></Panel><Panel><h2 className="font-semibold">Recommended Next</h2><div className="mt-3 space-y-2">{practices.slice(0, 3).map((activity) => <Link key={activity.id} className="block rounded-md border border-border p-3 text-sm" to={`/practice/${activity.id}`}>{activity.title}<span className="block text-xs text-muted-foreground">{activity.estimatedMinutes} min practice · {activity.progressionLevel ?? "PRACTICE"}</span></Link>)}{scenarios.slice(0, 3).map((scenario) => <Link key={scenario.id} className="block rounded-md border border-border p-3 text-sm" to={`/scenarios/${scenario.id}`}>{scenario.title}<span className="block text-xs text-muted-foreground">{scenario.estimatedMinutes} min scenario</span></Link>)}</div></Panel></div></>;
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

type QualityStatus = "READY" | "REVIEW" | "BLOCKED";

function CourseQualityDashboard() {
  const { data } = useApp();
  const publishedCourses = data.courses
    .filter((course) => course.status === "PUBLISHED" && course.showInCatalog)
    .sort((left, right) => left.title.localeCompare(right.title));
  const rows = publishedCourses.map((course) => {
    const readiness = calculateCourseReadiness(data, course.id);
    const health = ContentHealthService.getCourseHealth(data, course.id);
    const audit = CourseDepthAuditService.auditCourse(data, course.id);
    const validation = LearningContentValidator.validateCourse(data, course.id);
    const lessons = data.lessons.filter((lesson) => lesson.courseVersionId === course.currentVersionId);
    const blocks = data.contentBlocks.filter((block) => lessons.some((lesson) => lesson.id === block.lessonId));
    const assessments = data.assessments.filter((assessment) => assessment.courseVersionId === course.currentVersionId);
    const questions = assessments.flatMap((assessment) => data.assessmentQuestions
      .filter((item) => item.assessmentId === assessment.id)
      .map((item) => data.questions.find((question) => question.id === item.questionId))
      .filter(Boolean) as Question[]);
    const duplicateCount = questions.length - new Set(questions.map((question) => normalizeQualityText(question.prompt))).size;
    const formulaicPrompts = questions.filter((question) => /^(in\s+)?cip-\d{3}.*lesson\s+\d+|strongest learner action/i.test(question.prompt));
    const resources = data.learningResources.filter((resource) => resource.relatedCourseIds.includes(course.id));
    const scenarios = data.scenarioDefinitions.filter((scenario) => scenario.relatedCourseIds.includes(course.id));
    const hasInteraction = blocks.some((block) => ["knowledge_check", "quick_recall", "classification", "matching", "sequence_builder", "decision_cards", "evidence_inspector", "system_inspector", "network_explorer", "artifact_review", "record_repair", "rapid_decisions"].includes(block.type));
    const hasVisual = blocks.some((block) => ["learning_diagram", "process_diagram", "timeline", "network_explorer", "system_inspector", "artifact_review", "quality_comparison"].includes(block.type));
    const statuses = {
      content: readiness.blockingIssues.length || audit.dimensions.contentDepth === "NEEDS_ATTENTION" ? "REVIEW" : "READY",
      interactions: hasInteraction && audit.dimensions.activePractice === "STRONG" ? "READY" : "REVIEW",
      scenario: scenarios.length && audit.dimensions.scenarioQuality === "STRONG" ? "READY" : "REVIEW",
      assessment: formulaicPrompts.length || duplicateCount > Math.max(1, Math.floor(questions.length * 0.1)) ? "BLOCKED" : audit.dimensions.assessmentQuality === "STRONG" ? "READY" : "REVIEW",
      completion: readiness.blockingIssues.some((issue) => issue.category === "Completion") ? "BLOCKED" : "READY",
      reference: resources.length && audit.dimensions.referenceValue === "STRONG" ? "READY" : "REVIEW",
      accessibility: hasInteraction || hasVisual ? "REVIEW" : "READY",
      responsive: hasVisual ? "REVIEW" : "READY",
      automatedTest: course.id === "course-cip004-annual-refresher" || course.id === "course-cip007-system-security" ? "READY" : "REVIEW"
    } satisfies Record<string, QualityStatus>;
    const overall: QualityStatus = validation.some((item) => item.severity === "BLOCKED") || health.state === "Blocking Issues" || Object.values(statuses).includes("BLOCKED") ? "BLOCKED" : health.state === "Needs Attention" || audit.overallState !== "STRONG" || Object.values(statuses).includes("REVIEW") || validation.some((item) => item.severity === "REVIEW") ? "REVIEW" : "READY";
    const findings = [
      ...readiness.blockingIssues.map((issue) => `${issue.category}: ${issue.message}`),
      ...readiness.warnings.map((issue) => `${issue.category}: ${issue.message}`),
      ...health.signals,
      ...validation.slice(0, 6).map((item) => `${item.category}: ${item.message}`),
      ...audit.findings.filter((finding) => finding.severity !== "INFO").slice(0, 4).map((finding) => `${finding.category}: ${finding.message}`),
      ...formulaicPrompts.map((question) => `Formulaic prompt: ${question.prompt.slice(0, 90)}`)
    ];
    return { course, statuses, overall, findings };
  });
  return (
    <>
      <PageHeader title="Course Quality" subtitle="Release readiness for published learner-facing courses using existing readiness, health, depth, assessment, completion, reference, accessibility, responsive, and automated-test signals." />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                {["Course", "Content", "Interactions", "Scenario", "Assessment", "Completion", "Reference", "A11y", "Responsive", "Tests", "Overall"].map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.course.id} className="border-b border-border align-top">
                  <td className="px-3 py-3">
                    <Link className="font-medium text-cyan-700" to={`/build/courses/${row.course.id}`}>{row.course.shortTitle ?? row.course.title}</Link>
                    {row.findings.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">Findings ({row.findings.length})</summary><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{row.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul></details> : null}
                  </td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.content} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.interactions} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.scenario} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.assessment} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.completion} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.reference} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.accessibility} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.responsive} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.statuses.automatedTest} /></td>
                  <td className="px-3 py-3"><QualityBadge status={row.overall} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function QualityBadge({ status }: { status: QualityStatus }) {
  const className = status === "READY"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
    : status === "BLOCKED"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function normalizeQualityText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
  return <div className="relative"><button className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-cyan-700 p-2 text-white" aria-label="Quick create" onClick={() => setOpen(!open)}><Plus size={18}/></button>{open ? <div className="absolute right-0 top-11 z-50 w-52 rounded-md border border-border bg-white p-2 shadow-soft dark:bg-slate-950">{actions.map((item) => <button key={item.label} className="block min-h-11 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); navigate(item.href); }}>{item.label}</button>)}</div> : null}</div>;
}

function DemoSwitcher({ onClose, onSwitch, onLogout }: { onClose: () => void; onSwitch: (userId: string) => void; onLogout: () => void }) {
  const { data, user } = useApp();
  const accounts = data.users.filter((account) => account.status === "ACTIVE");
  return <Modal title="My Profile" onClose={onClose}><div className="mb-4"><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{getRoles(data, user.id).join(", ")}</p></div><h3 className="font-semibold">Experience GridGuard as:</h3><div className="mt-3 grid gap-3">{accounts.map((account) => <div key={account.id} data-testid={`switch-${account.email}`} className="flex items-center justify-between rounded-md border border-border p-3"><div><p className="font-medium">{account.name}</p><p className="text-sm text-muted-foreground">{getRoles(data, account.id).join(", ")} • {account.email}</p></div><button className="rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => onSwitch(account.id)}>Switch</button></div>)}</div><button className="mt-4 flex items-center gap-2 text-sm text-red-700" onClick={onLogout}><LogOut size={16}/>Sign Out</button></Modal>;
}

function LearnerOnboarding({ onClose }: { onClose: () => void }) {
  const { data, user } = useApp();
  const [step, setStep] = useState(0);
  const journey = LearnerJourneyService.getLearnerJourney(data, user.id);
  const screens = [
    ["Welcome to GridGuard", "Learn, practice, apply, and prove cybersecurity capability through structured training and realistic scenarios."],
    ["Learn", "Complete assigned NERC CIP training and follow learning paths that match your responsibilities."],
    ["Practice & Apply", "Strengthen skills through short challenges and Scenario Lab missions without restarting a full course."],
    ["Your First Priority", journey.primaryAction ? `${journey.primaryAction.title}: ${journey.primaryAction.reasonText}` : "You're caught up. Start a short learning session when you are ready."]
  ];
  const [title, body] = screens[step];
  return <section className="pointer-events-none fixed bottom-4 left-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-md border border-border bg-white p-4 shadow-xl dark:bg-slate-950" aria-label="Onboarding guide"><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Welcome</p><h2 className="mt-1 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p><div className="mt-4 flex justify-between gap-2"><button className="pointer-events-auto rounded-md border border-border px-3 py-2 text-sm" onClick={onClose}>Skip</button><button className="pointer-events-auto rounded-md bg-cyan-700 px-3 py-2 text-sm text-white" onClick={() => step < screens.length - 1 ? setStep(step + 1) : onClose()}>{step < screens.length - 1 ? "Next" : "Start"}</button></div></section>;
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const { data, user } = useApp();
  const [query, setQuery] = useState("");
  const results = LearningSearchService.search(data, user.id, query);
  const groups = Array.from(new Set(results.map((result) => result.resultType)));
  return <Modal title="Search" onClose={onClose}><input autoFocus className="h-11 w-full rounded-md border border-border bg-transparent px-3" placeholder="Search courses, lessons, practice, scenarios, resources, skills..." value={query} onChange={(event) => setQuery(event.target.value)} /><div className="mt-3 max-h-96 overflow-auto">{groups.map((group) => <section key={group} className="mb-3"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>{results.filter((result) => result.resultType === group).slice(0, 6).map((result) => <Link key={result.id} className="block rounded-md border-b border-border p-3 hover:bg-muted" to={result.href} onClick={onClose}><p className="font-medium">{result.title}</p><p className="text-sm text-muted-foreground">{result.description}</p>{result.metadata?.length ? <p className="mt-1 text-xs text-muted-foreground">{result.metadata.join(" · ")}</p> : null}</Link>)}</section>)}</div></Modal>;
}

function NotesDrawer({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState(localStorage.getItem("gridguard.notes") ?? "");
  return <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-white p-4 shadow-xl dark:bg-slate-950"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">My Notes</h2><button className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border" aria-label="Close notes" onClick={onClose}><X /></button></div><textarea className="mt-4 h-80 w-full rounded-md border border-border bg-transparent p-3" value={value} onChange={(event) => { setValue(event.target.value); localStorage.setItem("gridguard.notes", event.target.value); }} /><p className="mt-2 text-sm text-muted-foreground">Saved automatically.</p></div>;
}

function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  return online ? null : <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Offline. Most GridGuard functions remain available.</div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-md border border-border bg-white p-5 shadow-xl dark:bg-slate-950"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border" aria-label="Close" onClick={onClose}><X /></button></div>{children}</section></div>;
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
