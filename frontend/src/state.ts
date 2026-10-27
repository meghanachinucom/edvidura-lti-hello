/**
 * EdVidura Application State Management (Pure Vanilla JS / TS)
 */

import type { LiveCat } from './api';

export type UserRole = 'student' | 'teacher' | 'admin';

export type ScreenId =
  | 'student-home'
  | 'lessons'
  | 'lesson-detail'
  | 'quiz'
  | 'quiz-results'
  | 'prerequisite-gate'
  | 'manuals'
  | 'manual-reader'
  | 'ask-vidura'
  | 'my-progress'
  | 'home-shell'
  | 'teacher-results'
  | 'teacher-diagnostics'
  | 'admin-overview'
  | 'xr-store'
  | 'pravachana-home'
  | 'pravachana-player'
  | 'pravachana-dept';

export interface DiscussionNote {
  id: string;
  author: string;
  role: 'teacher' | 'student' | 'ai' | 'you';
  avatarInitials: string;
  timeAgo: string;
  content: string;
  isPrivate?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'vidura';
  author: string;
  time: string;
  badge?: string;
  text?: string;
  mathBlocks?: { step: number; title: string; equation: string }[];
  summaryCallout?: string;
  citations?: { label: string; ref: string }[];
  isRefusal?: boolean;
  refusalTitle?: string;
  refusalExplanation?: string;
  suggestedInquiries?: string[];
  isThinking?: boolean;
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  attempts: number;
  scorePercent: number | null;
  scorePoints: string;
  status: 'queued' | 'synced' | 'needs-review' | 'pending';
  syncTime: string;
}

export type AdminTab = 'governance' | 'teachers' | 'sections' | 'roster' | 'keys' | 'lms-integrations';

// =========================================================================
// MODULE 1 & 4: xAPI & Analytics Types
// =========================================================================
export interface XApiStatement {
  id: string;
  timestamp: string;
  actor: { name: string; mbox: string; role: string; avatarUrl?: string };
  verb: { id: string; display: 'experienced' | 'attempted' | 'interacted' | 'answered' | 'completed' | 'passed' | 'failed' };
  object: { id: string; definition: { name: string; type: string } };
  result?: { score?: { raw: number; min: number; max: number; scaled: number }; success?: boolean; completion?: boolean; response?: string; duration?: string };
  context?: { registration: string; platform: string };
}

// =========================================================================
// MODULE 3: LMS Integrations & Grade Passback Types
// =========================================================================
export interface LmsConnection {
  id: string;
  platform: 'moodle' | 'canvas' | 'springwe';
  name: string;
  endpointUrl: string;
  clientId: string;
  deploymentId: string;
  authLoginUrl: string;
  keysetUrl: string;
  status: 'connected' | 'testing' | 'error';
  lastSync: string;
  autoSyncIntervalMinutes: number;
  latencyMs: number;
}

export interface GradePassbackLog {
  id: string;
  timestamp: string;
  lms: 'moodle' | 'canvas' | 'springwe';
  studentName: string;
  assignmentName: string;
  scoreGiven: number;
  scoreMax: number;
  status: 'success' | 'queued' | 'failed';
  httpStatus: number;
  message: string;
}

// =========================================================================
// MODULE 5 & 7: Competencies & Difference Training Types
// =========================================================================
export interface CompetencyItem {
  id: string;
  code: string;
  name: string;
  domain: string;
  level: 'novice' | 'developing' | 'proficient' | 'advanced';
  score: number; // 0 - 100
  targetScore: number; // 0 - 100
  gap: number; // target - score
  evidenceCount: number;
  evidenceItems: { id: string; title: string; type: 'quiz' | 'lab' | 'drill'; score: string; date: string }[];
  remediationTitle?: string;
  remediationHours?: number;
}

// =========================================================================
// MODULE 6: DCT Content Authoring & Lesson Planner Types
// =========================================================================
export interface AuthoringLesson {
  id: string;
  num: string;
  title: string;
  durationMinutes: number;
  status: 'published' | 'draft' | 'in-review';
  objectives: { id: string; text: string; standard: string; taxonomy: 'Recall' | 'Apply' | 'Analyze' | 'Evaluate' }[];
  resources: { id: string; title: string; type: 'pdf' | 'lab3d' | 'geogebra' | 'video'; url: string }[];
  prerequisites: string[];
  updatedAt: string;
}

// =========================================================================
// MODULE 8: Interactive eBook Types
// =========================================================================
export interface BookBookmark {
  id: string;
  chapterId: string;
  chapterTitle: string;
  page: number;
  title: string;
  note: string;
  createdAt: string;
}

export interface BookHighlight {
  id: string;
  chapterId: string;
  text: string;
  color: 'yellow' | 'green' | 'coral';
  createdAt: string;
}

export interface BookChapter {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  readingTime: string;
  sections: { id: string; title: string; page: number }[];
}

// =========================================================================
// MODULE 9: Personalised Learning Engine Types
// =========================================================================
export interface LearningGoal {
  id: string;
  title: string;
  targetScore: number;
  currentScore: number;
  deadline: string;
  category: string;
  completed: boolean;
}

export interface SuggestedActivity {
  id: string;
  title: string;
  type: 'lab' | 'quiz' | 'reading' | 'drill';
  estimatedMinutes: number;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  actionScreen: ScreenId;
}

// =========================================================================
// MODULE 10: SME Chatbot & Ingestion Types
// =========================================================================
export interface IngestedDocument {
  id: string;
  filename: string;
  title: string;
  fileSize: string;
  chunkCount: number;
  indexingStatus: 'indexed' | 'indexing' | 'error';
  permission: 'public' | 'students' | 'faculty';
  uploadedAt: string;
  summary: string;
}

export interface CitationModalData {
  isOpen: boolean;
  docTitle: string;
  chapter: string;
  page: number;
  snippet: string;
  standard: string;
}

// =========================================================================
// MODULE 11: XR Store Types
// =========================================================================
export interface XrApp {
  id: string;
  name: string;
  tagline: string;
  category: 'spatial-math' | 'physics-lab' | 'geometry-ar' | 'simulations';
  version: string;
  size: string;
  rating: number;
  reviewsCount: number;
  icon: string;
  accentColor: string;
  heroImage: string;
  compatibility: {
    webxr: boolean;
    appleVisionPro: boolean;
    metaQuest: boolean;
    desktopWebgl: boolean;
    mobileAr: boolean;
  };
  description: string;
  curriculumStandards: string[];
  hardwareRequirements: string;
  developer: string;
  featured?: boolean;
}

export interface FacultyMember {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  avatarUrl: string;
  sectionsCount: number;
  studentsCount: number;
  ssoStatus: 'active' | 'synced';
  courses: string[];
}

export interface SectionItem {
  id: string;
  name: string;
  courseCode: string;
  period: string;
  timeSlot: string;
  teacherName: string;
  teacherAvatar: string;
  room: string;
  enrolled: number;
  maxSeats: number;
  moodleId: string;
  syncStatus: 'synced' | 'pending';
}

export interface AppState {
  role: UserRole;
  screen: ScreenId;
  adminTab: AdminTab;
  quizAnswers: Record<string, string>;
  quizSubmitted: boolean;
  quizScore: { correct: number; total: number; percent: number };
  manualFontScaleIndex: number;
  manualNotesOpen: boolean;
  manualFocusMode: boolean;
  manualActiveChapterId: string;
  manualReadingProgress: number; // 0 - 100
  discussions: DiscussionNote[];
  bookmarks: BookBookmark[];
  highlights: BookHighlight[];
  chatMessages: ChatMessage[];
  chatLanguage: string;
  locale: string;
  citationsOpen: boolean;
  isVoiceRecording: boolean;
  teacherSearchQuery: string;
  teacherFilter: 'all' | 'needs-review' | 'pending' | 'synced';
  assignedLanes: Set<string>;
  mobileMenuOpen: boolean;
  screenPickerOpen: boolean;
  activeDialog: string | null;
  // Module 1 & 4 State
  diagnosticsTab: 'misconceptions' | 'heatmaps' | 'xapi' | 'difference';
  diagnosticsTimeFilter: '24h' | '7d' | '30d' | 'semester';
  diagnosticsSeriesLearner: string;
  xapiVerbFilter: string;
  selectedXapiStatement: XApiStatement | null;
  // Module 3 State
  activeLmsPlatform: 'moodle' | 'canvas' | 'springwe';
  selectedLmsConnection: LmsConnection | null;
  // Module 5 & 7 & 9 Progress State
  progressActiveTab: 'roadmap' | 'competencies' | 'difference' | 'goals';
  // Module 6 Authoring State
  authoringPlannerOpen: boolean;
  editingLesson: AuthoringLesson | null;
  // Module 10 SME RAG State
  ingestionModalOpen: boolean;
  citationModal: CitationModalData;
  // Module 11 XR State
  xrSelectedApp: XrApp | null;
  xrActiveSimulation: XrApp | null;
  xrCategoryFilter: string;
  connected: boolean;
  apiError: string | null;
  learnerName: string;
  classLabel: string;
  liveCourseTitle: string;
  liveSession: Record<string, unknown> | null;
  liveLessons: Array<{
    id: string;
    slug: string;
    title: string;
    position: number;
    lesson_type: string;
    status: string;
    completed: boolean;
    video_url?: string | null;
    body_html?: string;
  }>;
  liveProgress: {
    percent: number;
    completed_count: number;
    total_count: number;
    all_lessons_done: boolean;
    completed_ids: string[];
    lessons: AppState['liveLessons'];
    next_lesson: AppState['liveLessons'][number] | null;
    course?: { id: string; slug: string; title: string } | null;
  } | null;
  liveManuals: Array<{ id: string; slug: string; title: string; description: string; status?: string }>;
  liveManualDetail: {
    id: string;
    title: string;
    body_html: string;
    toc: Array<{ id?: string; title?: string; slug?: string }>;
  } | null;
  liveLessonDetail: AppState['liveLessons'][number] | null;
  liveQuizQuestions: Array<{
    id: string;
    num: string;
    type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'essay' | 'multi';
    title: string;
    pts: string;
    question: string;
    placeholder?: string;
    choices?: { key: string; text: string; isMono?: boolean }[];
    correct?: string;
  }>;
  liveQuizPractice: boolean;
  liveQuizQuota: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  } | null;
  liveQuizAssignment: {
    group_id?: string;
    group_name?: string;
    title?: string;
  } | null;
  liveQuizCanSubmit: boolean;
  liveQuizBlocked: string;
  liveCat: LiveCat | null;
  liveAssignmentDash: {
    assignments?: Array<{ group_name?: string; title?: string; activity_type?: string }>;
    learners?: Array<{
      subject?: string;
      name?: string;
      quota?: { used?: number; remaining?: number; limit?: number };
      assignments?: Array<{ title?: string; group_name?: string }>;
    }>;
    learner_count?: number;
  } | null;
  liveBankItems: Array<{ id: string; prompt: string; qtype?: string; topic?: string; status?: string }>;
  liveBankCount: number;
  bankDraft: {
    questions: Array<{ prompt: string; choices?: string[]; qtype?: string; topic?: string }>;
    bank_size: number;
    batch?: { id: string; item_count: number } | null;
  } | null;
  liveGroups: Array<{ group_id: string; name: string; member_count: number; source: string }>;
  liveGroupAssignments: Array<{ group_id: string; group_name: string; title: string; activity_type: string }>;
  gsAvailable: boolean;
  liveAttempts: StudentRow[];
  quizReview: Record<string, { prompt?: string; correct?: boolean; chosen?: number }>;
  activeLessonId: string | null;
  activeManualId: string | null;
  pravachanaPack: 'all' | 'public' | 'no_bag_day' | 'library_hour';
  pravachanaQuery: string;
  pravachanaTheatre: boolean;
  livePravachanas: {
    featured: import('./api').PravachanaEpisode | null;
    series: import('./api').PravachanaSeries[];
    episodes: import('./api').PravachanaEpisode[];
    mine: {
      completed_count: number;
      total_count: number;
      percent: number;
      recent: Array<{
        episode_id: string;
        title_te: string;
        title_en: string;
        cover_url: string;
        completed: boolean;
        position_sec: number;
        duration_sec: number;
      }>;
    } | null;
  };
  livePravachanaDetail: import('./api').PravachanaEpisode | null;
  livePravachanaNotes: import('./api').PravachanaNote[];
  livePravachanaStats: {
    episodes: number;
    watches: number;
    completed: number;
    viewers: number;
    by_episode: Array<{
      id: string;
      title_te: string;
      title_en: string;
      pack: string;
      featured: boolean;
      plays: number;
      viewers: number;
      completed: number;
    }>;
  } | null;
  liveAnalytics: import('./api').LiveAnalytics | null;
  livePlan: import('./api').LivePlan | null;
}

const initialStudents: StudentRow[] = [
  { id: '1', name: 'Lakshmi Reddy', email: 'lakshmi.reddy@zphs.vijayawada.edu.in', initials: 'LR', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', attempts: 3, scorePercent: 67, scorePoints: '4/6', status: 'queued', syncTime: 'Queued' },
  { id: '2', name: 'Sai Teja', email: 'sai.teja@zphs.vijayawada.edu.in', initials: 'ST', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', attempts: 2, scorePercent: 83, scorePoints: '5/6', status: 'synced', syncTime: 'Synced · 12m ago' },
  { id: '3', name: 'Priya Sharma', email: 'priya.sharma@zphs.vijayawada.edu.in', initials: 'PS', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', attempts: 1, scorePercent: 100, scorePoints: '6/6', status: 'synced', syncTime: 'Synced · 1h ago' },
  { id: '4', name: 'Venkat Naidu', email: 'venkat.naidu@zphs.vijayawada.edu.in', initials: 'VN', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', attempts: 4, scorePercent: 50, scorePoints: '3/6', status: 'needs-review', syncTime: 'Needs Review' },
  { id: '5', name: 'Sravani', email: 'sravani@zphs.vijayawada.edu.in', initials: 'SR', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80', attempts: 2, scorePercent: 83, scorePoints: '5/6', status: 'synced', syncTime: 'Synced · 2h ago' },
  { id: '6', name: 'Ravi Kiran', email: 'ravi.kiran@zphs.vijayawada.edu.in', initials: 'RK', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80', attempts: 1, scorePercent: 67, scorePoints: '4/6', status: 'synced', syncTime: 'Synced · 3h ago' },
  { id: '7', name: 'Bhavana', email: 'bhavana@zphs.vijayawada.edu.in', initials: 'BH', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80', attempts: 3, scorePercent: 100, scorePoints: '6/6', status: 'synced', syncTime: 'Synced · 4h ago' },
  { id: '8', name: 'Karthik', email: 'karthik@zphs.vijayawada.edu.in', initials: 'KA', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80', attempts: 0, scorePercent: null, scorePoints: '—', status: 'pending', syncTime: 'Pending submission' },
  { id: '9', name: 'Divya Sri', email: 'divya.sri@zphs.vijayawada.edu.in', initials: 'DS', avatarUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=120&q=80', attempts: 2, scorePercent: 83, scorePoints: '5/6', status: 'synced', syncTime: 'Synced · 5h ago' },
  { id: '10', name: 'Naveen Kumar', email: 'naveen.kumar@zphs.vijayawada.edu.in', initials: 'NK', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80', attempts: 1, scorePercent: 67, scorePoints: '4/6', status: 'synced', syncTime: 'Synced · 6h ago' },
  { id: '11', name: 'Charishma', email: 'charishma@zphs.vijayawada.edu.in', initials: 'CH', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80', attempts: 2, scorePercent: 100, scorePoints: '6/6', status: 'synced', syncTime: 'Synced · 6h ago' },
  { id: '12', name: 'Arjun Reddy', email: 'arjun.reddy@zphs.vijayawada.edu.in', initials: 'AR', avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80', attempts: 3, scorePercent: 83, scorePoints: '5/6', status: 'synced', syncTime: 'Synced · 7h ago' }
];

export const initialFaculty: FacultyMember[] = [
  {
    id: 'f1',
    name: 'Dr. Padmavathi Rao',
    title: 'Department Chair & Lead Instructor',
    department: 'Mathematics',
    email: 'emartinez@riverside.edu',
    phone: '(555) 342-8801',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 3,
    studentsCount: 85,
    ssoStatus: 'active',
    courses: ['Algebra I (Periods 1 & 2)', 'Honors Pre-Calculus']
  },
  {
    id: 'f2',
    name: 'Marcus Thorne',
    title: 'Senior Mathematics Instructor',
    department: 'Mathematics',
    email: 'mthorne@riverside.edu',
    phone: '(555) 342-8802',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 3,
    studentsCount: 84,
    ssoStatus: 'active',
    courses: ['Algebra I (Period 4)', 'Pre-Calculus (Period 5)', 'College Prep Math']
  },
  {
    id: 'f3',
    name: 'Dr. Aisha Reynolds',
    title: 'AP STEM Coordinator & Teacher',
    department: 'STEM & AP Sciences',
    email: 'areynolds@riverside.edu',
    phone: '(555) 342-8805',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 2,
    studentsCount: 48,
    ssoStatus: 'active',
    courses: ['AP Calculus AB (Period 3)', 'AP Calculus BC']
  },
  {
    id: 'f4',
    name: 'David Chen',
    title: 'Geometry & Robotics Faculty',
    department: 'Mathematics & Engineering',
    email: 'dchen@riverside.edu',
    phone: '(555) 342-8812',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 3,
    studentsCount: 76,
    ssoStatus: 'active',
    courses: ['Honors Geometry (Period 2)', 'Intro to Engineering', 'Robotics I']
  },
  {
    id: 'f5',
    name: 'Sarah Jenkins',
    title: 'Secondary Mathematics Educator',
    department: 'Mathematics',
    email: 'sjenkins@riverside.edu',
    phone: '(555) 342-8819',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 2,
    studentsCount: 57,
    ssoStatus: 'active',
    courses: ['Algebra I (Period 3)', 'AP Statistics']
  },
  {
    id: 'f6',
    name: 'Priya Nair',
    title: 'Physics & STEM Faculty',
    department: 'Sciences',
    email: 'pnair@riverside.edu',
    phone: '(555) 342-8824',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 2,
    studentsCount: 56,
    ssoStatus: 'active',
    courses: ['STEM Physics (Period 4)', 'Advanced Applied Mechanics']
  },
  {
    id: 'f7',
    name: 'Robert Morales',
    title: 'Integrated Math & Foundations',
    department: 'Mathematics',
    email: 'rmorales@riverside.edu',
    phone: '(555) 342-8833',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 2,
    studentsCount: 52,
    ssoStatus: 'active',
    courses: ['Foundations of Algebra', 'Integrated Math I']
  },
  {
    id: 'f8',
    name: 'James Wilson',
    title: 'Computer Science & Discrete Math',
    department: 'Computer Science',
    email: 'jwilson@riverside.edu',
    phone: '(555) 342-8840',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    sectionsCount: 2,
    studentsCount: 50,
    ssoStatus: 'active',
    courses: ['AP Computer Science A', 'Discrete Math Structures']
  }
];

export const initialSections: SectionItem[] = [
  {
    id: 'sec-1',
    name: 'Algebra I — Period 1',
    courseCode: 'MATH-101A',
    period: 'Period 1',
    timeSlot: '8:00 AM – 8:55 AM',
    teacherName: 'Dr. Elena Martinez',
    teacherAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    room: 'Room 204 (Cartesian Lab)',
    enrolled: 28,
    maxSeats: 30,
    moodleId: 'ALG1-P1-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-2',
    name: 'Algebra I — Period 2',
    courseCode: 'MATH-101B',
    period: 'Period 2',
    timeSlot: '9:00 AM – 9:55 AM',
    teacherName: 'Dr. Elena Martinez',
    teacherAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    room: 'Room 204 (Cartesian Lab)',
    enrolled: 30,
    maxSeats: 30,
    moodleId: 'ALG1-P2-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-3',
    name: 'Honors Geometry — Period 2',
    courseCode: 'MATH-201H',
    period: 'Period 2',
    timeSlot: '9:00 AM – 9:55 AM',
    teacherName: 'David Chen',
    teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    room: 'Room 301',
    enrolled: 26,
    maxSeats: 28,
    moodleId: 'GEOM-P2-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-4',
    name: 'Algebra I — Period 3',
    courseCode: 'MATH-101C',
    period: 'Period 3',
    timeSlot: '10:05 AM – 11:00 AM',
    teacherName: 'Sarah Jenkins',
    teacherAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    room: 'Room 208',
    enrolled: 27,
    maxSeats: 30,
    moodleId: 'ALG1-P3-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-5',
    name: 'AP Calculus AB — Period 3',
    courseCode: 'MATH-301AP',
    period: 'Period 3',
    timeSlot: '10:05 AM – 11:00 AM',
    teacherName: 'Dr. Aisha Reynolds',
    teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
    room: 'Room 310 (AP Studio)',
    enrolled: 24,
    maxSeats: 25,
    moodleId: 'CALC-P3-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-6',
    name: 'Algebra I — Period 4',
    courseCode: 'MATH-101D',
    period: 'Period 4',
    timeSlot: '11:05 AM – 12:00 PM',
    teacherName: 'Marcus Thorne',
    teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    room: 'Room 212',
    enrolled: 29,
    maxSeats: 30,
    moodleId: 'ALG1-P4-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-7',
    name: 'STEM Physics — Period 4',
    courseCode: 'SCI-204S',
    period: 'Period 4',
    timeSlot: '11:05 AM – 12:00 PM',
    teacherName: 'Priya Nair',
    teacherAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    room: 'Room 115 (Physics Lab)',
    enrolled: 28,
    maxSeats: 28,
    moodleId: 'PHYS-P4-2026',
    syncStatus: 'synced'
  },
  {
    id: 'sec-8',
    name: 'Pre-Calculus — Period 5',
    courseCode: 'MATH-205',
    period: 'Period 5',
    timeSlot: '12:45 PM – 1:40 PM',
    teacherName: 'Marcus Thorne',
    teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    room: 'Room 212',
    enrolled: 25,
    maxSeats: 28,
    moodleId: 'PRECALC-P5-2026',
    syncStatus: 'synced'
  }
];

export const state: AppState = {
  role: 'student',
  screen: 'student-home',
  adminTab: 'governance',
  quizAnswers: {
    q1: 'B',
    q2: 'C',
    q3: 'C',
    q4: 'A',
    q5: 'B',
    q6: 'B'
  },
  quizSubmitted: false,
  quizScore: { correct: 4, total: 6, percent: 67 },
  manualFontScaleIndex: 2, // 100%
  manualNotesOpen: false, // collapsed by default on laptop/tablet, toggled via Notes button or auto on desktop
  manualFocusMode: false, // distraction-free full-width reading on laptops
  discussions: [
    {
      id: 'd1',
      author: 'Dr. Martinez',
      role: 'teacher',
      avatarInitials: 'DM',
      timeAgo: 'Yesterday',
      content: "Review Exercise 4.2.4 before Friday's checkpoint quiz. Remember to simplify fractional slopes to canonical form."
    },
    {
      id: 'd2',
      author: 'Marcus Vance',
      role: 'student',
      avatarInitials: 'MV',
      timeAgo: '2h ago',
      content: 'Can we use decimal values for slope in Moodle quiz inputs or must it be a fraction?'
    },
    {
      id: 'd3',
      author: 'Vidura Assistant',
      role: 'ai',
      avatarInitials: 'EV',
      timeAgo: '1h ago',
      content: 'Moodle auto-evaluates exact simplified fractions (e.g., 3/2 instead of 1.5). Always verify the checkpoint instructions before submitting.'
    }
  ],
  chatMessages: [
    {
      id: 'm1',
      sender: 'student',
      author: 'Ada Chen',
      time: '10:14 AM',
      text: "How do I calculate the y-intercept if I'm only given two points like (2, 8) and (-4, -1)?"
    },
    {
      id: 'm2',
      sender: 'vidura',
      author: 'Vidura Academic Node',
      time: '10:14 AM',
      badge: 'Unit 2 Verified',
      text: 'To determine the y-intercept (b) from two coordinates, follow the two-step canonical slope-intercept method from Unit 2:',
      mathBlocks: [
        {
          step: 1,
          title: 'Compute the Slope (m):',
          equation: 'm = (y₂ - y₁) / (x₂ - x₁) = (-1 - 8) / (-4 - 2) = -9 / -6 = 3/2'
        },
        {
          step: 2,
          title: 'Substitute into Slope-Intercept Form (y = mx + b):',
          equation: '8 = (3/2)(2) + b  ⟹  8 = 3 + b  ⟹  b = 5'
        }
      ],
      summaryCallout: 'The resulting canonical equation is y = (3/2)x + 5, yielding the y-intercept at coordinate (0, 5).',
      citations: [
        { label: 'Lesson 03 · Graphs & Intercepts — Section 2.4', ref: 'lesson-detail' },
        { label: 'Algebra I Technical Guide — Chapter 4.2 (p. 112)', ref: 'manual-reader' }
      ]
    },
    {
      id: 'm3',
      sender: 'student',
      author: 'Ada Chen',
      time: '10:17 AM',
      text: 'Can you write an essay about the Roman Empire?'
    },
    {
      id: 'm4',
      sender: 'vidura',
      author: 'Vidura Academic Node',
      time: '10:17 AM',
      badge: 'Policy Active',
      isRefusal: true,
      refusalTitle: 'I can only help with this class.',
      refusalExplanation: "My instruction scope is strictly bound to the Riverside High Algebra I syllabus, textbook references, and Dr. Martinez's problem sets. Non-course topics such as classical history or general prose writing fall outside this study environment.",
      suggestedInquiries: [
        'Solving systems of linear equations via substitution or elimination',
        'Factoring quadratic expressions in canonical form ax² + bx + c = 0',
        "Clarifying homework problem 4B from Dr. Martinez's Lecture 04 notes"
      ]
    }
  ],
  chatLanguage: 'en-IN',
  locale: 'en-IN',
  citationsOpen: true,
  isVoiceRecording: false,
  teacherSearchQuery: '',
  teacherFilter: 'all',
  assignedLanes: new Set<string>(),
  mobileMenuOpen: false,
  screenPickerOpen: false,
  activeDialog: null,
  // Module 1 & 4 State
  diagnosticsTab: 'misconceptions',
  diagnosticsTimeFilter: '7d',
  diagnosticsSeriesLearner: 'class',
  xapiVerbFilter: 'all',
  selectedXapiStatement: null,
  // Module 3 State
  activeLmsPlatform: 'moodle',
  selectedLmsConnection: null,
  // Module 5 & 7 & 9 Progress State
  progressActiveTab: 'roadmap',
  // Module 6 Authoring State
  authoringPlannerOpen: false,
  editingLesson: null,
  // Module 8 eBook State
  manualActiveChapterId: 'ch4',
  manualReadingProgress: 42,
  bookmarks: [
    {
      id: 'bm1',
      chapterId: 'ch4',
      chapterTitle: 'Chapter 04: Slope Dynamics',
      page: 112,
      title: 'Canonical Slope Quotient Proof',
      note: 'Key formula m = (y2-y1)/(x2-x1) referenced in Quiz #1',
      createdAt: 'Oct 24, 2026'
    },
    {
      id: 'bm2',
      chapterId: 'ch4',
      chapterTitle: 'Chapter 04: Slope Dynamics',
      page: 118,
      title: 'Standard Form Conversion Warning',
      note: 'Remember to isolate -By with correct negative signs',
      createdAt: 'Oct 25, 2026'
    }
  ],
  highlights: [
    {
      id: 'hl1',
      chapterId: 'ch4',
      text: 'The slope m represents the constant rate of change along any non-vertical Cartesian vector.',
      color: 'yellow',
      createdAt: 'Oct 24, 2026'
    },
    {
      id: 'hl2',
      chapterId: 'ch4',
      text: 'Perpendicular lines have slopes that multiply to -1, creating opposite reciprocals.',
      color: 'coral',
      createdAt: 'Oct 25, 2026'
    }
  ],
  // Module 10 SME RAG State
  ingestionModalOpen: false,
  citationModal: {
    isOpen: false,
    docTitle: '',
    chapter: '',
    page: 0,
    snippet: '',
    standard: ''
  },
  // Module 11 XR State
  xrSelectedApp: null,
  xrActiveSimulation: null,
  xrCategoryFilter: 'all',
  connected: false,
  apiError: null,
  learnerName: '',
  classLabel: '',
  liveCourseTitle: '',
  liveSession: null,
  liveLessons: [],
  liveProgress: null,
  liveManuals: [],
  liveManualDetail: null,
  liveLessonDetail: null,
  liveQuizQuestions: [],
  liveQuizPractice: false,
  liveQuizQuota: null,
  liveQuizAssignment: null,
  liveQuizCanSubmit: true,
  liveQuizBlocked: '',
  liveCat: null,
  liveAssignmentDash: null,
  liveBankItems: [],
  liveBankCount: 0,
  bankDraft: null,
  liveGroups: [],
  liveGroupAssignments: [],
  gsAvailable: false,
  liveAttempts: [],
  quizReview: {},
  activeLessonId: null,
  activeManualId: null,
  pravachanaPack: 'all',
  pravachanaQuery: '',
  pravachanaTheatre: false,
  livePravachanas: { featured: null, series: [], episodes: [], mine: null },
  livePravachanaDetail: null,
  livePravachanaNotes: [],
  livePravachanaStats: null,
  liveAnalytics: null,
  livePlan: null,
};

// =========================================================================
// MODULE 1 & 4 DATA: xAPI Activity Stream & LRS
// =========================================================================
export const xapiStatementsList: XApiStatement[] = [
  {
    id: 'stmt-001',
    timestamp: '2026-10-26T12:38:12.420Z',
    actor: { name: 'Ada Chen', mbox: 'mailto:achen@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/answered', display: 'answered' },
    object: { id: 'https://edvidura.riverside.edu/xapi/quiz/checkpoint-2/q3', definition: { name: 'Checkpoint 2 — Question 03 (Standard Form Intercepts)', type: 'http://adlnet.gov/expapi/activities/cmi.interaction' } },
    result: { score: { raw: 0, min: 0, max: 1, scaled: 0 }, success: false, completion: true, response: 'choice_C' },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-002',
    timestamp: '2026-10-26T12:35:45.110Z',
    actor: { name: 'Marcus Vance', mbox: 'mailto:mvance@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: 'completed' },
    object: { id: 'https://edvidura.riverside.edu/xapi/lesson/03/cartesian-lab', definition: { name: 'Lesson 03 Cartesian Sandbox Studio', type: 'http://adlnet.gov/expapi/activities/simulation' } },
    result: { score: { raw: 100, min: 0, max: 100, scaled: 1.0 }, success: true, completion: true, duration: 'PT14M32S' },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-003',
    timestamp: '2026-10-26T12:31:02.880Z',
    actor: { name: 'Priya Patel', mbox: 'mailto:ppatel@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/passed', display: 'passed' },
    object: { id: 'https://edvidura.riverside.edu/xapi/quiz/checkpoint-2', definition: { name: 'Checkpoint 2: Graded Linear Equations Quiz', type: 'http://adlnet.gov/expapi/activities/assessment' } },
    result: { score: { raw: 6, min: 0, max: 6, scaled: 1.0 }, success: true, completion: true },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-004',
    timestamp: '2026-10-26T12:28:19.004Z',
    actor: { name: 'Liam O\'Connor', mbox: 'mailto:loconnor@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/interacted', display: 'interacted' },
    object: { id: 'https://edvidura.riverside.edu/xapi/lab/slope-vector-slider', definition: { name: 'Interactive Slope Parameter Slider (m = -2/7)', type: 'http://adlnet.gov/expapi/activities/interaction' } },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-005',
    timestamp: '2026-10-26T12:22:50.550Z',
    actor: { name: 'Sophia Rodriguez', mbox: 'mailto:srodriguez@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/attempted', display: 'attempted' },
    object: { id: 'https://edvidura.riverside.edu/xapi/quiz/checkpoint-2/q4', definition: { name: 'Checkpoint 2 — Question 04 (Perpendicular Slopes)', type: 'http://adlnet.gov/expapi/activities/cmi.interaction' } },
    result: { score: { raw: 1, min: 0, max: 1, scaled: 1.0 }, success: true, completion: true },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-006',
    timestamp: '2026-10-26T12:15:10.120Z',
    actor: { name: 'Jamal Washington', mbox: 'mailto:jwashington@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/experienced', display: 'experienced' },
    object: { id: 'https://edvidura.riverside.edu/xapi/manual/ch4-slope-dynamics', definition: { name: 'Technical Guide Chapter 04 Reading Desk', type: 'http://adlnet.gov/expapi/activities/media' } },
    result: { completion: true, duration: 'PT18M40S' },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-007',
    timestamp: '2026-10-26T12:08:33.400Z',
    actor: { name: 'Ada Chen', mbox: 'mailto:achen@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/interacted', display: 'interacted' },
    object: { id: 'https://edvidura.riverside.edu/xapi/ask-vidura/socratic-solver', definition: { name: 'Ask Vidura Socratic Solvers — Two-Point Slope Calculation', type: 'http://adlnet.gov/expapi/activities/ai-dialog' } },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-008',
    timestamp: '2026-10-26T11:58:20.910Z',
    actor: { name: 'Emma Watson-Bell', mbox: 'mailto:ewatson@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/passed', display: 'passed' },
    object: { id: 'https://edvidura.riverside.edu/xapi/quiz/checkpoint-2', definition: { name: 'Checkpoint 2: Graded Linear Equations Quiz', type: 'http://adlnet.gov/expapi/activities/assessment' } },
    result: { score: { raw: 6, min: 0, max: 6, scaled: 1.0 }, success: true, completion: true },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  },
  {
    id: 'stmt-009',
    timestamp: '2026-10-26T11:45:00.000Z',
    actor: { name: 'Carlos Gomez', mbox: 'mailto:cgomez@student.riverside.edu', role: 'student', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80' },
    verb: { id: 'http://adlnet.gov/expapi/verbs/failed', display: 'failed' },
    object: { id: 'https://edvidura.riverside.edu/xapi/quiz/checkpoint-2', definition: { name: 'Checkpoint 2: Graded Linear Equations Quiz', type: 'http://adlnet.gov/expapi/activities/assessment' } },
    result: { score: { raw: 3, min: 0, max: 6, scaled: 0.5 }, success: false, completion: true },
    context: { registration: 'reg-alg1-p1-2026', platform: 'EdVidura LTI 1.3' }
  }
];

// =========================================================================
// MODULE 3 DATA: LMS Integrations & Grade Passback
// =========================================================================
export const lmsConnectionsList: LmsConnection[] = [
  {
    id: 'lms-moodle-1',
    platform: 'moodle',
    name: 'Riverside High Moodle 4.3 Production',
    endpointUrl: 'https://moodle.riverside.edu/webservice/rest/server.php',
    clientId: 'rhs-moodle-lti-client-4091',
    deploymentId: 'dep-moodle-rhs-alg1',
    authLoginUrl: 'https://moodle.riverside.edu/mod/lti/auth.php',
    keysetUrl: 'https://moodle.riverside.edu/mod/lti/certs.php',
    status: 'connected',
    lastSync: '12m ago',
    autoSyncIntervalMinutes: 15,
    latencyMs: 34
  },
  {
    id: 'lms-canvas-1',
    platform: 'canvas',
    name: 'District Canvas LMS Secondary Gateway',
    endpointUrl: 'https://canvas.riversidedistrict.instructure.com/api/v1',
    clientId: 'rhs-canvas-lti-client-8812',
    deploymentId: 'dep-canvas-rhs-algebra',
    authLoginUrl: 'https://canvas.riversidedistrict.instructure.com/api/lti/authorize_redirect',
    keysetUrl: 'https://canvas.riversidedistrict.instructure.com/api/lti/security/jwks',
    status: 'connected',
    lastSync: '1h ago',
    autoSyncIntervalMinutes: 30,
    latencyMs: 42
  },
  {
    id: 'lms-springwe-1',
    platform: 'springwe',
    name: 'Springwe LMS / Enterprise Gateway',
    endpointUrl: 'https://lms.springwe.edu/api/v2/lti',
    clientId: 'rhs-springwe-client-7703',
    deploymentId: 'dep-springwe-rhs-algebra',
    authLoginUrl: 'https://lms.springwe.edu/oauth/authorize',
    keysetUrl: 'https://lms.springwe.edu/jwks.json',
    status: 'connected',
    lastSync: '2h ago',
    autoSyncIntervalMinutes: 60,
    latencyMs: 38
  }
];

export const gradePassbackLogsList: GradePassbackLog[] = [
  {
    id: 'pb-01',
    timestamp: '2026-10-26 12:35 PM',
    lms: 'moodle',
    studentName: 'Priya Patel',
    assignmentName: 'Checkpoint 2: Linear Equations',
    scoreGiven: 100,
    scoreMax: 100,
    status: 'success',
    httpStatus: 200,
    message: 'AGS 2.0 LineItem score posted. SHA-256 handshake OK.'
  },
  {
    id: 'pb-02',
    timestamp: '2026-10-26 12:36 PM',
    lms: 'moodle',
    studentName: 'Marcus Vance',
    assignmentName: 'Checkpoint 2: Linear Equations',
    scoreGiven: 83.3,
    scoreMax: 100,
    status: 'success',
    httpStatus: 200,
    message: 'AGS 2.0 LineItem score posted. Gradebook column synced.'
  },
  {
    id: 'pb-03',
    timestamp: '2026-10-26 12:37 PM',
    lms: 'moodle',
    studentName: 'Ada Chen',
    assignmentName: 'Checkpoint 2: Linear Equations',
    scoreGiven: 66.7,
    scoreMax: 100,
    status: 'queued',
    httpStatus: 202,
    message: 'Accepted in LRS queue; waiting for batch SIS ingestion.'
  },
  {
    id: 'pb-04',
    timestamp: '2026-10-26 12:30 PM',
    lms: 'canvas',
    studentName: 'Emma Watson-Bell',
    assignmentName: 'Checkpoint 2: Linear Equations',
    scoreGiven: 100,
    scoreMax: 100,
    status: 'success',
    httpStatus: 200,
    message: 'Canvas API /submissions score updated.'
  }
];

// =========================================================================
// MODULE 5 & 7 DATA: Competencies & Difference Training
// =========================================================================
export const competenciesList: CompetencyItem[] = [
  {
    id: 'comp-1',
    code: 'CCSS.MATH.HSA.CED.A.1',
    name: 'Linear Equations Modeling in One Variable',
    domain: 'Algebra & Functions',
    level: 'proficient',
    score: 88,
    targetScore: 85,
    gap: -3,
    evidenceCount: 4,
    evidenceItems: [
      { id: 'ev1', title: 'Lesson 01 Exercise Set', type: 'drill', score: '92%', date: 'Oct 18' },
      { id: 'ev2', title: 'Checkpoint 1 Quiz', type: 'quiz', score: '84%', date: 'Oct 20' }
    ]
  },
  {
    id: 'comp-2',
    code: 'CCSS.MATH.HSA.CED.A.2',
    name: 'Linear Slope Quotients & Coordinate Geometry',
    domain: 'Coordinate Algebra',
    level: 'developing',
    score: 68,
    targetScore: 85,
    gap: 17,
    evidenceCount: 3,
    evidenceItems: [
      { id: 'ev3', title: 'Checkpoint 2 Problem #1', type: 'quiz', score: '100%', date: 'Oct 24' },
      { id: 'ev4', title: 'Cartesian Lab 03 Sandbox', type: 'lab', score: '60%', date: 'Oct 25' }
    ],
    remediationTitle: 'Targeted Practice: Delta Slope Inversion & Reciprocal Vectors',
    remediationHours: 1.5
  },
  {
    id: 'comp-3',
    code: 'CCSS.MATH.HSA.REI.B.3',
    name: 'Standard Form Conversion (Ax + By = C)',
    domain: 'Linear Systems',
    level: 'novice',
    score: 52,
    targetScore: 80,
    gap: 28,
    evidenceCount: 2,
    evidenceItems: [
      { id: 'ev5', title: 'Checkpoint 2 Problem #3', type: 'quiz', score: '0%', date: 'Oct 24' }
    ],
    remediationTitle: 'Difference Remediation: Negative Sign Isolation in Standard Form',
    remediationHours: 2.5
  },
  {
    id: 'comp-4',
    code: 'CCSS.MATH.HSA.CED.A.3',
    name: 'Linear Inequalities & Half-Plane Shading',
    domain: 'Geometric Inequalities',
    level: 'developing',
    score: 65,
    targetScore: 85,
    gap: 20,
    evidenceCount: 2,
    evidenceItems: [
      { id: 'ev6', title: 'Diagnostic Drill #2', type: 'drill', score: '65%', date: 'Oct 22' }
    ],
    remediationTitle: 'Remedial Module: Boundary Line Tests (Strict vs Inclusive)',
    remediationHours: 2.0
  },
  {
    id: 'comp-5',
    code: 'CCSS.MATH.HSA.REI.C.5',
    name: 'Simultaneous 2x2 Linear System Elimination',
    domain: 'Systems of Equations',
    level: 'advanced',
    score: 95,
    targetScore: 85,
    gap: -10,
    evidenceCount: 5,
    evidenceItems: [
      { id: 'ev7', title: 'Honors Pre-Assessment Matrix', type: 'quiz', score: '96%', date: 'Oct 15' },
      { id: 'ev8', title: 'System Verification Sandbox', type: 'lab', score: '94%', date: 'Oct 19' }
    ]
  }
];

// =========================================================================
// MODULE 6 DATA: DCT Content Authoring & Lesson Planner
// =========================================================================
export const authoringLessonsList: AuthoringLesson[] = [
  {
    id: 'l1',
    num: '01',
    title: 'Linear Relationships & Foundations',
    durationMinutes: 12,
    status: 'published',
    objectives: [
      { id: 'ob1', text: 'Identify linear versus non-linear coordinate progressions', standard: 'CCSS.MATH.HSA.CED.A.1', taxonomy: 'Recall' },
      { id: 'ob2', text: 'Construct coordinate tables from real-world rate scenarios', standard: 'CCSS.MATH.HSA.CED.A.2', taxonomy: 'Apply' }
    ],
    resources: [
      { id: 'r1', title: 'Unit 2 Syllabus Roadmap.pdf', type: 'pdf', url: '#' },
      { id: 'r2', title: 'TI-84 Scatterplot Setup Guide', type: 'video', url: '#' }
    ],
    prerequisites: ['Pre-Algebra Arithmetic Axioms'],
    updatedAt: 'Oct 12, 2026'
  },
  {
    id: 'l2',
    num: '02',
    title: 'Rate of Change & Delta Slope Proofs',
    durationMinutes: 15,
    status: 'published',
    objectives: [
      { id: 'ob3', text: 'Derive delta slope formula m = (y2 - y1) / (x2 - x1)', standard: 'CCSS.MATH.HSA.CED.A.2', taxonomy: 'Analyze' }
    ],
    resources: [
      { id: 'r3', title: 'Slope Ratio Worksheet.pdf', type: 'pdf', url: '#' }
    ],
    prerequisites: ['Lesson 01'],
    updatedAt: 'Oct 16, 2026'
  },
  {
    id: 'l3',
    num: '03',
    title: 'Linear Equations: Graphs & Intercepts',
    durationMinutes: 18,
    status: 'published',
    objectives: [
      { id: 'ob4', text: 'Manipulate slope m and vertical intercept b in real time', standard: 'CCSS.MATH.HSA.CED.A.2', taxonomy: 'Apply' },
      { id: 'ob5', text: 'Identify coordinate intercepts (0, b) and (-b/m, 0)', standard: 'CCSS.MATH.HSA.REI.B.3', taxonomy: 'Evaluate' }
    ],
    resources: [
      { id: 'r4', title: 'Interactive Cartesian 3D Lab', type: 'lab3d', url: '#' },
      { id: 'r5', title: 'GeoGebra Slope Intercept Applet', type: 'geogebra', url: '#' }
    ],
    prerequisites: ['Lesson 02'],
    updatedAt: 'Oct 20, 2026'
  },
  {
    id: 'l4',
    num: '04',
    title: 'Slope-Intercept Form in Practice',
    durationMinutes: 20,
    status: 'in-review',
    objectives: [
      { id: 'ob6', text: 'Convert standard equations into canonical y = mx + b', standard: 'CCSS.MATH.HSA.REI.B.3', taxonomy: 'Apply' }
    ],
    resources: [
      { id: 'r6', title: 'Negative Sign Isolation Handout', type: 'pdf', url: '#' }
    ],
    prerequisites: ['Lesson 03'],
    updatedAt: 'Oct 24, 2026'
  },
  {
    id: 'l5',
    num: '05',
    title: 'Parallel & Perpendicular Line Equations',
    durationMinutes: 22,
    status: 'draft',
    objectives: [
      { id: 'ob7', text: 'Prove m1 * m2 = -1 for perpendicular vectors', standard: 'CCSS.MATH.HSA.CED.A.2', taxonomy: 'Evaluate' }
    ],
    resources: [
      { id: 'r7', title: 'Orthogonal Slopes Interactive Model', type: 'lab3d', url: '#' }
    ],
    prerequisites: ['Lesson 04'],
    updatedAt: 'Oct 25, 2026'
  }
];

// =========================================================================
// MODULE 8 DATA: Interactive eBook Chapters
// =========================================================================
export const bookChaptersList: BookChapter[] = [
  {
    id: 'ch1',
    num: '01',
    title: 'Axioms of Real Numbers & Cartesian Planes',
    subtitle: 'Coordinate geometry foundations, axis definitions, and origin symmetries',
    readingTime: '12 min',
    sections: [
      { id: 's1-1', title: '1.1 The Real Number Line & Interval Notation', page: 14 },
      { id: 's1-2', title: '1.2 Cartesian Quadrants & Orthogonal Coordinates', page: 22 }
    ]
  },
  {
    id: 'ch2',
    num: '02',
    title: 'Linear Relations & Constant Difference',
    subtitle: 'Arithmetic progression, discrete tables, and rate constancy',
    readingTime: '15 min',
    sections: [
      { id: 's2-1', title: '2.1 First-Order Difference Proofs', page: 48 },
      { id: 's2-2', title: '2.2 Tabular Coordinate Interpolation', page: 56 }
    ]
  },
  {
    id: 'ch3',
    num: '03',
    title: 'Geometric Slopes & Delta Quotients',
    subtitle: 'Rise-over-run formalization and directional unit vectors',
    readingTime: '18 min',
    sections: [
      { id: 's3-1', title: '3.1 The Ratio of Vertical to Horizontal Displacement', page: 80 },
      { id: 's3-2', title: '3.2 Collinearity Proofs Using Slopes', page: 94 }
    ]
  },
  {
    id: 'ch4',
    num: '04',
    title: 'Slope Dynamics & Algebraic Forms',
    subtitle: 'Point-slope, slope-intercept, standard form Ax + By = C, and conversions',
    readingTime: '24 min',
    sections: [
      { id: 's4-1', title: '4.1 Canonical Slope-Intercept Form y = mx + b', page: 112 },
      { id: 's4-2', title: '4.2 Standard Form & Negative Sign Isolation', page: 118 },
      { id: 's4-3', title: '4.3 Perpendicular Reciprocal Vector Derivation', page: 126 }
    ]
  },
  {
    id: 'ch5',
    num: '05',
    title: 'Linear Inequalities in Two Variables',
    subtitle: 'Boundary lines, test coordinates, and half-plane shading',
    readingTime: '20 min',
    sections: [
      { id: 's5-1', title: '5.1 Strict versus Non-Strict Inequalities', page: 142 },
      { id: 's5-2', title: '5.2 Feasible Regions in Coordinate Space', page: 156 }
    ]
  }
];

// =========================================================================
// MODULE 9 DATA: Personalised Goals & Suggested Activities
// =========================================================================
export const learningGoalsList: LearningGoal[] = [
  {
    id: 'g1',
    title: 'Master Standard Form Negative Sign Isolation',
    targetScore: 85,
    currentScore: 52,
    deadline: 'Oct 30, 2026',
    category: 'CCSS.MATH.HSA.REI.B.3',
    completed: false
  },
  {
    id: 'g2',
    title: 'Score 100% on Checkpoint 2 Retake',
    targetScore: 100,
    currentScore: 67,
    deadline: 'Nov 02, 2026',
    category: 'Summative Evaluation',
    completed: false
  },
  {
    id: 'g3',
    title: 'Complete 3D Cartesian Coordinate Studio Lab',
    targetScore: 100,
    currentScore: 100,
    deadline: 'Oct 24, 2026',
    category: 'Interactive Labs',
    completed: true
  }
];

export const suggestedActivitiesList: SuggestedActivity[] = [
  {
    id: 'act-1',
    title: '5-Minute Remediation Drill: Sign Inversions',
    type: 'drill',
    estimatedMinutes: 5,
    urgency: 'high',
    reason: 'Identified as your primary miss on Checkpoint 2 (Problem #3)',
    actionScreen: 'quiz'
  },
  {
    id: 'act-2',
    title: 'Read Technical Guide § 4.2: Standard Form Isolation',
    type: 'reading',
    estimatedMinutes: 8,
    urgency: 'high',
    reason: 'Grounding theory for negative coefficient transposition',
    actionScreen: 'manual-reader'
  },
  {
    id: 'act-3',
    title: 'Launch XR Cartesian Space Visualizer',
    type: 'lab',
    estimatedMinutes: 12,
    urgency: 'medium',
    reason: 'Build 3D spatial intuition for orthogonal slope vectors',
    actionScreen: 'xr-store'
  }
];

// =========================================================================
// MODULE 10 DATA: Ingested Knowledge Base Documents
// =========================================================================
export const ingestedDocsList: IngestedDocument[] = [
  {
    id: 'doc-1',
    filename: 'Algebra_I_Technical_Guide_Ch4.pdf',
    title: 'Algebra I Technical Guide — Chapter 04: Slope Dynamics',
    fileSize: '3.8 MB',
    chunkCount: 48,
    indexingStatus: 'indexed',
    permission: 'public',
    uploadedAt: 'Oct 14, 2026',
    summary: 'Official course textbook chapter covering Cartesian planes, linear equations, slope derivations, and standard form conversion.'
  },
  {
    id: 'doc-2',
    filename: 'Dr_Martinez_Lecture04_Slope_Notes.pdf',
    title: 'Dr. Martinez Lecture Notes: Perpendicular Slopes & Intercepts',
    fileSize: '1.4 MB',
    chunkCount: 22,
    indexingStatus: 'indexed',
    permission: 'students',
    uploadedAt: 'Oct 20, 2026',
    summary: 'Classroom whiteboard derivations, step-by-step examples of isolating y in 2x - 5y = 20, and common trap warnings.'
  },
  {
    id: 'doc-3',
    filename: 'Riverside_CCSS_Algebra_Standards_2026.pdf',
    title: 'Riverside District Mathematics Curriculum Alignment Rubric',
    fileSize: '5.1 MB',
    chunkCount: 64,
    indexingStatus: 'indexed',
    permission: 'faculty',
    uploadedAt: 'Sep 01, 2026',
    summary: 'Comprehensive Common Core State Standards criteria, pacing guides, and IRT assessment weightings.'
  }
];

// =========================================================================
// MODULE 11 DATA: XR Store Applications Catalog
// =========================================================================
export const xrAppsList: XrApp[] = [
  {
    id: 'xr-cartesian-3d',
    name: 'Cartesian Spatial 3D Explorer',
    tagline: 'Manipulate multivariable linear vectors and coordinate planes in immersive WebXR',
    category: 'spatial-math',
    version: 'v2.4.0',
    size: '14.2 MB',
    rating: 4.9,
    reviewsCount: 38,
    icon: 'view_in_ar',
    accentColor: '#FF4757',
    heroImage: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80',
    compatibility: {
      webxr: true,
      appleVisionPro: true,
      metaQuest: true,
      desktopWebgl: true,
      mobileAr: true
    },
    description: 'Step directly inside the Cartesian plane. Grab linear equations with spatial hand tracking, stretch slope vectors, observe real-time delta quotients, and project intersecting perpendicular planes.',
    curriculumStandards: ['CCSS.MATH.HSA.CED.A.2', 'CCSS.MATH.HSA.REI.B.3'],
    hardwareRequirements: 'WebXR Compatible Browser / Apple Vision Pro / Meta Quest 2, 3 or Pro / Desktop GPU WebGL 2.0',
    developer: 'EdVidura Spatial STEM Labs',
    featured: true
  },
  {
    id: 'xr-molecular-kinematics',
    name: 'Physics Kinematics & Velocity Vectors',
    tagline: 'Interactive 3D projectile motion and linear rate-of-change simulations',
    category: 'physics-lab',
    version: 'v1.8.2',
    size: '22.5 MB',
    rating: 4.8,
    reviewsCount: 24,
    icon: 'biotech',
    accentColor: '#0284C7',
    heroImage: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80',
    compatibility: {
      webxr: true,
      appleVisionPro: true,
      metaQuest: true,
      desktopWebgl: true,
      mobileAr: false
    },
    description: 'Launch projectiles in spatial zero-gravity. Measure instantaneous vs average velocity, graph linear position vs time lines, and inspect orthogonal acceleration vectors in real time.',
    curriculumStandards: ['NGSS.HS-PS2-1', 'CCSS.MATH.HSA.CED.A.1'],
    hardwareRequirements: 'Meta Quest 3 or Desktop WebGL 2.0 with hardware acceleration',
    developer: 'Riverside STEM Labs'
  },
  {
    id: 'xr-geometry-hologram',
    name: 'HoloDesk Augmented Geometry',
    tagline: 'Place true-to-scale geometric solids and coordinate axes on your classroom table',
    category: 'geometry-ar',
    version: 'v3.1.0',
    size: '18.1 MB',
    rating: 4.9,
    reviewsCount: 52,
    icon: 'auto_awesome',
    accentColor: '#10B981',
    heroImage: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=600&q=80',
    compatibility: {
      webxr: true,
      appleVisionPro: true,
      metaQuest: false,
      desktopWebgl: false,
      mobileAr: true
    },
    description: 'Augmented reality workspace for tablet and spatial headsets. Anchor 3D coordinate planes to physical desks, trace intersection points with touch/pinch gestures, and collaborate with peers.',
    curriculumStandards: ['CCSS.MATH.HSG.MG.A.1', 'CCSS.MATH.HSA.CED.A.2'],
    hardwareRequirements: 'ARKit / ARCore compatible mobile device or Apple Vision Pro',
    developer: 'EdVidura Spatial STEM Labs',
    featured: true
  },
  {
    id: 'xr-polynomial-rollercoaster',
    name: 'Polynomial Rollercoaster Builder',
    tagline: 'Construct thrilling quadratic and cubic tracks governed by algebraic functions',
    category: 'simulations',
    version: 'v1.5.0',
    size: '31.0 MB',
    rating: 4.7,
    reviewsCount: 19,
    icon: 'toys',
    accentColor: '#F59E0B',
    heroImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    compatibility: {
      webxr: true,
      appleVisionPro: true,
      metaQuest: true,
      desktopWebgl: true,
      mobileAr: true
    },
    description: 'Design dynamic coaster tracks by chaining together linear segments and parabolic curves. Ride your equations in first-person VR and examine slope steepness at every inflection point.',
    curriculumStandards: ['CCSS.MATH.HSF.IF.B.4', 'CCSS.MATH.HSA.CED.A.2'],
    hardwareRequirements: '6DOF VR Headset or WebGL Browser',
    developer: 'EdVidura Interactive'
  }
];


export const studentsList = initialStudents;

type StateListener = () => void;
const listeners: StateListener[] = [];

export function subscribe(listener: StateListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function notify(): void {
  listeners.forEach(fn => fn());
}

export function setRole(newRole: UserRole): void {
  state.role = newRole;
  if (newRole === 'student') {
    state.screen = 'student-home';
  } else if (newRole === 'teacher') {
    state.screen = 'teacher-results';
  } else if (newRole === 'admin') {
    state.screen = 'admin-overview';
  }
  notify();
}

const SCREEN_HASH: Record<ScreenId, string> = {
  'student-home': 'home',
  lessons: 'lessons',
  'lesson-detail': 'lesson',
  quiz: 'quiz',
  'quiz-results': 'quiz-results',
  'prerequisite-gate': 'gate',
  manuals: 'manuals',
  'manual-reader': 'manual-reader',
  'ask-vidura': 'ask-vidura',
  'my-progress': 'my-progress',
  'home-shell': 'home-shell',
  'teacher-results': 'teacher-results',
  'teacher-diagnostics': 'teacher-diagnostics',
  'admin-overview': 'admin-overview',
  'xr-store': 'xr-store',
  'pravachana-home': 'library',
  'pravachana-player': 'player',
  'pravachana-dept': 'dept',
};

const HASH_SCREEN: Record<string, ScreenId> = {
  home: 'student-home',
  lessons: 'lessons',
  lesson: 'lesson-detail',
  quiz: 'quiz',
  'preview-quiz': 'quiz',
  'quiz-results': 'quiz-results',
  gate: 'prerequisite-gate',
  manuals: 'manuals',
  'manual-reader': 'manual-reader',
  'ask-vidura': 'ask-vidura',
  'my-progress': 'my-progress',
  'home-shell': 'home-shell',
  'teacher-results': 'teacher-results',
  'teacher-diagnostics': 'teacher-diagnostics',
  'admin-overview': 'admin-overview',
  'xr-store': 'xr-store',
  library: 'pravachana-home',
  player: 'pravachana-player',
  dept: 'pravachana-dept',
};

export function screenFromHash(hash = window.location.hash): ScreenId | null {
  const key = (hash || '').replace(/^#/, '').split('?')[0].trim();
  return HASH_SCREEN[key] || null;
}

export function setScreen(newScreen: ScreenId): void {
  state.screen = newScreen;
  const hash = SCREEN_HASH[newScreen] || newScreen;
  if (typeof window !== 'undefined' && window.history && window.location) {
    const current = (window.location.hash || '').replace(/^#/, '');
    if (current !== hash) {
      const url = `${window.location.pathname}${window.location.search}#${hash}`;
      window.history.replaceState(null, '', url);
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  notify();
}

export function toggleScreenPicker(): void {
  state.screenPickerOpen = !state.screenPickerOpen;
  notify();
}

export function setAdminTab(tab: AdminTab): void {
  state.adminTab = tab;
  state.screen = 'admin-overview';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  notify();
}

export const facultyList = initialFaculty;
export const sectionsList = initialSections;

export function showToast(message: string, icon = 'info'): void {
  const container = document.getElementById('toast-root');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className =
    'pointer-events-auto bg-ink text-paper px-space-md py-space-sm rounded-lg shadow-lg flex items-center gap-space-xs font-label-md text-label-md animate-fade-rise border border-line';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-lagoon text-[20px]">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 300ms ease, transform 300ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
