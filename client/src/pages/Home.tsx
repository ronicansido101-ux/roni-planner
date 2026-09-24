import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  BellRing,
  AlarmClock,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  GraduationCap,
  History,
  Heart,
  Lightbulb,
  ListTodo,
  LogIn,
  LogOut,
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
import { useEffect, useMemo, useRef, useState } from "react";

type Page = "today" | "week" | "school" | "notes" | "stats" | "settings" | "history" | "muslim";
type Language = "ar" | "tr" | "en";
type NotificationSound = "soft" | "bell" | "digital" | "silent";
type TaskColor = "blue" | "pink" | "white" | "green" | "orange";
type Task = { id: string; time: string; title: string; icon: string; done: boolean; autoComplete?: boolean; color?: TaskColor; customColor?: string; lastTriggered?: string };
type DayHistory = { id: string; date: string; tasks: Task[]; prayers: Record<string, boolean> };
type SchoolTask = { id: string; subject: string; task: string; recitation: string; homework: string; details: string; due: string; done: boolean };
type SchoolAttendance = { id: string; date: string; status: "present" | "absent"; note: string };
type Note = { id: string; type: "goal" | "idea" | "reminder" | "good"; text: string };
type CustomNotification = { id: string; title: string; message: string; time: string; enabled: boolean; lastTriggered?: string };
type WeekDay = { id: string; label: string; short: string; progress: number; status: "pending" | "complete" | "missed" };
type AppTheme = "dark" | "light" | "pink" | "purple" | "green" | "orange" | "red" | "cyan" | "gold";
const APP_THEMES: AppTheme[] = ["dark", "light", "pink", "purple", "green", "orange", "red", "cyan", "gold"];
const isAppTheme = (value: unknown): value is AppTheme => typeof value === "string" && APP_THEMES.includes(value as AppTheme);
type PlannerState = {
  activeDate: string;
  history: DayHistory[];
  tasks: Task[];
  prayers: Record<string, boolean>;
  school: SchoolTask[];
  attendance: SchoolAttendance[];
  notes: Note[];
  notifications: CustomNotification[];
  week: WeekDay[];
  adhkarCounts: Record<string, number>;
  worshipHistory: WorshipHistoryEntry[];
  settings: { language: Language; theme: AppTheme; prayerCity: string; prayerMethod: PrayerMethod; prayerAlerts: boolean; wake: string; sleep: string; school: string; taskReminders: boolean; notificationSound: NotificationSound; glassEffects: boolean; animatedBackground: boolean };
};

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type PrayerName = "الفجر" | "الظهر" | "العصر" | "المغرب" | "العشاء";
type PrayerTimes = Record<PrayerName, string>;
type PrayerMethod = 2 | 3 | 4 | 5;
type AdhkarCategory = "morning" | "evening" | "sleep" | "travel" | "quran";
type WorshipHistoryEntry = { date: string; prayers: Record<string, boolean>; adhkarCounts: Record<string, number> };
type OnboardingProfile = { wake: string; breakfast: string; lunch: string; dinner: string; sleep: string; activity: "school" | "university" | "work"; activityName: string; activityStart: string; activityEnd: string };
type PrayerCity = { id: string; label: string; city: string; country: string; latitude: number; longitude: number };
const PRAYER_CITIES: PrayerCity[] = [
  { id: "damascus", label: "دمشق", city: "Damascus", country: "Syria", latitude: 33.5138, longitude: 36.2765 },
  { id: "aleppo", label: "حلب", city: "Aleppo", country: "Syria", latitude: 36.2021, longitude: 37.1343 },
  { id: "homs", label: "حمص", city: "Homs", country: "Syria", latitude: 34.7324, longitude: 36.7137 },
  { id: "latakia", label: "اللاذقية", city: "Latakia", country: "Syria", latitude: 35.5317, longitude: 35.7918 },
];

const DEFAULT_PRAYER_TIMES: PrayerTimes = { "الفجر": "04:30", "الظهر": "12:15", "العصر": "15:45", "المغرب": "18:20", "العشاء": "19:45" };
const getLocalDateKey = () => { const date = new Date(); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };
const addMinutesToTime = (value: string, amount: number) => { const [hours, minutes] = value.split(":").map(Number); const total = (hours * 60 + minutes + amount + 1440) % 1440; return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; };

const DEFAULT_TASKS: Task[] = [
  ["08:00", "🌅", "الاستيقاظ"], ["08:15", "🧼", "النظافة الشخصية"], ["08:30", "🍳", "الفطور"],
  ["09:00", "🧹", "تنظيف وترتيب"], ["10:00", "☕", "راحة"], ["10:30", "🎒", "تجهيز المدرسة"],
  ["12:00–16:00", "🏫", "المدرسة"], ["16:30", "🍽️", "الغداء"], ["17:00", "☕", "راحة"],
  ["18:00", "📝", "الواجبات والمذاكرة"], ["19:00", "🗣️", "التسميع / مراجعة المادة"], ["19:30", "🇫🇷", "الفرنسي"],
  ["20:00", "💻", "اللابتوب / RONI TECH X"], ["21:00", "📱", "الهاتف / الترفيه"], ["21:30", "🍽️", "العشاء"],
  ["22:30", "🎒", "تجهيز أغراض الغد"], ["23:00–00:00", "😴", "النوم"],
].map(([time, icon, title], index) => ({ id: `routine-${index + 1}`, time, icon, title, done: false }));
function buildPersonalizedTasks(profile: OnboardingProfile): Task[] {
  const activityLabel = profile.activity === "school" ? "المدرسة" : profile.activity === "university" ? "الجامعة" : "العمل";
  const activityIcon = profile.activity === "school" ? "🎒" : profile.activity === "university" ? "🎓" : "💼";
  const tasks: Array<[string, string, string]> = [
    [profile.wake, "🌅", "الاستيقاظ"],
    [addMinutesToTime(profile.wake, 15), "🧼", "النظافة الشخصية"],
    [profile.breakfast, "🍳", "الفطور"],
    [addMinutesToTime(profile.breakfast, 35), "📝", "التخطيط لليوم"],
    [profile.activityStart, activityIcon, `${activityLabel}: ${profile.activityName}`],
    [profile.lunch, "🍽️", "الغداء"],
    [profile.activityEnd, "☕", "راحة بعد اليوم"],
    [addMinutesToTime(profile.activityEnd, 45), profile.activity === "work" ? "📚" : "📖", profile.activity === "work" ? "تطوير المهارات" : "مراجعة الدروس"],
    [profile.dinner, "🍽️", "العشاء"],
    [addMinutesToTime(profile.dinner, 45), "📱", "وقت شخصي"],
    [addMinutesToTime(profile.sleep, -30), "🎒", "الاستعداد للنوم"],
    [profile.sleep, "😴", "النوم"],
  ];
  return tasks.map(([time, icon, title], index) => ({ id: `personal-${Date.now()}-${index}`, time, icon, title, done: false, color: index % 3 === 0 ? "blue" : index % 3 === 1 ? "pink" : "green" as TaskColor })).sort((a, b) => a.time.localeCompare(b.time));
}

const createInitialState = (): PlannerState => ({
  activeDate: getLocalDateKey(),
  history: [],
  tasks: DEFAULT_TASKS,
  prayers: { "الفجر": false, "الظهر": false, "العصر": false, "المغرب": false, "العشاء": false },
  school: [],
  attendance: [],
  notes: [
    { id: "note-goal", type: "goal", text: "أنهي أهم مهمة قبل وقت الراحة." },
    { id: "note-idea", type: "idea", text: "فكرة صغيرة يمكن تطويرها اليوم..." },
    { id: "note-reminder", type: "reminder", text: "تجهيز حقيبة الغد قبل النوم." },
    { id: "note-good", type: "good", text: "ما الشيء الجميل الذي حدث اليوم؟" },
  ],
  notifications: [],
  adhkarCounts: {},
  worshipHistory: [],
  week: [
    { id: "sat", label: "السبت", short: "س", progress: 58, status: "complete" },
    { id: "sun", label: "الأحد", short: "ح", progress: 72, status: "complete" },
    { id: "mon", label: "الاثنين", short: "ن", progress: 46, status: "missed" },
    { id: "tue", label: "الثلاثاء", short: "ث", progress: 83, status: "complete" },
    { id: "wed", label: "الأربعاء", short: "ر", progress: 65, status: "pending" },
    { id: "thu", label: "الخميس", short: "خ", progress: 0, status: "pending" },
    { id: "fri", label: "الجمعة", short: "ج", progress: 0, status: "pending" },
  ],
  settings: { language: "ar", theme: "dark", prayerCity: "damascus", prayerMethod: 4, prayerAlerts: true, wake: "08:00", sleep: "23:00", school: "12:00–16:00", taskReminders: true, notificationSound: "soft", glassEffects: true, animatedBackground: false },
});

function formatAttendanceDate(value: string) { return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(value + "T12:00:00")); }

function resetDailyProgress(previous: PlannerState, date: string): PlannerState {
  const historyEntry = previous.activeDate && previous.activeDate !== date && !previous.history.some(item => item.date === previous.activeDate)
    ? { id: `history-${previous.activeDate}`, date: previous.activeDate, tasks: previous.tasks.map(task => ({ ...task })), prayers: { ...previous.prayers } }
    : null;
  return {
    ...previous,
    activeDate: date,
    history: historyEntry ? [historyEntry, ...previous.history].slice(0, 90) : previous.history,
    worshipHistory: previous.activeDate && previous.activeDate !== date && !previous.worshipHistory.some(item => item.date === previous.activeDate) ? [{ date: previous.activeDate, prayers: { ...previous.prayers }, adhkarCounts: { ...previous.adhkarCounts } }, ...previous.worshipHistory].slice(0, 90) : previous.worshipHistory,
    adhkarCounts: {},
    tasks: previous.tasks.map(task => ({ ...task, done: false, lastTriggered: undefined })),
    prayers: Object.fromEntries(Object.keys(previous.prayers).map(key => [key, false])),
  };
}

function playNotificationSound(sound: NotificationSound) {
  if (sound === "silent") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = sound === "bell" ? [880, 1175] : sound === "digital" ? [660, 990] : [520, 780];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound === "digital" ? "square" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + index * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.16 + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * 0.16);
    oscillator.stop(context.currentTime + index * 0.16 + 0.24);
  });
  window.setTimeout(() => context.close(), 700);
}

function getReminderTime(value: string) {
  const match = value.match(/\b(\d{1,2}):(\d{2})\b/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

function openSystemAlarm(title: string, time: string) {
  const normalized = getReminderTime(time) ?? time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)?.[0];
  if (!normalized) {
    window.alert("لا يوجد وقت واضح لهذه المهمة. أضف الوقت أولًا بصيغة 08:30.");
    return;
  }
  const [hour, minute] = normalized.split(":").map(Number);
  const intent = `intent:#Intent;action=android.intent.action.SET_ALARM;S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(title)};i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minute};B.android.intent.extra.alarm.SKIP_UI=false;end`;
  window.location.href = intent;
}

const copy = {
  ar: { muslim: "مسلم", today: "اليوم", week: "الأسبوع", school: "المدرسة", notes: "الملاحظات", stats: "الإحصائيات", settings: "الإعدادات", history: "السجل القديم", greeting: "صباح الخير", add: "إضافة مهمة", remaining: "متبقية", complete: "مكتملة", insight: "تحليل نهاية اليوم", cloud: "الحفظ السحابي", signIn: "تسجيل الدخول", addSchool: "إضافة مادة", save: "حفظ" },
  tr: { muslim: "Müslüman", today: "Bugün", week: "Hafta", school: "Okul", notes: "Notlar", stats: "İstatistikler", settings: "Ayarlar", history: "Geçmiş", greeting: "Günaydın", add: "Görev ekle", remaining: "kalan", complete: "tamam", insight: "Gün sonu analizi", cloud: "Bulut kaydı", signIn: "Giriş yap", addSchool: "Ders ekle", save: "Kaydet" },
  en: { muslim: "Muslim", today: "Today", week: "Week", school: "School", notes: "Notes", stats: "Statistics", settings: "Settings", history: "History", greeting: "Good morning", add: "Add task", remaining: "remaining", complete: "complete", insight: "End-of-day review", cloud: "Cloud save", signIn: "Sign in", addSchool: "Add subject", save: "Save" },
};

const navItems = [
  { id: "today" as Page, icon: ListTodo, key: "today" }, { id: "muslim" as Page, icon: Heart, key: "muslim" }, { id: "week" as Page, icon: CalendarDays, key: "week" },
  { id: "school" as Page, icon: GraduationCap, key: "school" }, { id: "notes" as Page, icon: StickyNote, key: "notes" },
  { id: "stats" as Page, icon: BarChart3, key: "stats" }, { id: "history" as Page, icon: History, key: "history" }, { id: "settings" as Page, icon: Settings2, key: "settings" },
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
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [page, setPage] = useState<Page>("today");
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>(DEFAULT_PRAYER_TIMES);
  const [prayerTimesSource, setPrayerTimesSource] = useState("أوقات تقريبية قابلة للتحديث");
  const [adhkarCounts, setAdhkarCounts] = useState<Record<string, number>>({});
  const [clock, setClock] = useState(() => Date.now());
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(() => getLocalDateKey());
  const [historyDraft, setHistoryDraft] = useState<DayHistory | null>(null);
  const [state, setState] = useState<PlannerState>(() => {
    try {
      const saved = localStorage.getItem("roni-planner-state");
      const savedTheme = localStorage.getItem("roni-planner-theme");
      if (!saved) {
        const initial = createInitialState();
        return isAppTheme(savedTheme) ? { ...initial, settings: { ...initial.settings, theme: savedTheme } } : initial;
      }
      const parsed = JSON.parse(saved) as Partial<PlannerState>;
      const defaults = createInitialState();
      const loaded = { ...defaults, ...parsed, notifications: parsed.notifications ?? [], attendance: parsed.attendance ?? [], settings: { ...defaults.settings, ...(parsed.settings ?? {}), ...(isAppTheme(savedTheme) ? { theme: savedTheme } : {}) } };
      return loaded.activeDate !== defaults.activeDate ? resetDailyProgress(loaded, defaults.activeDate) : loaded;
    } catch { return createInitialState(); }
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("roni-planner-state") && localStorage.getItem("roni-planner-onboarding-complete") !== "1"; } catch { return false; }
  });
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile>({ wake: "08:00", breakfast: "08:30", lunch: "13:00", dinner: "20:30", sleep: "23:00", activity: "school", activityName: "دوامي", activityStart: "09:00", activityEnd: "16:00" });
  const [remoteReady, setRemoteReady] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [newTask, setNewTask] = useState({ time: "", title: "", icon: "✨" });
  const [addingSchool, setAddingSchool] = useState(false);
  const [newSchool, setNewSchool] = useState({ subject: "", task: "", recitation: "", homework: "", details: "", due: "" });
  const [attendanceDate, setAttendanceDate] = useState(() => getLocalDateKey());
  const [attendanceNote, setAttendanceNote] = useState("");
  const [newNotification, setNewNotification] = useState({ title: "", message: "", time: "" });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(typeof Notification === "undefined" ? "denied" : Notification.permission);
  const [activeAlert, setActiveAlert] = useState<CustomNotification | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const utils = trpc.useUtils();
  const remote = trpc.planner.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveRemote = trpc.planner.save.useMutation({ onSuccess: () => utils.planner.get.invalidate() });
  const t = copy[state.settings.language];
  const today = new Intl.DateTimeFormat(state.settings.language === "ar" ? "ar-EG" : state.settings.language === "tr" ? "tr-TR" : "en-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const currentCity = PRAYER_CITIES.find(city => city.id === state.settings.prayerCity) || PRAYER_CITIES[0];
  const nextPrayer = useMemo(() => {
    const now = new Date(clock);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const ordered = (Object.keys(prayerTimes) as PrayerName[]).map(name => ({ name, time: prayerTimes[name], minutes: Number(prayerTimes[name].slice(0, 2)) * 60 + Number(prayerTimes[name].slice(3, 5)) }));
    const upcoming = ordered.find(item => item.minutes > currentMinutes);
    const target = new Date(now);
    if (!upcoming) target.setDate(target.getDate() + 1);
    const selected = upcoming || ordered[0];
    target.setHours(Number(selected.time.slice(0, 2)), Number(selected.time.slice(3, 5)), 0, 0);
    const remaining = Math.max(0, target.getTime() - now.getTime());
    return { ...selected, remaining };
  }, [clock, prayerTimes]);
  const countdown = `${String(Math.floor(nextPrayer.remaining / 3600000)).padStart(2, "0")}:${String(Math.floor((nextPrayer.remaining % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((nextPrayer.remaining % 60000) / 1000)).padStart(2, "0")}`;
  const qiblaBearing = useMemo(() => {
    const kaabaLat = 21.4225 * Math.PI / 180;
    const kaabaLon = 39.8262 * Math.PI / 180;
    const lat = currentCity.latitude * Math.PI / 180;
    const lon = currentCity.longitude * Math.PI / 180;
    const bearing = Math.atan2(Math.sin(kaabaLon - lon), Math.cos(lat) * Math.tan(kaabaLat) - Math.sin(lat) * Math.cos(kaabaLon - lon)) * 180 / Math.PI;
    return Math.round((bearing + 360) % 360);
  }, [currentCity]);
  const qiblaDirection = qiblaBearing < 22.5 || qiblaBearing >= 337.5 ? "الشمال" : qiblaBearing < 67.5 ? "الشمال الشرقي" : qiblaBearing < 112.5 ? "الشرق" : qiblaBearing < 157.5 ? "الجنوب الشرقي" : qiblaBearing < 202.5 ? "الجنوب" : qiblaBearing < 247.5 ? "الجنوب الغربي" : qiblaBearing < 292.5 ? "الغرب" : "الشمال الغربي";
  const taskDone = state.tasks.filter(task => task.done).length;
  const prayerDone = Object.values(state.prayers).filter(Boolean).length;
  const schoolDone = state.school.filter(item => item.done).length;
  const presentDays = state.attendance.filter(item => item.status === "present").length;
  const attendanceForSelectedDate = state.attendance.find(item => item.date === attendanceDate);
  const totalTracked = state.tasks.length + Object.keys(state.prayers).length;
  const completion = totalTracked ? Math.round(((taskDone + prayerDone) / totalTracked) * 100) : 0;
  const weeklyProgress = Math.round((state.week.reduce((sum, day) => sum + day.progress, 0) + completion) / 8);
  const bestDay = useMemo(() => [...state.week, { id: "today", label: "اليوم", short: "ي", progress: completion, status: "pending" as const }].sort((a, b) => b.progress - a.progress)[0], [state.week, completion]);
  const applyHistoryDay = () => {
    const oldDay = historyDraft ?? state.history.find(day => day.date === selectedHistoryDate);
    if (!oldDay) return;
    update(previous => ({ ...previous, tasks: previous.tasks.map(task => { const oldTask = oldDay.tasks.find(item => item.id === task.id || item.title === task.title); return oldTask ? { ...task, done: oldTask.done } : task; }), prayers: { ...previous.prayers, ...oldDay.prayers } }));
    setPage("today");
  };
  const openHistoryDate = (date: string) => {
    if (!date || date > getLocalDateKey()) return;
    setSelectedHistoryDate(date);
    const saved = state.history.find(day => day.date === date);
    setHistoryDraft(saved ? { ...saved, tasks: saved.tasks.map(task => ({ ...task })), prayers: { ...saved.prayers } } : {
      id: `history-${date}`,
      date,
      tasks: state.tasks.map(task => ({ ...task, done: false, lastTriggered: undefined })),
      prayers: Object.fromEntries(Object.keys(state.prayers).map(key => [key, false])),
    });
  };
  const saveHistoryDraft = () => {
    if (!historyDraft) return;
    update(previous => ({ ...previous, history: [historyDraft, ...previous.history.filter(day => day.date !== historyDraft.date)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90) }));
  };

  useEffect(() => { document.documentElement.dir = state.settings.language === "ar" ? "rtl" : "ltr"; document.documentElement.lang = state.settings.language === "ar" ? "ar" : state.settings.language; }, [state.settings.language]);
  useEffect(() => {
    const controller = new AbortController();
    const url = `https://api.aladhan.com/v1/timings?latitude=${currentCity.latitude}&longitude=${currentCity.longitude}&method=4`;
    fetch(url, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("prayer-times")))
      .then(payload => {
        const timings = payload?.data?.timings;
        if (!timings) return;
        setPrayerTimes({ "الفجر": timings.Fajr?.slice(0, 5) || DEFAULT_PRAYER_TIMES["الفجر"], "الظهر": timings.Dhuhr?.slice(0, 5) || DEFAULT_PRAYER_TIMES["الظهر"], "العصر": timings.Asr?.slice(0, 5) || DEFAULT_PRAYER_TIMES["العصر"], "المغرب": timings.Maghrib?.slice(0, 5) || DEFAULT_PRAYER_TIMES["المغرب"], "العشاء": timings.Isha?.slice(0, 5) || DEFAULT_PRAYER_TIMES["العشاء"] });
        setPrayerTimesSource(`أوقات ${currentCity.label} من خدمة الأذان اليومية`);
      })
      .catch(() => setPrayerTimesSource("أوقات تقريبية؛ لا يوجد اتصال بخدمة الأذان"));
    return () => controller.abort();
  }, [currentCity.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isShared = params.get("share") === "1";
    const isNewNote = params.get("new-note") === "1";
    if (!isShared && !isNewNote) return;
    const title = params.get("title")?.trim();
    const text = params.get("text")?.trim();
    const sharedUrl = params.get("url")?.trim();
    const content = [title, text, sharedUrl].filter(Boolean).join("\n");
    update(previous => ({
      ...previous,
      notes: [...previous.notes, { id: `note-${Date.now()}`, type: isShared ? "idea" : "reminder", text: content || "ملاحظة جديدة..." }],
    }));
    setPage("notes");
    window.history.replaceState({}, "", "/");
  }, []);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const onInstallPrompt = (event: Event) => { event.preventDefault(); installPrompt.current = event as InstallPromptEvent; setCanInstall(true); };
    const onInstalled = () => { installPrompt.current = null; setCanInstall(false); };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onInstallPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  useEffect(() => { localStorage.setItem("roni-planner-state", JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem("roni-planner-theme", state.settings.theme); }, [state.settings.theme]);
  useEffect(() => {
    const onUpdate = () => {
      setUpdateAvailable(true);
      setActiveAlert({ id: "app-update", title: "تحديث جديد متوفر", message: "اضغط تحديث التطبيق الآن لتطبيق آخر التحسينات.", time: "", enabled: true });
    };
    window.addEventListener("roni-app-update", onUpdate);
    return () => window.removeEventListener("roni-app-update", onUpdate);
  }, []);
  useEffect(() => {
    if (!isAuthenticated) { setRemoteReady(true); return; }
    if (!remote.isFetched) return;
    if (remote.data?.data) { try { setShowOnboarding(false); localStorage.setItem("roni-planner-onboarding-complete", "1"); const parsed = JSON.parse(remote.data.data) as Partial<PlannerState>; setState(previous => { const todayKey = getLocalDateKey(); const localTheme = localStorage.getItem("roni-planner-theme"); const remoteTheme = parsed.settings?.theme; const stableTheme = isAppTheme(localTheme) ? localTheme : isAppTheme(remoteTheme) ? remoteTheme : previous.settings.theme; const loaded = { ...previous, ...parsed, history: parsed.history ?? previous.history ?? [], worshipHistory: parsed.worshipHistory ?? previous.worshipHistory ?? [], adhkarCounts: parsed.adhkarCounts ?? previous.adhkarCounts ?? {}, notifications: parsed.notifications ?? previous.notifications ?? [], attendance: parsed.attendance ?? previous.attendance ?? [], settings: { ...previous.settings, ...(parsed.settings ?? {}), theme: stableTheme } }; return loaded.activeDate !== todayKey ? resetDailyProgress(loaded, todayKey) : loaded; }); } catch { /* retain local data if a stale document is malformed */ } }
    setRemoteReady(true);
  }, [isAuthenticated, remote.isFetched, remote.data?.data]);
  useEffect(() => {
    const checkNewDay = () => {
      const date = getLocalDateKey();
      setState(previous => previous.activeDate === date ? previous : resetDailyProgress(previous, date));
    };
    checkNewDay();
    const timer = window.setInterval(checkNewDay, 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!isAuthenticated || !remoteReady) return;
    const timer = window.setTimeout(() => saveRemote.mutate({ data: JSON.stringify(state) }), 900);
    return () => window.clearTimeout(timer);
  }, [state, isAuthenticated, remoteReady]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayKey = getLocalDateKey();
      const currentTime = now.toTimeString().slice(0, 5);
      const dueCustom = state.notifications.find(item => item.enabled && item.time === currentTime && item.lastTriggered !== todayKey);
      const dueTask = state.tasks.find(item => !item.done && (state.settings.taskReminders !== false || item.autoComplete) && getReminderTime(item.time) === currentTime && item.lastTriggered !== todayKey);
      if (!dueCustom && !dueTask) return;
      if (dueCustom) {
        update(previous => ({ ...previous, notifications: previous.notifications.map(item => item.id === dueCustom.id ? { ...item, lastTriggered: todayKey } : item) }));
        setActiveAlert(dueCustom);
        playNotificationSound(state.settings.notificationSound);
        if (notificationPermission === "granted") new Notification(dueCustom.title, { body: dueCustom.message || "لديك تذكير من RONI Planner" });
      } else if (dueTask) {
        const taskAlert: CustomNotification = { id: dueTask.id, title: `${dueTask.icon} ${dueTask.title}`, message: `حان وقت المهمة (${dueTask.time})`, time: currentTime, enabled: true };
        update(previous => ({ ...previous, tasks: previous.tasks.map(item => item.id === dueTask.id ? { ...item, lastTriggered: todayKey, done: item.autoComplete ? true : item.done } : item) }));
        if (state.settings.taskReminders === false) return;
        setActiveAlert(taskAlert);
        playNotificationSound(state.settings.notificationSound);
        if (notificationPermission === "granted") new Notification(taskAlert.title, { body: taskAlert.message });
      }
      window.setTimeout(() => setActiveAlert(null), 7000);
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 15000);
    return () => window.clearInterval(timer);
  }, [state.notifications, state.tasks, state.settings.taskReminders, state.settings.notificationSound, notificationPermission]);

  const update = (fn: (previous: PlannerState) => PlannerState) => setState(fn);
  const canLogPrayer = (prayer: PrayerName) => prayerTimes[prayer] <= new Date().toTimeString().slice(0, 5);
  const togglePrayer = (prayer: PrayerName) => {
    if (!canLogPrayer(prayer)) { window.alert(`لم يؤذن بعد لصلاة ${prayer}. وقت الأذان: ${prayerTimes[prayer]}`); return; }
    update(previous => {
      const prayers = { ...previous.prayers, [prayer]: !previous.prayers[prayer] };
      const entry = { date: previous.activeDate, prayers, adhkarCounts: { ...previous.adhkarCounts } };
      return { ...previous, prayers, worshipHistory: [entry, ...previous.worshipHistory.filter(item => item.date !== previous.activeDate)].slice(0, 90) };
    });
  };
  const handleLogout = async () => { if (!window.confirm("هل تريد تسجيل الخروج؟")) return; await logout(); window.location.href = "/login"; };
  const changePage = (nextPage: Page) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggleTask = (id: string) => update(previous => ({ ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task) }));
  const toggleTaskAutoComplete = (id: string) => update(previous => ({ ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, autoComplete: !task.autoComplete } : task) }));
  const finishOnboarding = () => {
    const nextTasks = buildPersonalizedTasks(onboardingProfile);
    update(previous => ({ ...previous, tasks: nextTasks, settings: { ...previous.settings, wake: onboardingProfile.wake, sleep: onboardingProfile.sleep, school: `${onboardingProfile.activityStart}–${onboardingProfile.activityEnd}` } }));
    try { localStorage.setItem("roni-planner-onboarding-complete", "1"); } catch {}
    setShowOnboarding(false);
  };
  const deleteTask = (id: string) => update(previous => ({ ...previous, tasks: previous.tasks.filter(task => task.id !== id) }));
  const editTask = (task: Task) => { const title = window.prompt("اسم المهمة", task.title); const time = window.prompt("الوقت", task.time); if (title?.trim() && time?.trim()) update(previous => ({ ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, title: title.trim(), time: time.trim() } : item) })); };
  const moveTask = (id: string, direction: -1 | 1) => update(previous => { const index = previous.tasks.findIndex(task => task.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= previous.tasks.length) return previous; const tasks = [...previous.tasks]; [tasks[index], tasks[target]] = [tasks[target], tasks[index]]; return { ...previous, tasks }; });
  const updateTask = (id: string, patch: Partial<Task>) => update(previous => ({ ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, ...patch } : task) }));
  const addTask = () => { if (!newTask.title.trim() || !newTask.time.trim()) return; update(previous => ({ ...previous, tasks: [...previous.tasks, { id: `custom-${Date.now()}`, title: newTask.title.trim(), time: newTask.time.trim(), icon: newTask.icon || "✨", done: false, color: "blue" as TaskColor }].sort((a, b) => a.time.localeCompare(b.time)) })); setNewTask({ time: "", title: "", icon: "✨" }); setAddingTask(false); };
  const addSchool = () => { if (!newSchool.subject.trim() || !newSchool.task.trim()) return; update(previous => ({ ...previous, school: [...previous.school, { ...newSchool, id: `school-${Date.now()}`, done: false }] })); setNewSchool({ subject: "", task: "", recitation: "", homework: "", details: "", due: "" }); setAddingSchool(false); };
  const saveAttendance = (status: "present" | "absent") => { if (!attendanceDate) return; update(previous => ({ ...previous, attendance: [...previous.attendance.filter(item => item.date !== attendanceDate), { id: attendanceForSelectedDate?.id ?? `attendance-${Date.now()}`, date: attendanceDate, status, note: attendanceNote.trim() }] .sort((a, b) => b.date.localeCompare(a.date)) })); setAttendanceNote(""); };
  const deleteAttendance = (id: string) => update(previous => ({ ...previous, attendance: previous.attendance.filter(item => item.id !== id) }));
  const addNotification = () => { if (!newNotification.title.trim() || !newNotification.time) return; update(previous => ({ ...previous, notifications: [...previous.notifications, { ...newNotification, id: `notification-${Date.now()}`, enabled: true }] })); setNewNotification({ title: "", message: "", time: "" }); };
  const updateApp = async () => {
    if (!("serviceWorker" in navigator)) { window.location.reload(); return; }
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) { window.location.reload(); return; }
    await registration.update();
    if (registration.waiting) {
      setUpdateAvailable(false);
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      setUpdateAvailable(false);
      window.location.reload();
    }
  };
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { window.alert("المتصفح لا يدعم تحديد الموقع."); return; }
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      const nearest = [...PRAYER_CITIES].sort((a, b) => Math.hypot(a.latitude - latitude, a.longitude - longitude) - Math.hypot(b.latitude - latitude, b.longitude - longitude))[0];
      update(previous => ({ ...previous, settings: { ...previous.settings, prayerCity: nearest.id } }));
      window.alert(`تم اختيار أقرب مدينة: ${nearest.label}`);
    }, () => window.alert("تعذر تحديد الموقع. اختر المدينة يدويًا."));
  };
  const requestNotificationPermission = async () => { if (typeof Notification === "undefined") return; const permission = await Notification.requestPermission(); setNotificationPermission(permission); if (permission === "granted" && "serviceWorker" in navigator) await navigator.serviceWorker.register("/sw.js"); };
  const installApp = async () => { const prompt = installPrompt.current; if (!prompt) return; await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === "accepted") setCanInstall(false); installPrompt.current = null; };
  const resetToday = () => { if (window.confirm("هل تريد إعادة ضبط بيانات اليوم؟")) update(previous => ({ ...previous, tasks: previous.tasks.map(task => ({ ...task, done: false })), prayers: Object.fromEntries(Object.keys(previous.prayers).map(key => [key, false])), school: previous.school.map(item => ({ ...item, done: false })) })); };
  const resetWeek = () => { if (window.confirm("هل تريد إعادة ضبط الأسبوع؟")) update(previous => ({ ...previous, week: previous.week.map(day => ({ ...day, progress: 0, status: "pending" })) })); };

  const MuslimPage = () => {
    const [adhkarCategory, setAdhkarCategory] = useState<AdhkarCategory>("morning");
    const [selectedDhikr, setSelectedDhikr] = useState<{ id: string; text: string; target: number } | null>(null);
    const [quranSurah, setQuranSurah] = useState(1);
    const [quranAyahs, setQuranAyahs] = useState<{ numberInSurah: number; text: string }[]>([]);
    const [quranLoading, setQuranLoading] = useState(false);
    const [quranError, setQuranError] = useState("");
    const [quranSearch, setQuranSearch] = useState("");
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
      if (adhkarCategory !== "quran") return;
      let cancelled = false;
      setQuranLoading(true); setQuranError("");
      fetch(`https://api.alquran.cloud/v1/surah/${quranSurah}/quran-uthmani`).then(response => { if (!response.ok) throw new Error("quran"); return response.json(); }).then(payload => { if (!cancelled) setQuranAyahs(payload.data.ayahs || []); }).catch(() => { if (!cancelled) { setQuranAyahs([]); setQuranError("تعذر تحميل السورة الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى."); } }).finally(() => { if (!cancelled) setQuranLoading(false); });
      return () => { cancelled = true; };
    }, [adhkarCategory, quranSurah]);
    const adhkarByCategory: Record<Exclude<AdhkarCategory, "quran">, { title: string; intro: string; items: { id: string; text: string; target: number }[] }> = {
      morning: { title: "أذكار الصباح", intro: "تُقال بعد الفجر أو في بداية يومك.", items: [{ id: "morning-ayat", text: "آية الكرسي", target: 1 }, { id: "morning-praise", text: "رضيت بالله ربًا وبالإسلام دينًا وبمحمد ﷺ نبيًا", target: 3 }, { id: "morning-protection", text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم", target: 3 }, { id: "morning-praise-100", text: "سبحان الله وبحمده", target: 100 }] },
      evening: { title: "أذكار المساء", intro: "تُقال بعد العصر أو عند دخول المساء.", items: [{ id: "evening-ayat", text: "آية الكرسي", target: 1 }, { id: "evening-protection", text: "أعوذ بكلمات الله التامات من شر ما خلق", target: 3 }, { id: "evening-forgive", text: "أستغفر الله وأتوب إليه", target: 100 }, { id: "evening-tawhid", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير", target: 10 }] },
      sleep: { title: "أذكار النوم", intro: "طمأنينة قبل النوم وختم اليوم بالذكر.", items: [{ id: "sleep-ayat", text: "قراءة آية الكرسي قبل النوم", target: 1 }, { id: "sleep-subhan", text: "سبحان الله 33، الحمد لله 33، الله أكبر 34", target: 1 }, { id: "sleep-dua", text: "باسمك اللهم أموت وأحيا", target: 1 }, { id: "sleep-three", text: "قراءة الإخلاص والفلق والناس", target: 3 }] },
      travel: { title: "أذكار السفر", intro: "قبل الانطلاق وأثناء السفر.", items: [{ id: "travel-dua", text: "سبحان الذي سخر لنا هذا وما كنا له مقرنين وإنا إلى ربنا لمنقلبون", target: 1 }, { id: "travel-takbir", text: "الله أكبر، الله أكبر، الله أكبر", target: 3 }, { id: "travel-protection", text: "اللهم إنا نسألك في سفرنا هذا البر والتقوى", target: 1 }, { id: "travel-return", text: "آيبون تائبون عابدون لربنا حامدون", target: 1 }] },
    };
    const category = adhkarCategory === "quran" ? null : adhkarByCategory[adhkarCategory];
    const quranSurahs = [[1,"الفاتحة"],[2,"البقرة"],[3,"آل عمران"],[4,"النساء"],[5,"المائدة"],[6,"الأنعام"],[7,"الأعراف"],[8,"الأنفال"],[9,"التوبة"],[10,"يونس"],[11,"هود"],[12,"يوسف"],[13,"الرعد"],[14,"إبراهيم"],[15,"الحجر"],[16,"النحل"],[17,"الإسراء"],[18,"الكهف"],[19,"مريم"],[20,"طه"],[21,"الأنبياء"],[22,"الحج"],[23,"المؤمنون"],[24,"النور"],[25,"الفرقان"],[26,"الشعراء"],[27,"النمل"],[28,"القصص"],[29,"العنكبوت"],[30,"الروم"],[31,"لقمان"],[32,"السجدة"],[33,"الأحزاب"],[34,"سبأ"],[35,"فاطر"],[36,"يس"],[37,"الصافات"],[38,"ص"],[39,"الزمر"],[40,"غافر"],[41,"فصلت"],[42,"الشورى"],[43,"الزخرف"],[44,"الدخان"],[45,"الجاثية"],[46,"الأحقاف"],[47,"محمد"],[48,"الفتح"],[49,"الحجرات"],[50,"ق"],[51,"الذاريات"],[52,"الطور"],[53,"النجم"],[54,"القمر"],[55,"الرحمن"],[56,"الواقعة"],[57,"الحديد"],[58,"المجادلة"],[59,"الحشر"],[60,"الممتحنة"],[61,"الصف"],[62,"الجمعة"],[63,"المنافقون"],[64,"التغابن"],[65,"الطلاق"],[66,"التحريم"],[67,"الملك"],[68,"القلم"],[69,"الحاقة"],[70,"المعارج"],[71,"نوح"],[72,"الجن"],[73,"المزمل"],[74,"المدثر"],[75,"القيامة"],[76,"الإنسان"],[77,"المرسلات"],[78,"النبأ"],[79,"النازعات"],[80,"عبس"],[81,"التكوير"],[82,"الانفطار"],[83,"المطففين"],[84,"الانشقاق"],[85,"البروج"],[86,"الطارق"],[87,"الأعلى"],[88,"الغاشية"],[89,"الفجر"],[90,"البلد"],[91,"الشمس"],[92,"الليل"],[93,"الضحى"],[94,"الشرح"],[95,"التين"],[96,"العلق"],[97,"القدر"],[98,"البينة"],[99,"الزلزلة"],[100,"العاديات"],[101,"القارعة"],[102,"التكاثر"],[103,"العصر"],[104,"الهمزة"],[105,"الفيل"],[106,"قريش"],[107,"الماعون"],[108,"الكوثر"],[109,"الكافرون"],[110,"النصر"],[111,"المسد"],[112,"الإخلاص"],[113,"الفلق"],[114,"الناس"]] as [number,string][];
    const filteredQuranAyahs = quranAyahs.filter(ayah => !quranSearch.trim() || String(ayah.numberInSurah) === quranSearch.trim() || ayah.text.includes(quranSearch.trim()));
    const playQuranAudio = async () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setAudioPlaying(false); return; }
      setAudioLoading(true);
      try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${quranSurah}/ar.alafasy`);
        if (!response.ok) throw new Error("audio");
        const payload = await response.json();
        const urls = (payload.data?.ayahs || []).map((ayah: { audio?: string }) => ayah.audio).filter(Boolean) as string[];
        let index = 0;
        const playNext = () => { if (index >= urls.length) { audioRef.current = null; setAudioPlaying(false); return; } const audio = new Audio(urls[index++]); audioRef.current = audio; audio.onended = playNext; audio.onerror = () => { audioRef.current = null; setAudioPlaying(false); }; audio.play().catch(() => { audioRef.current = null; setAudioPlaying(false); }); };
        setAudioPlaying(true); playNext();
      } catch { window.alert("تعذر تحميل التلاوة الصوتية. تحقق من اتصال الإنترنت."); }
      finally { setAudioLoading(false); }
    };
    const increaseDhikr = (id: string, target: number) => update(previous => { const adhkarCounts = { ...previous.adhkarCounts, [id]: Math.min(target, (previous.adhkarCounts[id] || 0) + 1) }; const entry = { date: previous.activeDate, prayers: { ...previous.prayers }, adhkarCounts }; return { ...previous, adhkarCounts, worshipHistory: [entry, ...previous.worshipHistory.filter(item => item.date !== previous.activeDate)].slice(0, 90) }; });
    const history = state.worshipHistory.slice(0, 7);
    return <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><Heart size={15}/> عبادتك وطمأنينتك</div><h1>🕌 مسلم</h1><p>أذكار كاملة، القرآن الكريم، وسجل يومي لصلواتك وأذكارك.</p></div></section><section className="panel adhkar-panel"><SectionTitle icon={Heart} title="الأذكار والقرآن" action={<span className="stat-chip">{Object.values(state.adhkarCounts).reduce((sum, count) => sum + count, 0)} تسبيحة</span>} /><div className="adhkar-tabs">{([['morning','الصباح'],['evening','المساء'],['sleep','النوم'],['travel','السفر'],['quran','القرآن الكريم']] as [AdhkarCategory,string][]).map(([id,label]) => <button type="button" className={adhkarCategory === id ? "active" : ""} onClick={() => { setAdhkarCategory(id); setSelectedDhikr(null); }} key={id}>{label}</button>)}</div>{adhkarCategory === "quran" ? <div className="quran-reader quran-glass"><div className="quran-reader-head"><div><h2>القرآن الكريم</h2><p>النص بالرسم العثماني باستخدام خط KFGQPC عثمان طه.</p></div><div className="quran-reader-controls"><select value={quranSurah} onChange={event => { setQuranSurah(Number(event.target.value)); setQuranSearch(""); }}>{quranSurahs.map(([number,name]) => <option value={number} key={number}>{number}. سورة {name}</option>)}</select><button type="button" onClick={playQuranAudio} disabled={audioLoading}>{audioLoading ? "جاري التحميل..." : audioPlaying ? "إيقاف التلاوة" : "▶ تشغيل التلاوة"}</button></div></div><div className="quran-search"><input value={quranSearch} onChange={event => setQuranSearch(event.target.value)} placeholder="ابحث بكلمة أو رقم آية..."/><span>{quranSearch ? `${filteredQuranAyahs.length} نتيجة` : `${quranAyahs.length} آية`}</span></div>{quranLoading && <p className="notification-empty">جاري تحميل السورة...</p>}{quranError && <p className="quran-error">{quranError}</p>} {!quranLoading && !quranError && <div className="quran-ayah-list">{filteredQuranAyahs.map(ayah => <p className="quran-ayah" key={ayah.numberInSurah}>{ayah.text} <span>﴿{ayah.numberInSurah}﴾</span></p>)}</div>}</div> : selectedDhikr ? <div className="dhikr-detail"><button type="button" className="back-detail" onClick={() => setSelectedDhikr(null)}>← العودة إلى قائمة الأذكار</button><span className="detail-icon">🤲</span><h2>{selectedDhikr.text}</h2><p>اقرأ الذكر بطمأنينة، واضغط زر العدّاد بعد كل مرة.</p><div className="detail-counter"><strong>{state.adhkarCounts[selectedDhikr.id] || 0} / {selectedDhikr.target}</strong><button type="button" onClick={() => increaseDhikr(selectedDhikr.id, selectedDhikr.target)} disabled={(state.adhkarCounts[selectedDhikr.id] || 0) >= selectedDhikr.target}>تسجيل مرة</button></div></div> : <><p className="adhkar-intro">{category?.intro}</p><div className="adhkar-grid">{category?.items.map(item => { const count = state.adhkarCounts[item.id] || 0; return <article className="adhkar-card" key={item.id} onClick={() => setSelectedDhikr(item)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter") setSelectedDhikr(item); }}><span className="adhkar-icon">🤲</span><div><h3>{item.text}</h3><small>{count} / {item.target}</small></div><button type="button" onClick={event => { event.stopPropagation(); increaseDhikr(item.id, item.target); }} disabled={count >= item.target}>+1</button></article>; })}</div></>}</section><section className="panel worship-history-panel"><SectionTitle icon={History} title="سجل الصلوات والأذكار" /><p className="section-subtitle">يُحفظ آخر 90 يومًا على جهازك.</p><div className="worship-history-list">{history.length === 0 ? <p className="notification-empty">ابدأ اليوم وسيظهر سجلك هنا.</p> : history.map(item => <article key={item.date}><strong>{formatAttendanceDate(item.date)}</strong><span>الصلوات: {Object.values(item.prayers).filter(Boolean).length} / 5</span><span>الأذكار: {Object.values(item.adhkarCounts).reduce((sum, count) => sum + count, 0)}</span></article>)}</div></section><section className="panel muslim-times-panel"><div className="section-title"><div className="section-heading"><span className="icon-surface"><Clock3 size={18}/></span><div><h2>مواقيت الصلاة</h2><p className="section-subtitle">{prayerTimesSource}</p></div></div><span className="permission-pill">اليوم {today}</span></div><div className="prayer-controls"><label>المدينة<select value={currentCity.id} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, prayerCity: event.target.value } }))}>{PRAYER_CITIES.map(city => <option value={city.id} key={city.id}>{city.label}</option>)}</select></label><label>طريقة الحساب<select value={state.settings.prayerMethod} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, prayerMethod: Number(event.target.value) as PrayerMethod } }))}><option value={4}>أم القرى</option><option value={5}>الهيئة المصرية</option><option value={3}>رابطة العالم الإسلامي</option><option value={2}>ISNA</option></select></label><button type="button" onClick={useMyLocation}>استخدم موقعي</button><div className="next-prayer-countdown"><span>الصلاة القادمة: {nextPrayer.name}</span><strong>{countdown}</strong></div></div><div className="qibla-card"><span>🧭 اتجاه القبلة</span><strong>{qiblaBearing}°</strong><small>من {currentCity.label} باتجاه {qiblaDirection}</small></div><div className="muslim-prayer-grid">{(Object.keys(prayerTimes) as PrayerName[]).map(prayer => { const reached = canLogPrayer(prayer); const done = state.prayers[prayer]; return <article className={`muslim-prayer-card ${done ? "is-done" : ""}`} key={prayer}><div><strong>{prayer}</strong><time>{prayerTimes[prayer]}</time></div><button type="button" disabled={!reached} onClick={() => togglePrayer(prayer)}>{done ? "تمت الصلاة ✓" : reached ? "تسجيل الصلاة" : "لم يؤذن بعد"}</button></article>; })}</div></section></div>;
  };

  const TodayPage = () => <>
    <section className="hero-card"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-copy"><div className="eyebrow"><Sun size={15} /> {today}</div><h1>{t.greeting} <span>👋</span></h1><p>خطّط ليومك بهدوء، وأنجز ما يهمك خطوة بخطوة.</p><div className="hero-metrics"><div><strong>{taskDone}</strong><span>{t.complete}</span></div><i/><div><strong>{state.tasks.length - taskDone}</strong><span>{t.remaining}</span></div></div></div><ProgressRing value={completion} /></section>
    <div className="dashboard-grid"><div className="main-column"><section className="panel task-panel"><SectionTitle icon={ListTodo} title="جدول اليوم" action={<div className="schedule-actions"><Button type="button" onClick={() => setEditingSchedule(!editingSchedule)} className="schedule-edit-button">{editingSchedule ? "حفظ الجدول" : "تعديل الجدول"}</Button><Button type="button" onClick={() => setAddingTask(!addingTask)} className="accent-button"><Plus size={16} /> {t.add}</Button></div>} />
      {addingTask && <div className="quick-add"><input value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })} placeholder="08:00" /><input value={newTask.icon} onChange={e => setNewTask({ ...newTask, icon: e.target.value })} aria-label="رمز" /><input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="مهمة جديدة" /><Button onClick={addTask}><Check size={16} /></Button></div>}
      <div className="task-list">{state.tasks.map((task, index) => <div className={`task-row task-color-${task.color || "blue"} ${task.done ? "is-done" : ""}`} style={task.customColor ? { background: `${task.customColor}22`, borderRight: `3px solid ${task.customColor}` } : undefined} key={task.id}><label className="checkbox-wrap"><input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`إكمال ${task.title}`} /><span className="checkmark"><Check size={13} /></span></label><time>{task.time}</time><span className="task-emoji">{task.icon}</span>{editingSchedule ? <div className="schedule-edit-fields"><input value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })} aria-label="اسم المهمة" /><input value={task.time} onChange={e => updateTask(task.id, { time: e.target.value })} aria-label="وقت المهمة" /><select value={task.color || "blue"} onChange={e => updateTask(task.id, { color: e.target.value as TaskColor })} aria-label="لون جاهز"><option value="blue">أزرق</option><option value="pink">زهري</option><option value="white">أبيض</option><option value="green">أخضر</option><option value="orange">برتقالي</option></select><label className="color-wheel-control" title="اختر لونًا مخصصًا"><input type="color" value={task.customColor || "#6ea8ff"} onChange={e => updateTask(task.id, { customColor: e.target.value })} aria-label="لون مخصص" /><span>لون مخصص</span></label></div> : <span className="task-name">{task.title}</span>}<div className="task-actions">{editingSchedule && <><button type="button" onClick={() => moveTask(task.id, -1)} disabled={index === 0} aria-label="نقل المهمة للأعلى">↑</button><button type="button" onClick={() => moveTask(task.id, 1)} disabled={index === state.tasks.length - 1} aria-label="نقل المهمة للأسفل">↓</button></>}<button type="button" className={`auto-complete-button ${task.autoComplete ? "enabled" : ""}`} onClick={() => toggleTaskAutoComplete(task.id)} aria-label="تفعيل أو إيقاف الإنجاز التلقائي" title={task.autoComplete ? "الإنجاز التلقائي مفعّل" : "تفعيل الإنجاز التلقائي"}>✓</button><button type="button" onClick={() => openSystemAlarm(`${task.icon} ${task.title}`, task.time)} aria-label="ضبط منبه النظام للمهمة" title="فتح منبه الجهاز"><AlarmClock size={15}/></button><button type="button" onClick={() => editTask(task)} aria-label="تعديل المهمة"><Edit3 size={15}/></button><button type="button" onClick={() => deleteTask(task.id)} aria-label="حذف المهمة"><Trash2 size={15}/></button></div></div>)}</div>
    </section></div><aside className="side-column">{PrayerPanel()}</aside></div>
    <div className="lower-grid">{SchoolPreview()}{InsightPanel()}</div>
  </>;

  const PrayerPanel = () => <section className="panel prayer-panel"><SectionTitle icon={Moon} title="الصلوات" /><p className="section-subtitle">تسجيل الصلاة يصبح متاحًا بعد الأذان</p><div className="prayer-list">{(Object.keys(state.prayers) as PrayerName[]).map(prayer => { const done = state.prayers[prayer]; const reached = canLogPrayer(prayer); return <label className={`prayer-row ${done ? "is-done" : ""}`} key={prayer}><input type="checkbox" checked={done} disabled={!reached} onChange={() => togglePrayer(prayer)} /><span className="prayer-box"><Check size={13} /></span><span>{prayer}<small className="prayer-time-hint">{reached ? prayerTimes[prayer] : `لم يؤذن بعد · ${prayerTimes[prayer]}`}</small></span>{done && <Check className="prayer-check" size={15}/>}</label>; })}</div><div className="prayer-footer"><span>المكتمل</span><strong>{prayerDone} / 5</strong></div></section>;

  const SchoolPreview = () => <section className="panel compact-panel"><SectionTitle icon={BookOpen} title="مهام المدرسة" action={<button type="button" className="ghost-action" onClick={() => changePage("school")}>عرض الكل <ChevronLeft size={15}/></button>} /><div className="mini-school"><div className="mini-count"><GraduationCap size={20}/><strong>{state.school.length}</strong><span>مواد / مهام</span></div><div><strong>{schoolDone} مكتملة</strong><p>أضف المواد، التسميع، والواجبات من صفحة المدرسة.</p></div></div></section>;

  const InsightPanel = () => { const unfinished = state.tasks.filter(task => !task.done).slice(0, 2); return <section className="panel compact-panel insight-panel"><SectionTitle icon={BrainCircuit} title={`🤖 ${t.insight}`} /><div className="insight-copy"><span className="insight-icon"><Sparkles size={17}/></span><p>{completion >= 75 ? "يوم رائع! حافظت على إيقاع ثابت. انقل فقط ما تبقى لوقت محدد غدًا." : completion >= 40 ? `أنجزت ${taskDone} مهام حتى الآن. ركّز على مهمة واحدة قصيرة قبل الراحة التالية.` : "ابدأ بمهمة بسيطة الآن. التقدم الصغير أفضل من انتظار الوقت المثالي."}</p></div>{unfinished.length > 0 && <div className="carry-over"><span>للغد:</span>{unfinished.map(task => <em key={task.id}>{task.title}</em>)}</div>}</section>; };

  const WeekPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><CalendarDays size={15}/> نظرة شاملة</div><h1>📅 الأسبوع</h1><p>راقب الإيقاع، ولاحظ اليوم الذي تحتاج فيه إلى دفعة بسيطة.</p></div><div className="stat-chip"><TrendingUp size={17}/>{weeklyProgress}% هذا الأسبوع</div></section><section className="panel week-panel"><div className="week-bars">{state.week.map(day => <div className="day-column" key={day.id}><div className="bar-area"><div className={`week-bar ${day.status}`} style={{ height: `${Math.max(day.progress, 7)}%` }}><span>{day.progress}%</span></div></div><strong>{day.short}</strong><small>{day.label}</small><button className={`status-dot ${day.status}`} onClick={() => update(previous => ({ ...previous, week: previous.week.map(item => item.id === day.id ? { ...item, status: item.status === "complete" ? "missed" : item.status === "missed" ? "pending" : "complete" } : item) }))} aria-label={`تحديث حالة ${day.label}`}/></div>)}<div className="day-column today-column"><div className="bar-area"><div className="week-bar active" style={{ height: `${Math.max(completion, 7)}%` }}><span>{completion}%</span></div></div><strong>ي</strong><small>اليوم</small><span className="status-dot pending"/></div></div><div className="week-legend"><span><i className="legend-dot pending"/> لم يبدأ</span><span><i className="legend-dot complete"/> مكتمل</span><span><i className="legend-dot missed"/> لم يكتمل</span></div></section><section className="panel weekly-insight"><div className="insight-icon"><TrendingUp size={18}/></div><div><strong>أداء الأسبوع</strong><p>أفضل يوم هو <b>{bestDay.label}</b> بنسبة {bestDay.progress}%. احتفظ بنفس نمط البداية لهذا الأسبوع.</p></div></section></div>;

  const SchoolPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><GraduationCap size={15}/> مساحة الدراسة</div><h1>📚 مهام المدرسة</h1><p>المواد، الواجبات، التسميع، ومواعيد التسليم في مكان واحد.</p></div><Button className="accent-button" onClick={() => setAddingSchool(!addingSchool)}><Plus size={16}/>{t.addSchool}</Button></section>{addingSchool && <section className="panel school-form"><div className="form-grid"><input placeholder="اسم المادة *" value={newSchool.subject} onChange={e => setNewSchool({...newSchool, subject: e.target.value})}/><input placeholder="المهمة *" value={newSchool.task} onChange={e => setNewSchool({...newSchool, task: e.target.value})}/><input placeholder="التسميع" value={newSchool.recitation} onChange={e => setNewSchool({...newSchool, recitation: e.target.value})}/><input placeholder="واجب منزلي" value={newSchool.homework} onChange={e => setNewSchool({...newSchool, homework: e.target.value})}/><input type="date" value={newSchool.due} onChange={e => setNewSchool({...newSchool, due: e.target.value})}/><input className="wide" placeholder="تفاصيل إضافية" value={newSchool.details} onChange={e => setNewSchool({...newSchool, details: e.target.value})}/></div><div className="form-actions"><Button variant="outline" onClick={() => setAddingSchool(false)}>إلغاء</Button><Button onClick={addSchool}>{t.save}</Button></div></section>}<section className="panel attendance-panel"><div className="section-title"><div className="section-heading"><span className="icon-surface"><CalendarDays size={18}/></span><div><h2>سجل أيام المدرسة</h2><p className="section-subtitle">سجّل كل يوم ذهبت فيه إلى المدرسة</p></div></div><strong className="attendance-total">{presentDays} يوم حضور</strong></div><div className="attendance-form"><input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} /><input placeholder="ملاحظة اختيارية، مثل: امتحان أو دوام قصير" value={attendanceNote} onChange={e => setAttendanceNote(e.target.value)} /><Button className="attendance-present" onClick={() => saveAttendance("present")}><Check size={15}/> حضرت</Button><Button variant="outline" onClick={() => saveAttendance("absent")}>غبت</Button></div>{attendanceForSelectedDate && <p className="attendance-current">هذا اليوم مسجل: <strong>{attendanceForSelectedDate.status === "present" ? "حاضر" : "غائب"}</strong></p>}<div className="attendance-list">{state.attendance.length === 0 ? <span className="notification-empty">لم تسجل أيامًا بعد.</span> : state.attendance.map(item => <div className="attendance-row" key={item.id}><span className={`attendance-status ${item.status}`}>{item.status === "present" ? "حاضر" : "غائب"}</span><strong>{formatAttendanceDate(item.date)}</strong>{item.note && <small>{item.note}</small>}<button type="button" className="delete-card" onClick={() => deleteAttendance(item.id)} aria-label="حذف سجل الحضور"><Trash2 size={14}/></button></div>)}</div></section><section className="school-grid">{state.school.length === 0 ? <div className="empty-state"><div className="empty-icon">📚</div><h3>مساحة دراستك جاهزة</h3><p>أضف أول مادة أو واجب حتى يظهر هنا.</p><Button onClick={() => setAddingSchool(true)}><Plus size={16}/> إضافة مادة</Button></div> : state.school.map(item => <article className={`school-card ${item.done ? "is-done" : ""}`} key={item.id}><div className="school-card-top"><span className="subject-pill">{item.subject}</span><label className="checkbox-wrap"><input type="checkbox" checked={item.done} onChange={() => update(previous => ({ ...previous, school: previous.school.map(row => row.id === item.id ? {...row, done: !row.done} : row) }))}/><span className="checkmark"><Check size={13}/></span></label></div><h3>{item.task}</h3><div className="school-details">{item.recitation && <span>🗣️ {item.recitation}</span>}{item.homework && <span>📝 {item.homework}</span>}{item.details && <span>✦ {item.details}</span>}</div>{item.due && <footer><Clock3 size={14}/> التسليم: {item.due} <button type="button" onClick={() => openSystemAlarm(`📚 ${item.subject}: ${item.task}`, item.due)} aria-label="ضبط منبه مهمة المدرسة" title="فتح منبه الجهاز"><AlarmClock size={14}/></button></footer>}<button className="delete-card" onClick={() => update(previous => ({...previous, school: previous.school.filter(row => row.id !== item.id)}))}><Trash2 size={15}/></button></article>)}</section></div>;

  const NotesPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><StickyNote size={15}/> أفكارك في مكانها</div><h1>📝 الملاحظات الملونة</h1><p>مساحة خفيفة للأهداف والأفكار والتذكيرات واللحظات الجميلة.</p></div><Button className="accent-button" onClick={() => update(previous => ({ ...previous, notes: [...previous.notes, {id: `note-${Date.now()}`, type: "idea", text: "ملاحظة جديدة..."}] }))}><Plus size={16}/> ملاحظة جديدة</Button></section><section className="note-grid">{state.notes.map(note => { const meta = { goal: ["🎯", "أهداف اليوم"], idea: ["💡", "أفكار"], reminder: ["📌", "تذكيرات"], good: ["❤️", "شيء جميل اليوم"] }[note.type]; return <article className={`sticky sticky-${note.type}`} key={note.id}><div className="sticky-header"><span>{meta[0]} {meta[1]}</span><button onClick={() => update(previous => ({...previous, notes: previous.notes.filter(item => item.id !== note.id)}))}><Trash2 size={14}/></button></div><textarea value={note.text} onChange={e => update(previous => ({...previous, notes: previous.notes.map(item => item.id === note.id ? {...item, text: e.target.value} : item)}))} aria-label={meta[1]} /><div className="sticky-footer"><span>يُحفظ تلقائيًا</span><MoreHorizontal size={16}/></div></article>})}</section></div>;

  const StatsPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><BarChart3 size={15}/> التفاصيل المهمة</div><h1>📊 الإحصائيات</h1><p>أرقام واضحة لتعرف أين وصل يومك وأسبوعك.</p></div></section><section className="stats-grid"><article className="metric-card featured"><div><span>نسبة إنجاز اليوم</span><strong>{completion}%</strong><p>المهام والصلوات معًا</p></div><ProgressRing value={completion} size={104}/></article><article className="metric-card"><span className="metric-icon blue"><Check size={19}/></span><strong>{taskDone}</strong><p>المهام المكتملة</p></article><article className="metric-card"><span className="metric-icon violet"><Clock3 size={19}/></span><strong>{state.tasks.length - taskDone}</strong><p>مهام متبقية</p></article><article className="metric-card"><span className="metric-icon gold"><Moon size={19}/></span><strong>{prayerDone} / 5</strong><p>صلوات مكتملة</p></article><article className="metric-card"><span className="metric-icon rose"><BookOpen size={19}/></span><strong>{schoolDone}</strong><p>واجبات مكتملة</p></article></section><section className="analytics-row"><article className="panel chart-panel"><SectionTitle icon={TrendingUp} title="إنجاز الأسبوع"/><div className="chart-bars">{[...state.week.slice(0, 6), {id: "today", short: "ي", label: "اليوم", progress: completion, status: "pending" as const}].map(day => <div key={day.id}><i style={{height: `${Math.max(day.progress, 5)}%`}}/><span>{day.short}</span></div>)}</div></article><article className="panel best-day"><span className="sparkle-wrap"><Sparkles size={20}/></span><div><p>أفضل يوم خلال الأسبوع</p><strong>{bestDay.label}</strong><span>{bestDay.progress}% إنجاز</span></div></article></section></div>;

  const SettingsPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><Settings2 size={15}/> خصّص تجربتك</div><h1>⚙️ الإعدادات</h1><p>تعديلات بسيطة حتى يعمل المخطط على طريقتك.</p></div>{updateAvailable && <button type="button" className="update-app-button" onClick={updateApp}>تحديث التطبيق الآن</button>}</section><section className="settings-grid"><article className="panel settings-card"><h3>اللغة</h3><div className="segmented">{(["ar", "tr", "en"] as Language[]).map(language => <button key={language} className={state.settings.language === language ? "active" : ""} onClick={() => update(previous => ({...previous, settings: {...previous.settings, language}}))}>{language === "ar" ? "العربية" : language === "tr" ? "Türkçe" : "English"}</button>)}</div></article><article className="panel settings-card"><h3>المظهر</h3><div className="theme-options">{([['dark','داكن','🌙'],['light','فاتح','☀️'],['pink','زهري','🌸'],['purple','بنفسجي','💜'],['green','أخضر','🌿'],['orange','برتقالي','🍊'],['red','أحمر','❤️'],['cyan','سماوي','💧'],['gold','ذهبي','✨']] as [AppTheme,string,string][]).map(([theme,label,icon]) => <button key={theme} className={state.settings.theme === theme ? `active theme-swatch ${theme}` : `theme-swatch ${theme}`} onClick={() => update(previous => ({...previous, settings: {...previous.settings, theme}}))}><span>{icon}</span>{label}</button>)}</div></article><article className="panel settings-card visual-settings-card"><h3>تأثيرات الواجهة</h3><label className="task-reminder-setting"><input type="checkbox" checked={state.settings.glassEffects} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, glassEffects: event.target.checked } }))}/><span>تفعيل تأثير Liquid Glass</span></label><label className="task-reminder-setting"><input type="checkbox" checked={state.settings.animatedBackground} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, animatedBackground: event.target.checked } }))}/><span>خلفية متحركة هادئة</span></label><p className="visual-setting-hint">يمكنك إيقاف الزجاج أو الحركة في أي وقت لتحسين الأداء.</p></article><article className="panel settings-card schedule-card"><h3>أوقات اليوم</h3><label className="task-reminder-setting"><input type="checkbox" checked={state.settings.prayerAlerts} onChange={event => update(previous => ({ ...previous, settings: { ...previous.settings, prayerAlerts: event.target.checked } }))}/><span>تنبيه عند دخول وقت الصلاة</span></label><label>وقت الاستيقاظ <input type="time" value={state.settings.wake} onChange={e => update(previous => ({...previous, settings: {...previous.settings, wake: e.target.value}}))}/></label><label>وقت النوم <input type="time" value={state.settings.sleep} onChange={e => update(previous => ({...previous, settings: {...previous.settings, sleep: e.target.value}}))}/></label><label>وقت المدرسة <input value={state.settings.school} onChange={e => update(previous => ({...previous, settings: {...previous.settings, school: e.target.value}}))}/></label><label className="task-reminder-setting"><input type="checkbox" checked={state.settings.taskReminders !== false} onChange={e => update(previous => ({...previous, settings: {...previous.settings, taskReminders: e.target.checked}}))}/><span>إشعار عند حلول وقت كل مهمة</span></label><div className="sound-setting"><label>صوت الإشعار<select value={state.settings.notificationSound} onChange={e => update(previous => ({ ...previous, settings: { ...previous.settings, notificationSound: e.target.value as NotificationSound } }))}><option value="soft">ناعم</option><option value="bell">جرس</option><option value="digital">رقمي</option><option value="silent">بدون صوت</option></select></label><button type="button" className="sound-test-button" onClick={() => playNotificationSound(state.settings.notificationSound)}>تجربة الصوت</button></div></article><article className="panel settings-card cloud-card"><div><span className="metric-icon blue"><CloudIcon /></span><h3>{t.cloud}</h3><p>{isAuthenticated ? (saveRemote.isPending ? "جارٍ حفظ آخر التعديلات…" : "تتم مزامنة خطتك تلقائيًا وبشكل خاص.") : "تُحفظ خطتك على هذا الجهاز. سجّل الدخول للمزامنة."}</p></div>{isAuthenticated ? <Button variant="outline" onClick={handleLogout}><LogOut size={16}/> تسجيل الخروج</Button> : !loading && <Button onClick={() => window.location.href = "/login"}><LogIn size={16}/>{t.signIn}</Button>}</article><article className="panel settings-card notifications-card"><div className="settings-card-heading"><div><span className="metric-icon blue"><BellRing size={18}/></span><h3>التذكيرات المخصصة</h3></div><span className="permission-pill">{notificationPermission === "granted" ? "إشعارات المتصفح مفعلة" : "داخل الموقع فقط"}</span></div><p>أنشئ تنبيهًا بعنوان ووقت محدد. سيظهر داخل التطبيق، ويمكن إرساله أيضًا كإشعار للمتصفح.</p><div className="notification-form"><input placeholder="عنوان التنبيه *" value={newNotification.title} onChange={e => setNewNotification({...newNotification, title: e.target.value})}/><input placeholder="رسالة قصيرة" value={newNotification.message} onChange={e => setNewNotification({...newNotification, message: e.target.value})}/><input type="time" aria-label="وقت التنبيه" value={newNotification.time} onChange={e => setNewNotification({...newNotification, time: e.target.value})}/><Button onClick={addNotification}><Plus size={15}/> إضافة</Button></div>{notificationPermission !== "granted" && typeof Notification !== "undefined" && <button type="button" className="permission-button" onClick={requestNotificationPermission}><Bell size={15}/> تفعيل إشعارات المتصفح</button>}<div className="notification-list">{state.notifications.length === 0 ? <span className="notification-empty">لا توجد تذكيرات بعد.</span> : state.notifications.map(item => <div className={`notification-row ${item.enabled ? "" : "disabled"}`} key={item.id}><button type="button" className="notification-toggle" onClick={() => update(previous => ({...previous, notifications: previous.notifications.map(row => row.id === item.id ? {...row, enabled: !row.enabled} : row)}))} aria-label="تفعيل أو تعطيل التذكير"><span className="notification-dot"><Bell size={13}/></span></button><div><strong>{item.title}</strong><small>{item.time}{item.message ? ` · ${item.message}` : ""}</small></div><button type="button" onClick={() => openSystemAlarm(item.title, item.time)} aria-label="ضبط منبه النظام للتذكير" title="فتح منبه الجهاز"><AlarmClock size={14}/></button><button type="button" className="notification-delete" onClick={() => update(previous => ({...previous, notifications: previous.notifications.filter(row => row.id !== item.id)}))} aria-label="حذف التذكير"><Trash2 size={14}/></button></div>)}</div></article><article className="panel settings-card danger-card"><h3>إعادة الضبط</h3><p>استخدم هذه الخيارات لبدء صفحة جديدة.</p><div><Button variant="outline" onClick={resetToday}>إعادة ضبط اليوم</Button><Button variant="outline" onClick={resetWeek}>إعادة ضبط الأسبوع</Button></div></article></section></div>;

  const HistoryPage = () => <div className="page-stack"><section className="page-header"><div><div className="eyebrow"><History size={15}/> تقويم الإنجاز</div><h1>🗓️ سجل أي يوم</h1><p>اختر أي تاريخ سابق، حتى لو لم تفتح التطبيق فيه، وسجّل علامات الصح يدويًا.</p></div><strong className="stat-chip">{state.history.length} يوم محفوظ</strong></section><section className="panel history-picker"><label>اختر التاريخ <input type="date" max={getLocalDateKey()} value={selectedHistoryDate} onChange={e => openHistoryDate(e.target.value)} /></label><Button type="button" onClick={saveHistoryDraft} disabled={!historyDraft}>حفظ جدول هذا اليوم</Button><Button type="button" variant="outline" disabled={!historyDraft} onClick={applyHistoryDay}><History size={16}/> تطبيق الصح على جدول اليوم</Button><p>مثال: اختر 2026-09-08 ثم علّم المهام التي أنجزتها في ذلك اليوم. يمكنك تعديل أي تاريخ سابق حتى لو لم يكن محفوظًا.</p></section>{historyDraft && <section className="panel history-editor"><div className="history-editor-title"><h2>{formatAttendanceDate(historyDraft.date)}</h2><span>اضغط على المربعات لإضافة أو إزالة الصح</span></div><div className="history-edit-grid">{historyDraft.tasks.map(task => <label className={`history-edit-task ${task.done ? "done" : ""}`} key={task.id}><input type="checkbox" checked={task.done} onChange={e => setHistoryDraft(previous => previous ? { ...previous, tasks: previous.tasks.map(item => item.id === task.id ? { ...item, done: e.target.checked } : item) } : previous)} /><span>{task.icon}</span><strong>{task.title}</strong><time>{task.time}</time></label>)}</div><div className="history-prayer-edit"><strong>الصلوات</strong>{Object.entries(historyDraft.prayers).map(([prayer, done]) => <label key={prayer}><input type="checkbox" checked={done} onChange={e => setHistoryDraft(previous => previous ? { ...previous, prayers: { ...previous.prayers, [prayer]: e.target.checked } } : previous)} />{prayer}</label>)}</div></section>}{state.history.length === 0 ? <section className="panel empty-state history-empty"><div className="empty-icon">🗓️</div><h3>ابدأ باختيار أي تاريخ</h3><p>لا تحتاج إلى انتظار مرور اليوم؛ يمكنك تسجيل الأيام السابقة يدويًا.</p></section> : <section className="history-list">{state.history.map(day => { const done = day.tasks.filter(task => task.done).length; const prayers = Object.values(day.prayers).filter(Boolean).length; return <article className="panel history-card" key={day.id} onClick={() => openHistoryDate(day.date)}><div className="history-card-header"><div><h2>{formatAttendanceDate(day.date)}</h2><p>{done} من {day.tasks.length} مهمة مكتملة · {prayers} من 5 صلوات</p></div><span className="history-percent">{day.tasks.length ? Math.round((done / day.tasks.length) * 100) : 0}%</span></div></article>; })}</section>}</div>;

  const skipOnboarding = () => { try { localStorage.setItem("roni-planner-onboarding-complete", "1"); } catch {} setShowOnboarding(false); };
  const OnboardingModal = () => <div className="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><section className="onboarding-card"><div className="onboarding-glow"/><span className="onboarding-kicker">RONI Planner</span><h2 id="onboarding-title">لنرتّب يومك بطريقة تناسبك</h2><p>أجب عن أسئلة سريعة، وسننشئ جدولك الأول تلقائيًا. يمكنك تعديل كل مهمة لاحقًا.</p><div className="onboarding-grid"><label>متى تصحى؟<input type="time" value={onboardingProfile.wake} onChange={event => setOnboardingProfile(previous => ({ ...previous, wake: event.target.value }))}/></label><label>متى تنام؟<input type="time" value={onboardingProfile.sleep} onChange={event => setOnboardingProfile(previous => ({ ...previous, sleep: event.target.value }))}/></label><label>الفطور<input type="time" value={onboardingProfile.breakfast} onChange={event => setOnboardingProfile(previous => ({ ...previous, breakfast: event.target.value }))}/></label><label>الغداء<input type="time" value={onboardingProfile.lunch} onChange={event => setOnboardingProfile(previous => ({ ...previous, lunch: event.target.value }))}/></label><label>العشاء<input type="time" value={onboardingProfile.dinner} onChange={event => setOnboardingProfile(previous => ({ ...previous, dinner: event.target.value }))}/></label><label>نوع يومك<select value={onboardingProfile.activity} onChange={event => setOnboardingProfile(previous => ({ ...previous, activity: event.target.value as OnboardingProfile["activity"] }))}><option value="school">مدرسة</option><option value="university">جامعة</option><option value="work">عمل</option></select></label><label>اسم المكان أو الدوام<input value={onboardingProfile.activityName} onChange={event => setOnboardingProfile(previous => ({ ...previous, activityName: event.target.value }))} placeholder="مثال: مدرستي"/></label><label>من الساعة<input type="time" value={onboardingProfile.activityStart} onChange={event => setOnboardingProfile(previous => ({ ...previous, activityStart: event.target.value }))}/></label><label>إلى الساعة<input type="time" value={onboardingProfile.activityEnd} onChange={event => setOnboardingProfile(previous => ({ ...previous, activityEnd: event.target.value }))}/></label></div><div className="onboarding-actions"><button type="button" className="onboarding-skip" onClick={skipOnboarding}>تخطي الآن</button><button type="button" className="onboarding-save" onClick={finishOnboarding}>إنشاء جدولي</button></div></section></div>;
  const renderPage = () => ({ today: TodayPage(), muslim: MuslimPage(), week: WeekPage(), school: SchoolPage(), notes: NotesPage(), stats: StatsPage(), history: HistoryPage(), settings: SettingsPage() })[page];

  return <div className={`planner-shell ${state.settings.theme} ${state.settings.glassEffects ? "glass-enabled" : "glass-disabled"} ${state.settings.animatedBackground ? "animated-background" : ""}`} dir={state.settings.language === "ar" ? "rtl" : "ltr"}>{showOnboarding && <OnboardingModal />}<>{activeAlert && <div className="notification-alert" role="status"><span className="notification-alert-icon"><BellRing size={18}/></span><div><strong>{activeAlert.title}</strong><p>{activeAlert.message || "حان وقت التذكير"}</p></div><button type="button" onClick={() => setActiveAlert(null)} aria-label="إغلاق التنبيه">×</button></div>}</><aside className="sidebar"><div className="brand"><span className="brand-mark">R</span><div><strong>RONI</strong><small>PLANNER</small></div></div><nav>{navItems.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={page === item.id ? "active" : ""} aria-current={page === item.id ? "page" : undefined} onClick={() => changePage(item.id)}><Icon size={18}/><span>{t[item.key as keyof typeof t]}</span></button>; })}</nav><div className="sidebar-bottom"><div className="tiny-progress"><span>تقدم اليوم</span><strong>{completion}%</strong><i><b style={{width: `${completion}%`}}/></i></div><div className="profile-line"><span>{user?.name?.slice(0,1).toUpperCase() || "R"}</span><div><strong>{user?.name || "RONI Planner"}</strong><small>{isAuthenticated ? "تمت المزامنة" : "محفوظ على الجهاز"}</small></div></div></div></aside><main className="app-main"><header className="mobile-header"><div className="brand"><span className="brand-mark">R</span><strong>RONI</strong></div><button type="button" onClick={() => changePage("settings")}><Settings2 size={19}/></button></header><div className="content-wrap">{canInstall && <button type="button" className="install-app-button" onClick={installApp}><Download size={16}/> تثبيت التطبيق</button>}{renderPage()}</div></main><nav className="mobile-nav">{navItems.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={page === item.id ? "active" : ""} aria-current={page === item.id ? "page" : undefined} onClick={() => changePage(item.id)}><Icon size={18}/><span>{t[item.key as keyof typeof t]}</span></button>; })}</nav></div>;
}

function CloudIcon() { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9.02A5.5 5.5 0 1 1 17.5 19Z"/></svg>; }
