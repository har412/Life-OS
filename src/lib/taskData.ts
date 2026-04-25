export type ViewType   = 'table' | 'kanban' | 'week';
export type Priority   = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Status     = 'BACKLOG' | 'SCHEDULED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type SortField  = 'title' | 'dueDate' | 'priority' | 'status' | 'category';
export type SortDir    = 'asc' | 'desc';
export type GroupBy    = 'none' | 'status' | 'category' | 'priority';
export type DatePreset = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'overdue' | 'no_date' | 'custom';

// Category is now just a string (built-in or custom)
export type Category = string;

export interface CategoryDef {
  id:    string;
  label: string;
  dot:   string;
  badge: string;
  text:  string;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author?: string;
}

export interface Task {
  id:          string;
  title:       string;
  category:    Category;
  priority:    Priority;
  status:      Status;
  dueDate:     string | null;
  time?:       string | null;
  tags?:       string[];
  description?: string;
  images?:      string[];
  comments?:    Comment[];
  reminderOffset?: number | null;
}

export interface FilterState {
  viewType:   ViewType;
  categories: Category[];
  priorities: Priority[];
  statuses:   Status[];
  search:     string;
  datePreset: DatePreset | null;
  dateFrom:   string | null;
  dateTo:     string | null;
  sortBy:     SortField;
  sortDir:    SortDir;
  groupBy:    GroupBy;
}

export interface SavedView {
  id:      string;
  name:    string;
  emoji:   string;
  filters: FilterState;
}




export const DEFAULT_FILTERS: FilterState = {
  viewType:   'table',
  categories: [],
  priorities: [],
  statuses:   [],
  search:     '',
  datePreset: null,
  dateFrom:   null,
  dateTo:     null,
  sortBy:     'dueDate',
  sortDir:    'asc',
  groupBy:    'none',
};

// ── Built-in categories ──────────────────────────────────────
export const BUILT_IN_CATEGORIES: CategoryDef[] = [
  { id:'WORK',      label:'Work',      dot:'bg-blue-500',    badge:'bg-blue-50',    text:'text-blue-700' },
  { id:'HEALTH',    label:'Health',    dot:'bg-emerald-500', badge:'bg-emerald-50', text:'text-emerald-700' },
  { id:'HOME',      label:'Home',      dot:'bg-amber-500',   badge:'bg-amber-50',   text:'text-amber-700' },
  { id:'LOAN',      label:'Loan',      dot:'bg-red-500',     badge:'bg-red-50',     text:'text-red-700' },
  { id:'FRIENDS',   label:'Friends',   dot:'bg-purple-500',  badge:'bg-purple-50',  text:'text-purple-700' },
  { id:'FAMILY',    label:'Family',    dot:'bg-pink-500',    badge:'bg-pink-50',    text:'text-pink-700' },
  { id:'LIFESTYLE', label:'Lifestyle', dot:'bg-teal-500',    badge:'bg-teal-50',    text:'text-teal-700' },
  { id:'PERSONAL',  label:'Personal',  dot:'bg-orange-500',  badge:'bg-orange-50',  text:'text-orange-700' },
];

// Color pool for new custom categories (rotates)
export const CUSTOM_CAT_COLORS: Pick<CategoryDef,'dot'|'badge'|'text'>[] = [
  { dot:'bg-indigo-500',  badge:'bg-indigo-50',  text:'text-indigo-700' },
  { dot:'bg-cyan-500',    badge:'bg-cyan-50',    text:'text-cyan-700' },
  { dot:'bg-lime-500',    badge:'bg-lime-50',    text:'text-lime-700' },
  { dot:'bg-rose-500',    badge:'bg-rose-50',    text:'text-rose-700' },
  { dot:'bg-sky-500',     badge:'bg-sky-50',     text:'text-sky-700' },
  { dot:'bg-violet-500',  badge:'bg-violet-50',  text:'text-violet-700' },
  { dot:'bg-fuchsia-500', badge:'bg-fuchsia-50', text:'text-fuchsia-700' },
  { dot:'bg-green-500',   badge:'bg-green-50',   text:'text-green-700' },
];

// Helper — get category metadata (built-in or custom from passed list)
export function getCatMeta(cat: Category, allCats: CategoryDef[]): CategoryDef {
  return allCats.find(c => c.id === cat) ?? {
    id: cat, label: cat, dot:'bg-stone-400', badge:'bg-stone-100', text:'text-stone-600',
  };
}

// Legacy flat object for places that haven't migrated yet
export const CAT_META: Record<string, CategoryDef> = Object.fromEntries(
  BUILT_IN_CATEGORIES.map(c => [c.id, c])
);

export const PRIORITY_META: Record<Priority, { label:string; dot:string; text:string; badge:string }> = {
  LOW:    { label:'Low',    dot:'bg-stone-300',   text:'text-stone-500',   badge:'bg-stone-100' },
  MEDIUM: { label:'Medium', dot:'bg-amber-400',   text:'text-amber-700',   badge:'bg-amber-50' },
  HIGH:   { label:'High',   dot:'bg-orange-500',  text:'text-orange-700',  badge:'bg-orange-50' },
  URGENT: { label:'Urgent', dot:'bg-red-500',     text:'text-red-700',     badge:'bg-red-50' },
};

export const STATUS_META: Record<Status, { label:string; badge:string; text:string }> = {
  BACKLOG:     { label:'Backlog',     badge:'bg-stone-100',  text:'text-stone-500' },
  SCHEDULED:   { label:'Scheduled',  badge:'bg-amber-50',   text:'text-amber-700' },
  IN_PROGRESS: { label:'In Progress',badge:'bg-orange-50',  text:'text-orange-700' },
  DONE:        { label:'Done',       badge:'bg-emerald-50', text:'text-emerald-700' },
  CANCELLED:   { label:'Cancelled',  badge:'bg-red-50',     text:'text-red-600' },
};

export const PRIORITY_ORDER: Record<Priority, number> = { URGENT:0, HIGH:1, MEDIUM:2, LOW:3 };
export const STATUS_ORDER:   Record<Status,   number> = { IN_PROGRESS:0, SCHEDULED:1, BACKLOG:2, DONE:3, CANCELLED:4 };




export const PRESET_SAVED_VIEWS: SavedView[] = [
  { id:'all-tasks',   name:'Tasks',   emoji:'📋', filters:{ ...DEFAULT_FILTERS } },
];

export function formatDate(iso: string | null): { text:string; isOverdue:boolean; isToday:boolean; isTomorrow:boolean } {
  if (!iso) return { text:'No date', isOverdue:false, isToday:false, isTomorrow:false };
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const date     = new Date(iso); date.setHours(0,0,0,0);
  const diff     = Math.round((date.getTime()-today.getTime())/(86400000));
  if (diff < 0)  return { text:`${Math.abs(diff)}d overdue`, isOverdue:true,  isToday:false, isTomorrow:false };
  if (diff === 0)return { text:'Today',    isOverdue:false, isToday:true,  isTomorrow:false };
  if (diff === 1)return { text:'Tomorrow', isOverdue:false, isToday:false, isTomorrow:true };
  if (diff < 7)  return { text:date.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}), isOverdue:false, isToday:false, isTomorrow:false };
  return { text:date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}), isOverdue:false, isToday:false, isTomorrow:false };
}
