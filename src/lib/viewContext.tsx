"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  type FilterState, type SavedView, type CategoryDef, type Task,
  DEFAULT_FILTERS, PRESET_SAVED_VIEWS, BUILT_IN_CATEGORIES, CUSTOM_CAT_COLORS,
} from "@/lib/taskData";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/categories";
import { createSavedView, deleteSavedView, setDefaultView, reorderSavedViews } from "@/app/actions/views";


interface ViewContextType {
  filters:         FilterState;
  setFilters:      (f: FilterState) => void;
  updateFilter:    <K extends keyof FilterState>(key: K, val: FilterState[K]) => void;
  savedViews:      SavedView[];
  saveCurrentView: (name: string, emoji: string) => void;
  loadView:        (view: SavedView) => void;
  deleteView:      (id: string) => void;
  activeViewId:    string | null;
  resetFilters:    () => void;
  defaultViewId:   string | null;
  setDefaultViewId:(id: string | null) => void;
  loadDefaultView: () => void;
  // Dynamic tasks
  tasks:              Task[];
  refreshTasks:       () => void;
  addTask:            (task: Partial<Task>) => Promise<void>;
  // Dynamic categories
  allCategories:      CategoryDef[];
  addCategory:        (label: string) => Promise<CategoryDef | undefined>;
  editCategory:       (id: string, newLabel: string, colorIndex?: number) => Promise<void>;
  deleteCategory:     (id: string, reassignToId?: string) => Promise<void>;
  getTaskCount:       (id: string) => number;
  taskCategoryMap:    Record<string, string>; // taskId -> overridden category
  taskStatusMap:      Record<string, string>; // taskId -> overridden status
  updateTaskStatus:   (taskId: string, status: string) => void;
  deleteTask:         (taskId: string) => Promise<void>;
  reorderViews:       (ids: string[]) => Promise<void>;

  // Task Details Modal
  activeTaskId:       string | null;
  setActiveTaskId:    (id: string | null) => void;
  taskDetailsMap:     Record<string, Partial<Task>>;
  updateTaskDetails:  (taskId: string, details: Partial<Task>) => void;
}

const ViewContext = createContext<ViewContextType | null>(null);

export function ViewProvider({ 
  children,
  initialTasks = [],
  initialCategories = [],
  initialViews = []
}: { 
  children: ReactNode;
  initialTasks?: Task[];
  initialCategories?: CategoryDef[];
  initialViews?: SavedView[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [customCategories, setCustomCats] = useState<CategoryDef[]>(initialCategories);
  const [savedViews, setSavedViews] = useState<SavedView[]>(initialViews.length > 0 ? initialViews : PRESET_SAVED_VIEWS);
  
  const [defaultViewId, setDefaultViewIdState] = useState<string | null>(() => {
    const def = initialViews.find((v: any) => v.isDefault);
    return def ? def.id : null;
  });

  const setDefaultViewId = useCallback(async (id: string | null) => {
    setDefaultViewIdState(id);
    await setDefaultView(id);
  }, []);

  const [filters, setFiltersState] = useState<FilterState>(() => {
    const defaultView = savedViews.find((v: any) => v.isDefault) || savedViews.find(v => v.id === "all-tasks") || savedViews[0];
    return defaultView ? { ...defaultView.filters } : { ...DEFAULT_FILTERS };
  });
  const [activeViewId, setActiveViewId] = useState<string | null>(() => {
    const defaultView = savedViews.find((v: any) => v.isDefault) || savedViews.find(v => v.id === "all-tasks") || savedViews[0];
    return defaultView ? defaultView.id : null;
  });

  const [taskCategoryMap, setTaskCatMap]  = useState<Record<string,string>>({});
  const [taskStatusMap,   setTaskStatMap] = useState<Record<string,string>>({});
  const [activeTaskId,    setActiveTaskId]= useState<string | null>(null);
  const [taskDetailsMap,  setTaskDetailsMap] = useState<Record<string, Partial<Task>>>({});
  
  const searchParams = useSearchParams();
  useEffect(() => {
    const tid = searchParams?.get("taskId");
    if (tid && tid !== activeTaskId) {
      setActiveTaskId(tid);
    }
  }, [searchParams, activeTaskId]);

  const refreshTasks = useCallback(async () => {
    // In a real app, we might fetch here, but Next.js Server Actions 
    // combined with revalidatePath usually handle this via props.
  }, []);

  const addTask = useCallback(async (taskData: Partial<Task>) => {
    const res = await createTask({ ...taskData, timezoneOffset: new Date().getTimezoneOffset() });
    if (res.task) {
      const normalized = { ...res.task, category: res.task.categoryId } as any;
      setTasks(prev => [normalized, ...prev]);
    }
  }, []);

  const deleteTaskMethod = useCallback(async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (activeTaskId === taskId) setActiveTaskId(null);
    
    await deleteTask(taskId);
  }, [activeTaskId]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    // Optimistic update
    const isBacklog = status === 'BACKLOG';
    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      status: status as any,
      ...(isBacklog ? { dueDate: null, time: null } : {})
    } : t));
    setTaskStatMap(prev => ({ ...prev, [taskId]: status }));
    
    const res = await updateTask(taskId, { status, timezoneOffset: new Date().getTimezoneOffset() });
    if (res.task) {
      // Final sync with backend data
      const updated = { ...res.task, category: res.task.categoryId } as any;
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      
      // Clear status override
      setTaskStatMap(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  }, []);

  const updateTaskDetails = useCallback(async (taskId: string, details: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, ...details };
      if (updated.status === 'BACKLOG') {
        updated.dueDate = null;
        updated.time = null;
      } else if (details.dueDate && t.status === 'BACKLOG' && !details.status) {
        updated.status = 'SCHEDULED' as any;
      }
      return updated;
    }));

    setTaskDetailsMap(prev => {
      const existing = prev[taskId] || {};
      const updated = { ...existing, ...details };
      if (updated.status === 'BACKLOG') {
        updated.dueDate = null;
        updated.time = null;
      }
      return { ...prev, [taskId]: updated };
    });
    
    const res = await updateTask(taskId, { ...details, timezoneOffset: new Date().getTimezoneOffset() });
    if (res.task) {
      // Final sync with backend data to ensure we have the correct DB state
      const updated = { 
        ...res.task, 
        category: res.task.categoryId,
        comments: res.task.comments || []
      } as any;
      
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      
      // Clear the override map for this task once synced
      setTaskDetailsMap(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  }, []);

  const allCategories = customCategories.length > 0 ? customCategories : BUILT_IN_CATEGORIES;

  // Task count per category
  function getTaskCount(catId: string): number {
    return tasks.filter(t => (taskStatusMap[t.id] ?? t.status) !== "DONE" && (taskCategoryMap[t.id] ?? t.category) === catId).length;
  }

  const setFilters = useCallback((f: FilterState) => { setFiltersState(f); setActiveViewId(null); }, []);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: val }));
    setActiveViewId(null);
  }, []);

  const saveCurrentView = useCallback(async (name: string, emoji: string) => {
    const res = await createSavedView({ name, emoji, filters: { ...filters } });
    if (res.savedView) {
      setSavedViews(prev => [...prev, res.savedView as any]);
      setActiveViewId(res.savedView.id);
    }
  }, [filters]);

  const loadView  = useCallback((view: SavedView) => { setFiltersState({ ...view.filters }); setActiveViewId(view.id); }, []);
  const deleteView = useCallback(async (id: string) => { 
    await deleteSavedView(id);
    setSavedViews(prev => prev.filter(v => v.id !== id)); 
    if (activeViewId === id) setActiveViewId(null); 
    if (defaultViewId === id) setDefaultViewId(null);
  }, [activeViewId, defaultViewId]);

  const reorderViews = useCallback(async (ids: string[]) => {
    // Optimistic update
    setSavedViews(prev => {
      const copy = [...prev];
      return ids.map(id => copy.find(v => v.id === id)!).filter(Boolean);
    });
    await reorderSavedViews(ids);
  }, []);

  const resetFilters = useCallback(() => { setFiltersState({ ...DEFAULT_FILTERS }); setActiveViewId(null); }, []);

  const loadDefaultView = useCallback(() => {
    if (defaultViewId) {
      const v = savedViews.find(x => x.id === defaultViewId);
      if (v) { loadView(v); return; }
    }
    const allTasksView = savedViews.find(x => x.id === "all-tasks");
    if (allTasksView) { loadView(allTasksView); return; }
    resetFilters();
  }, [defaultViewId, savedViews, loadView, resetFilters]);

  const addCategory = useCallback(async (label: string) => {
    const id    = label.trim().toUpperCase().replace(/\s+/g, '_');
    const exist = allCategories.find(c => c.id === id || c.label.toLowerCase() === label.trim().toLowerCase());
    if (exist) return exist;
    
    const colors = CUSTOM_CAT_COLORS[(customCategories.length) % CUSTOM_CAT_COLORS.length];
    const res = await createCategory({ label: label.trim(), colorCode: JSON.stringify(colors) });
    
    if (res.category) {
      const newCat: CategoryDef = { 
        id: res.category.id, 
        label: res.category.label, 
        dot: colors.dot, 
        badge: colors.badge, 
        text: colors.text 
      };
      setCustomCats(prev => [...prev, newCat]);
      return newCat;
    }
  }, [allCategories, customCategories.length]);

  const editCategory = useCallback(async (id: string, newLabel: string, colorIndex?: number) => {
    const colors = colorIndex !== undefined ? CUSTOM_CAT_COLORS[colorIndex % CUSTOM_CAT_COLORS.length] : undefined;
    await updateCategory(id, { label: newLabel, colorCode: colors ? JSON.stringify(colors) : undefined });
    
    const updater = (cat: CategoryDef): CategoryDef => {
      if (cat.id !== id) return cat;
      return { ...cat, label: newLabel.trim() || cat.label, ...(colors || {}) };
    };
    setCustomCats(prev => prev.map(updater));
  }, []);

  const deleteCategoryMethod = useCallback(async (id: string, reassignToId?: string) => {
    await deleteCategory(id, reassignToId);
    // Remove from custom list
    setCustomCats(prev => prev.filter(c => c.id !== id));
    // Remove from active filters
    setFiltersState(prev => ({ ...prev, categories: prev.categories.filter(c => c !== id) }));
  }, []);

  return (
    <ViewContext.Provider value={{
      filters, setFilters, updateFilter,
      savedViews, saveCurrentView, loadView, deleteView, activeViewId, resetFilters,
      defaultViewId, setDefaultViewId, loadDefaultView,
      allCategories, addCategory, editCategory, deleteCategory: deleteCategoryMethod, getTaskCount, taskCategoryMap,
      taskStatusMap, updateTaskStatus, deleteTask: deleteTaskMethod,
      activeTaskId, setActiveTaskId, taskDetailsMap, updateTaskDetails,
      tasks, refreshTasks, addTask,
      reorderViews,
    }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView must be inside ViewProvider");
  return ctx;
}
