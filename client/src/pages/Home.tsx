import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Edit3,
  GraduationCap,
  Heart,
  Lightbulb,
  ListTodo,
  LogIn,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Sparkles,
  StickyNote,
  Sun,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Page = "today" | "week" | "school" | "notes" | "stats" | "settings";
type Language = "ar" | "tr" | "en";
type Task = { id: string; time: string; title: string; icon: string; done: boolean };
type SchoolTask = { id: string; subject: string; task: string; recitation: string; homework: string; details: string; due: string; done: boolean };
type Note = { id: string; type: "goal" | "idea" | "reminder" | "good"; text: string };
type CustomNotification = { id: string; title: string; message: string; time: string; enabled: boolean; lastTriggered?: string };
type WeekDay = { id: string; label: string; short: string; progress: number; status: "pending" | "complete" | "missed" };
type PlannerState = {
  tasks: Task[];
  prayers: Record<string, boolean>;
  school: SchoolTask[];
  notes: Note[];
  notifications: CustomNotification[];
  week: WeekDay[];
  settings: { language: Language; theme: "dark" | "light"; wake: string; sleep: string; school: string };
};

const DEFAULT_TASKS: Task[] = [
  ["08:00", "🌅", "الاستيقاظ"], ["08:15", "🧼", "النظافة الشخصية"], ["08:30", "🍳", "الفطور"],
  ["09:00", "🧹", "تنظيف وترتيب"], ["10:00", "☕", "راحة"], ["10:30", "🎒", "تجهيز المدرسة"],
  ["12:00–16:00", "🏫", "المدرسة"], ["16:30", "🍽️", "الغداء"], ["17:00", "☕", "راحة"],
  ["18:00", "📝", "الواجبات والمذاكرة"], ["19:00", "🗣️", "التسميع / مراجعة المادة"], ["19:30", "🇫🇷", "الفرنسي"],
  ["20:00", "💻", "اللابتوب / RONI TECH X"], ["21:00", "📱", "الهاتف / الترفيه"], ["21:30", "🍽️", "العشاء"],
  ["22:30", "🎒", "تجهيز أغراض الغد"], ["23:00–00:00", "😴", "النوم"],
].map(([time, icon, title], index) => ({ id: `routine-${index + 1}`, time, icon, title, done: false }));

const createInitialState = (): PlannerState => ({
  tasks: DEFAULT_TASKS,
  prayers: { "الفجر": false, "الظهر": false, "العصر": false, "المغرب": false, "العشاء": false },
  school: [],
  notes: [
    { id: "note-goal", type: "goal", text: "أنهي أهم مهمة قبل وقت الراحة." },
    { id: "note-idea", type: "idea", text: "فكرة صغيرة يمكن تطويرها اليوم..." },
    { id: "note-reminder", type: "reminder", text: "تجهيز حقيبة الغد قبل النوم." },
    { id: "note-good", type: "good", text: "ما الشيء الجميل الذي حدث اليوم؟" },
  ],
  notifications: [],
  week: [
    { id: "sat", label: "السبت", short: "س", progress: 58, status: "complete" },
    { id: "sun", label: "الأحد", short: "ح", progress: 72, status: "complete" },
    { id: "mon", label: "الاثنين", short: "ن", progress: 46, status: "missed" },
    { id: "tue", label: "الثلاثاء", short: "ث", progress: 83, status: "complete" },
    { id: "wed", label: "الأربعاء", short: "ر", progress: 65, status: "pending" },
    { id: "thu", label: "الخميس", short: "خ", progress: 0, status: "pending" },
    { id: "fri", label: "الجمعة", short: "ج", progress: 0, status: "pending" },
  ],
  settings: { language: "ar", theme: "dark", wake: "08:00", sleep: "23:00", school: "12:00–16:00" },
});

const copy = {
  ar: { today: "اليوم", week: "الأسبوع", school: "المدرسة", notes: "الملاحظات", stats: "الإحصائيات", settings: "الإعدادات", greeting: "صباح الخير", add: "إضافة مهمة", remaining: "متبقية", complete: "مكتملة", insight: "تحليل نهاية اليوم", cloud: "الحفظ السحابي", signIn: "تسجيل الدخول", addSchool: "إضافة مادة", save: "حفظ" },
  tr: { today: "Bugün", week: "Hafta", school: "Okul", notes: "Notlar", stats: "İstatistikler", settings: "Ayarlar", greeting: "Günaydın", add: "Görev ekle", remaining: "kalan", complete: "tamam", insight: "Gün sonu analizi", cloud: "Bulut kaydı", signIn: "Giriş yap", addSchool: "Ders ekle", save: "Kaydet" },
  en: { today: "Today", week: "Week", school: "School", notes: "Notes", stats: "Statistics", settings: "Settings", greeting: "Good morning", add: "Add task", remaining: "remaining", complete: "complete", insight: "End-of-day review", cloud: "Cloud save", signIn: "Sign in", addSchool: "Add subject", save: "Save" },
};

const navItems = [
  { id: "today" as Page, icon: ListTodo, key: "today" }, { id: "week" as Page, icon: CalendarDays, key: "week" },
  { id: "school" as Page, icon: GraduationCap, key: "school" }, { id: "notes" as Page, icon: StickyNote, key: "notes" },
  { id: "stats" as Page, icon: BarChart3, key: "stats" }, { id: "settings" as Page, icon: Settings2, key: "settings" },
];

function ProgressRing({ value, size = 118 }: { value: number; size?: number }) {
  const radius = 42; const circumference = 2 * Math.PI * radius;
  return <div className="progress-ring" style={{ width: size, height: size }}><svg viewBox="0 0 100 100" aria-label={`${value}%`}>
    <circle className="ring-track" cx="50" cy="50" r={radius} /><circle className="ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - (value / 100) * circumference} />
  </svg><div className="ring-label"><strong>{value}%</strong><span>إنجاز</span></div></div>;
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof ListTodo; title: string; action?: React.ReactNode }) {
  return <div className="section-title"><div className="section-heading"><span className="icon-surface"><Icon size={18} /></span><div><h2>{title}</h2></div></div>{action}</div>;
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [page, setPage] = useState<Page>("today");
  const [state, setState] = useState<PlannerState>(() => {
    try {
      const saved = localStorage.getItem("roni-planner-state");
      if (!saved) return createInitialState();
      const parsed = JSON.parse(saved) as Partial<PlannerState>;
      return { ...createInitialState(), ...parsed, notifications: parsed.notifications ?? [] };
    } catch { return createInitialState(); }
  });
  const [remoteReady, setRemoteReady] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ time: "", title: "", icon: "✨" });
  const [addingSchool, setAddingSchool] = useState(false);
  const [newSchool, setNewSchool] = useState({ subject: "", task: "", recitation: "", homework: "", details: "", due: "" });
  const [newNotification, setNewNotification] = useState({ title: "", message: "", time: "" });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(typeof Notification === "undefined" ? "denied" : Notification.permission);
  const [activeAlert, setActiveAlert] = useState<CustomNotification | null>(null);
  const utils = trpc.useUtils();
  const remote = trpc.planner.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveRemote = trpc.planner.save.useMutation({ onSuccess: () => utils.planner.get.invalidate() });
  const t = copy[state.settings.language];
  const today = new Intl.DateTimeFormat(state.settings.language === "ar" ? "ar-EG" : state.settings.language === "tr" ? "tr-TR" : "en-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const taskDone = state.tasks.filter(task => task.done).length;
  const prayerDone = Object.values(state.prayers).filter(Boolean).length;
  const schoolDone = state.school.filter(item => item.done).length;
  const totalTracked = state.tasks.length + Object.keys(state.prayers).length;
  const completion = totalTracked ? Math.round(((taskDone + prayerDone) / totalTracked) * 100) : 0;
  const weeklyProgress = Math.round((state.week.reduce((sum, day) => sum + day.progress, 0) + completion) / 8);
  const bestDay = useMemo(() => [...state.week, { id: "today", label: "اليوم", short: "ي", progress: completion, status: "pending" as const }].sort((a, b) => b.progress - a.progress)[0], [state.week, completion]);

  useEffect(() => { document.documentElement.dir = state.settings.language === "ar" ? "rtl" : "ltr"; document.documentElement.lang = state.settings.language === "ar" ? "ar" : state.settings.language; }, [state.settings.language]);
  useEffect(() => { localStorage.setItem("roni-planner-state", JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!isAuthenticated) { setRemoteReady(true); return; }
    if (!remote.isFetched) return;
    if (remote.data?.data) { try { const parsed = JSON.parse(remote.data.data) as Partial<PlannerState>; setState(previous => ({ ...previous, ...parsed, notifications: parsed.notifications ?? previous.notifications ?? [] })); } catch { /* retain local data if a stale document is malformed */ } }
    setRemoteReady(true);
  }, [isAuthenticated, remote.isFetched, remote.data?.data]);
  useEffect(() => {
    if (!isAuthenticated || !remoteReady) return;
    const timer = window.setTimeout(() => saveRemote.mutate({ data: JSON.stringify(state) }), 900);
    return () => window.clearTimeout(timer);
  }, [state, isAuthenticated, remoteReady]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const currentTime = now.toTimeString().slice(0, 5);
      const due = state.notifications.find(item => item.enabled && item.time === currentTime && item.lastTriggered !== todayKey);
      if (!due) return;
      update(previous => ({ ...previous, notifications: previous.notifications.map(item => item.id === due.id ? { ...item, lastTriggered: todayKey } : item) }));
      setActiveAlert(due);
      if (notificationPermission === "granted") new Notification(due.title, { body: due.message || "لديك تذكير من RONI Planner" });
      window.setTimeout(() => setActiveAlert(null), 7000);
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(timer);
  }, [state.notifications, notificationPermission]);

  const update = (fn: (previous: PlannerState) => PlannerState) => setState(fn);
  const changePage = (nextPage: Page) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleTask = (id: string) => update(previous => ({ ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task) }));
  const deleteTask = (id: string) => update(previous => ({ ...previous, tasks: previous.tasks.filter(task => task.id !== id) }));
  const editTask = (task: Task) => { const title = window.prompt("اسم المهمة", task.title); const time = window.prompt("الوقت", task.time); if (title?.trim() && time?.trim()) update(previous => ({ ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, title: title.trim(), time: time.trim() } : item) })); };
  const addTask = () => { if (!newTask.title.trim() || !newTask.time.trim()) return; update(previous => ({ ...previous, tasks: [...previous.tasks, { id: `custom-${Date.now()}`, title: newTask.title.trim(), time: newTask.time.trim(), icon: newTask.icon || "✨", done: false }].sort((a, b) => a.time.localeCompare(b.time)) })); setNewTask({ time: "", title: "", icon: "✨" }); setAddingTask(false); };
  const addSchool = () => { if (!newSchool.subject.trim() || !newSchool.task.trim()) return; update(previous => ({ ...previous, school: [...previous.school, { ...newSchool, id: `school-${Date.now()}`, done: false }] })); setNewSchool({ subject: "", task: "", recitation: "", homework: "", details: "", due: "" }); setAddingSchool(false); };
  const addNotification = () => { if (!newNotification.title.trim() || !newNotification.time) return; update(previous => ({ ...previous, notifications: [...previous.notifications, { ...newNotification, id: `notification-${Date.now()}`, enabled: true }] })); setNewNotification({ title: "", message: "", time: "" }); };
  const requestNotificationPermission = async () => { if (typeof Notification === "undefined") return; const permission = await Notification.requestPermission(); setNotificationPermission(permission); };
  const resetToday = () => { if (window.confirm("هل تريد إعادة ضبط بيانات اليوم؟")) update(previous => ({ ...previous, tasks: previous.tasks.map(task => ({ ...task, done: false })), prayers: Object.fromEntries(Object.keys(previous.prayers).map(key => [key, false])), school: previous.school.map(item => ({ ...item, done: false })) })); };
  const resetWeek = () => { if (window.confirm("هل تريد إعادة ضبط الأسبوع؟")) update(previous => ({ ...previous, week: previous.week.map(day => ({ ...day, progress: 0, status: "pending" })) })); };

  const TodayPage = () => <>
    <section className="hero-card"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-copy"><div className="eyebrow"><Sun size={15} /> {today}</div><h1>{t.greeting} <span>👋</span></h1><p>خطّط ليومك بهدوء، وأنجز ما يهمك خطوة بخطوة.</p><div className="hero-metrics"><div><strong>{taskDone}</strong><span>{t.complete}</span></div><i/><div><strong>{state.tasks.length - taskDone}</strong><span>{t.remaining}</span></div></div></div><ProgressRing value={completion} /></section>
    <div className="dashboard-grid"><div className="main-column"><section className="panel task-panel"><SectionTitle icon={ListTodo} title="جدول اليوم" action={<Button onClick={() => setAddingTask(!addingTask)} className="accent-button"><Plus size={16} /> {t.add}</Button>} />
      {addingTask && <div className="quick-add"><input value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })} placeholder="08:00" /><input value={newTask.icon} onChange={e => setNewTask({ ...newTask, icon: e.target.value })} aria-label="رمز" /><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="مهمة جديدة" /><Button onClick={addTask}><Check size={16} /></Button></div>}
      <div className="task-list">{state.tasks.map(task => <div className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}><label className="checkbox-wrap"><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`إكمال ${task.title}`} /><span className="checkmark"><Check size={13} /></span></label><time>{task.time}</time><span className="task-emoji">{task.icon}</span><span className="task-name">{task.title}</span><div className="task-actions"><button onClick={() => editTask(task)} aria-label="تعديل المهمة"><Edit3 size={15}/></button><button onClick={() => deleteTask(task.id)} aria-label="حذف المهمة"><Trash2 size={15}/></button></div></div>)}</div>
    </section></div><aside className="side-column">{PrayerPanel()}</aside></div>
    <div className="lower-grid">{SchoolPreview()}{InsightPanel()}</div>
  </>;

  const PrayerPanel = () => <section className="panel prayer-panel"><SectionTitle icon={Moon} title="الصلوات" /><p className="section-subtitle">خمس محطات للهدوء خلال اليوم</p><div className="prayer-list">{Object.entries(state.prayers).map(([prayer, done]) => <label className={`prayer-row ${done ? "is-done" : ""}`} key={prayer}><input type="checkbox" checked={done} onChange={() => update(previous => ({ ...previous, prayers: { ...previous.prayers, [prayer]: !previous.prayers[prayer] } }))} /><span className="prayer-box"><Check size={13} /></span><span>{prayer}</span>{done && <Check className="prayer-check" size={15}/>}</label>)}</div><div className="prayer-footer"><span>المكتمل</span><strong>{prayerDone} / 5</strong></div></section>;

  const SchoolPreview = () => <section className="panel compact-panel"><SectionTitle icon={BookOpen} title="مهام المدرسة" action={<button type="button" className="ghost-action" onClick={() => changePage("school")}>عرض الكل <ChevronLeft size={15}/></button>} /><div className="mini-school"><div className="mini-count"><GraduationCap size={20}/><strong>{state.school.length}</strong><span>مواد / مهام</span></div><div><strong>{schoolDone} مكتملة</strong><p>أضف المواد، التسميع، والواجبات من صفحة المدرسة.</p></div></div></section>;

  const InsightPanel = () => { const unfinished = state.tasks.filter(task => !task.done).slice(0, 2); return <section className="panel compact-panel insight-panel"><SectionTitle icon={BrainCircuit} title={`🤖 ${t.insight}`} /><div className="insight-copy"><span className="insight-icon"><Sparkles size={17}/></span><p>{completion >= 75 ? "يوم رائع! حافظت على إيقاع ثابت. انقل فقط ما تبقى لوقت محدد غدًا." : completion >= 40 ? `أنجزت ${taskDone} مهام حتى الآن. ركّز على مهمة واحدة قصيرة قبل الراحة التالية.` : "ابدأ بمهمة بسيطة الآن. التقدم الصغير أفضل من انتظار الوقت المثالي."}</p></div>{unfinished.length > 0 && <div className="carry-over"><span>للغد:</span>{unfinished.map(task => <em key={task.id}>{task.title}</em>)}</div>}</section>; };

  const WeekPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><CalendarDays size={15}/> نظرة شاملة</div><h1>📅 الأسبوع</h1><p>راقب الإيقاع، ولاحظ اليوم الذي تحتاج فيه إلى دفعة بسيطة.</p></div><div className="stat-chip"><TrendingUp size={17}/>{weeklyProgress}% هذا الأسبوع</div></section><section className="panel week-panel"><div className="week-bars">{state.week.map(day => <div className="day-column" key={day.id}><div className="bar-area"><div className={`week-bar ${day.status}`} style={{ height: `${Math.max(day.progress, 7)}%` }}><span>{day.progress}%</span></div></div><strong>{day.short}</strong><small>{day.label}</small><button className={`status-dot ${day.status}`} onClick={() => update(previous => ({ ...previous, week: previous.week.map(item => item.id === day.id ? { ...item, status: item.status === "complete" ? "missed" : item.status === "missed" ? "pending" : "complete" } : item) }))} aria-label={`تحديث حالة ${day.label}`}/></div>)}<div className="day-column today-column"><div className="bar-area"><div className="week-bar active" style={{ height: `${Math.max(completion, 7)}%` }}><span>{completion}%</span></div></div><strong>ي</strong><small>اليوم</small><span className="status-dot pending"/></div></div><div className="week-legend"><span><i className="legend-dot pending"/> لم يبدأ</span><span><i className="legend-dot complete"/> مكتمل</span><span><i className="legend-dot missed"/> لم يكتمل</span></div></section><section className="panel weekly-insight"><div className="insight-icon"><TrendingUp size={18}/></div><div><strong>أداء الأسبوع</strong><p>أفضل يوم هو <b>{bestDay.label}</b> بنسبة {bestDay.progress}%. احتفظ بنفس نمط البداية لهذا الأسبوع.</p></div></section></div>;

  const SchoolPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><GraduationCap size={15}/> مساحة الدراسة</div><h1>📚 مهام المدرسة</h1><p>المواد، الواجبات، التسميع، ومواعيد التسليم في مكان واحد.</p></div><Button className="accent-button" onClick={() => setAddingSchool(!addingSchool)}><Plus size={16}/>{t.addSchool}</Button></section>{addingSchool && <section className="panel school-form"><div className="form-grid"><input placeholder="اسم المادة *" value={newSchool.subject} onChange={e => setNewSchool({...newSchool, subject: e.target.value})}/><input placeholder="المهمة *" value={newSchool.task} onChange={e => setNewSchool({...newSchool, task: e.target.value})}/><input placeholder="التسميع" value={newSchool.recitation} onChange={e => setNewSchool({...newSchool, recitation: e.target.value})}/><input placeholder="واجب منزلي" value={newSchool.homework} onChange={e => setNewSchool({...newSchool, homework: e.target.value})}/><input type="date" value={newSchool.due} onChange={e => setNewSchool({...newSchool, due: e.target.value})}/><input className="wide" placeholder="تفاصيل إضافية" value={newSchool.details} onChange={e => setNewSchool({...newSchool, details: e.target.value})}/></div><div className="form-actions"><Button variant="outline" onClick={() => setAddingSchool(false)}>إلغاء</Button><Button onClick={addSchool}>{t.save}</Button></div></section>}<section className="school-grid">{state.school.length === 0 ? <div className="empty-state"><div className="empty-icon">📚</div><h3>مساحة دراستك جاهزة</h3><p>أضف أول مادة أو واجب حتى يظهر هنا.</p><Button onClick={() => setAddingSchool(true)}><Plus size={16}/> إضافة مادة</Button></div> : state.school.map(item => <article className={`school-card ${item.done ? "is-done" : ""}`} key={item.id}><div className="school-card-top"><span className="subject-pill">{item.subject}</span><label className="checkbox-wrap"><input type="checkbox" checked={item.done} onChange={() => update(previous => ({ ...previous, school: previous.school.map(row => row.id === item.id ? {...row, done: !row.done} : row) }))}/><span className="checkmark"><Check size={13}/></span></label></div><h3>{item.task}</h3><div className="school-details">{item.recitation && <span>🗣️ {item.recitation}</span>}{item.homework && <span>📝 {item.homework}</span>}{item.details && <span>✦ {item.details}</span>}</div>{item.due && <footer><Clock3 size={14}/> التسليم: {item.due}</footer>}<button className="delete-card" onClick={() => update(previous => ({...previous, school: previous.school.filter(row => row.id !== item.id)}))}><Trash2 size={15}/></button></article>)}</section></div>;

  const NotesPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><StickyNote size={15}/> أفكارك في مكانها</div><h1>📝 الملاحظات الملونة</h1><p>مساحة خفيفة للأهداف والأفكار والتذكيرات واللحظات الجميلة.</p></div><Button className="accent-button" onClick={() => update(previous => ({ ...previous, notes: [...previous.notes, {id: `note-${Date.now()}`, type: "idea", text: "ملاحظة جديدة..."}] }))}><Plus size={16}/> ملاحظة جديدة</Button></section><section className="note-grid">{state.notes.map(note => { const meta = { goal: ["🎯", "أهداف اليوم"], idea: ["💡", "أفكار"], reminder: ["📌", "تذكيرات"], good: ["❤️", "شيء جميل اليوم"] }[note.type]; return <article className={`sticky sticky-${note.type}`} key={note.id}><div className="sticky-header"><span>{meta[0]} {meta[1]}</span><button onClick={() => update(previous => ({...previous, notes: previous.notes.filter(item => item.id !== note.id)}))}><Trash2 size={14}/></button></div><textarea value={note.text} onChange={e => update(previous => ({...previous, notes: previous.notes.map(item => item.id === note.id ? {...item, text: e.target.value} : item)}))} aria-label={meta[1]} /><div className="sticky-footer"><span>يُحفظ تلقائيًا</span><MoreHorizontal size={16}/></div></article>})}</section></div>;

  const StatsPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><BarChart3 size={15}/> التفاصيل المهمة</div><h1>📊 الإحصائيات</h1><p>أرقام واضحة لتعرف أين وصل يومك وأسبوعك.</p></div></section><section className="stats-grid"><article className="metric-card featured"><div><span>نسبة إنجاز اليوم</span><strong>{completion}%</strong><p>المهام والصلوات معًا</p></div><ProgressRing value={completion} size={104}/></article><article className="metric-card"><span className="metric-icon blue"><Check size={19}/></span><strong>{taskDone}</strong><p>المهام المكتملة</p></article><article className="metric-card"><span className="metric-icon violet"><Clock3 size={19}/></span><strong>{state.tasks.length - taskDone}</strong><p>مهام متبقية</p></article><article className="metric-card"><span className="metric-icon gold"><Moon size={19}/></span><strong>{prayerDone} / 5</strong><p>صلوات مكتملة</p></article><article className="metric-card"><span className="metric-icon rose"><BookOpen size={19}/></span><strong>{schoolDone}</strong><p>واجبات مكتملة</p></article></section><section className="analytics-row"><article className="panel chart-panel"><SectionTitle icon={TrendingUp} title="إنجاز الأسبوع"/><div className="chart-bars">{[...state.week.slice(0, 6), {id: "today", short: "ي", label: "اليوم", progress: completion, status: "pending" as const}].map(day => <div key={day.id}><i style={{height: `${Math.max(day.progress, 5)}%`}}/><span>{day.short}</span></div>)}</div></article><article className="panel best-day"><span className="sparkle-wrap"><Sparkles size={20}/></span><div><p>أفضل يوم خلال الأسبوع</p><strong>{bestDay.label}</strong><span>{bestDay.progress}% إنجاز</span></div></article></section></div>;

  const SettingsPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><Settings2 size={15}/> خصّص تجربتك</div><h1>⚙️ الإعدادات</h1><p>تعديلات بسيطة حتى يعمل المخطط على طريقتك.</p></div></section><section className="settings-grid"><article className="panel settings-card"><h3>اللغة</h3><div className="segmented">{(["ar", "tr", "en"] as Language[]).map(language => <button key={language} className={state.settings.language === language ? "active" : ""} onClick={() => update(previous => ({...previous, settings: {...previous.settings, language}}))}>{language === "ar" ? "العربية" : language === "tr" ? "Türkçe" : "English"}</button>)}</div></article><article className="panel settings-card"><h3>المظهر</h3><div className="theme-options"><button className={state.settings.theme === "dark" ? "active" : ""} onClick={() => update(previous => ({...previous, settings: {...previous.settings, theme: "dark"}}))}><Moon size={17}/> داكن</button><button className={state.settings.theme === "light" ? "active" : ""} onClick={() => update(previous => ({...previous, settings: {...previous.settings, theme: "light"}}))}><Sun size={17}/> فاتح</button></div></article><article className="panel settings-card schedule-card"><h3>أوقات اليوم</h3><label>وقت الاستيقاظ <input type="time" value={state.settings.wake} onChange={e => update(previous => ({...previous, settings: {...previous.settings, wake: e.target.value}}))}/></label><label>وقت النوم <input type="time" value={state.settings.sleep} onChange={e => update(previous => ({...previous, settings: {...previous.settings, sleep: e.target.value}}))}/></label><label>وقت المدرسة <input value={state.settings.school} onChange={e => update(previous => ({...previous, settings: {...previous.settings, school: e.target.value}}))}/></label></article><article className="panel settings-card cloud-card"><div><span className="metric-icon blue"><CloudIcon /></span><h3>{t.cloud}</h3><p>{isAuthenticated ? (saveRemote.isPending ? "جارٍ حفظ آخر التعديلات…" : "تتم مزامنة خطتك تلقائيًا وبشكل خاص.") : "تُحفظ خطتك على هذا الجهاز. سجّل الدخول للمزامنة."}</p></div>{!loading && !isAuthenticated && <Button onClick={() => startLogin()}><LogIn size={16}/>{t.signIn}</Button>}</article><article className="panel settings-card notifications-card"><div className="settings-card-heading"><div><span className="metric-icon blue"><BellRing size={18}/></span><h3>التذكيرات المخصصة</h3></div><span className="permission-pill">{notificationPermission === "granted" ? "إشعارات المتصفح مفعلة" : "داخل الموقع فقط"}</span></div><p>أنشئ تنبيهًا بعنوان ووقت محدد. سيظهر داخل التطبيق، ويمكن إرساله أيضًا كإشعار للمتصفح.</p><div className="notification-form"><input placeholder="عنوان التنبيه *" value={newNotification.title} onChange={e => setNewNotification({...newNotification, title: e.target.value})}/><input placeholder="رسالة قصيرة" value={newNotification.message} onChange={e => setNewNotification({...newNotification, message: e.target.value})}/><input type="time" aria-label="وقت التنبيه" value={newNotification.time} onChange={e => setNewNotification({...newNotification, time: e.target.value})}/><Button onClick={addNotification}><Plus size={15}/> إضافة</Button></div>{notificationPermission !== "granted" && typeof Notification !== "undefined" && <button type="button" className="permission-button" onClick={requestNotificationPermission}><Bell size={15}/> تفعيل إشعارات المتصفح</button>}<div className="notification-list">{state.notifications.length === 0 ? <span className="notification-empty">لا توجد تذكيرات بعد.</span> : state.notifications.map(item => <div className={`notification-row ${item.enabled ? "" : "disabled"}`} key={item.id}><button type="button" className="notification-toggle" onClick={() => update(previous => ({...previous, notifications: previous.notifications.map(row => row.id === item.id ? {...row, enabled: !row.enabled} : row)}))} aria-label="تفعيل أو تعطيل التذكير"><span className="notification-dot"><Bell size={13}/></span></button><div><strong>{item.title}</strong><small>{item.time}{item.message ? ` · ${item.message}` : ""}</small></div><button type="button" className="notification-delete" onClick={() => update(previous => ({...previous, notifications: previous.notifications.filter(row => row.id !== item.id)}))} aria-label="حذف التذكير"><Trash2 size={14}/></button></div>)}</div></article><article className="panel settings-card danger-card"><h3>إعادة الضبط</h3><p>استخدم هذه الخيارات لبدء صفحة جديدة.</p><div><Button variant="outline" onClick={resetToday}>إعادة ضبط اليوم</Button><Button variant="outline" onClick={resetWeek}>إعادة ضبط الأسبوع</Button></div></article></section></div>;

  const renderPage = () => ({ today: TodayPage(), week: WeekPage(), school: SchoolPage(), notes: NotesPage(), stats: StatsPage(), settings: SettingsPage() })[page];

  return <div className={`planner-shell ${state.settings.theme}`} dir={state.settings.language === "ar" ? "rtl" : "ltr"}><>{activeAlert && <div className="notification-alert" role="status"><span className="notification-alert-icon"><BellRing size={18}/></span><div><strong>{activeAlert.title}</strong><p>{activeAlert.message || "حان وقت التذكير"}</p></div><button type="button" onClick={() => setActiveAlert(null)} aria-label="إغلاق التنبيه">×</button></div>}</><aside className="sidebar"><div className="brand"><span className="brand-mark">R</span><div><strong>RONI</strong><small>PLANNER</small></div></div><nav>{navItems.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={page === item.id ? "active" : ""} aria-current={page === item.id ? "page" : undefined} onClick={() => changePage(item.id)}><Icon size={18}/><span>{t[item.key as keyof typeof t]}</span></button>; })}</nav><div className="sidebar-bottom"><div className="tiny-progress"><span>تقدم اليوم</span><strong>{completion}%</strong><i><b style={{width: `${completion}%`}}/></i></div><div className="profile-line"><span>{user?.name?.slice(0,1).toUpperCase() || "R"}</span><div><strong>{user?.name || "RONI Planner"}</strong><small>{isAuthenticated ? "تمت المزامنة" : "محفوظ على الجهاز"}</small></div></div></div></aside><main className="app-main"><header className="mobile-header"><div className="brand"><span className="brand-mark">R</span><strong>RONI</strong></div><button type="button" onClick={() => changePage("settings")}><Settings2 size={19}/></button></header><div className="content-wrap">{renderPage()}</div></main><nav className="mobile-nav">{navItems.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={page === item.id ? "active" : ""} aria-current={page === item.id ? "page" : undefined} onClick={() => changePage(item.id)}><Icon size={18}/><span>{t[item.key as keyof typeof t]}</span></button>; })}</nav></div>;
}

function CloudIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9.02A5.5 5.5 0 1 1 17.5 19Z"/></svg>; }
