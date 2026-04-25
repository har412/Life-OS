"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, NotebookPen, BarChart3, Settings, Plus, Trash2, Pin, LogOut, Sparkles } from "lucide-react";
import { useView } from "@/lib/viewContext";
import { type SavedView, PRESET_SAVED_VIEWS } from "@/lib/taskData";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import dynamic from "next/dynamic";

const ThinkAloudModal = dynamic(() => import("@/components/ThinkAloudModal"), { ssr: false });

/* ─── Logo ────────────────────────────────── */
function LifeOSLogo() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 shrink-0">
      <rect width="36" height="36" rx="9" fill="#EA580C"/>
      <rect x="9"  y="10.5" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.35"/>
      <path d="M19 11.5L21 13.5L25.5 9"   stroke="white" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9"  y="17"   width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.65"/>
      <path d="M19 18L21 20L25.5 15.5"    stroke="white" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9"  y="23.5" width="7" height="1.75" rx="0.875" fill="white"/>
      <path d="M19 24.5L21 26.5L25.5 22"  stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const pages: { href: string; label: string; icon: React.ElementType }[] = [
  // { href:"/notes",   label:"Journal",    icon:NotebookPen },
  // { href:"/summary", label:"AI Summary", icon:BarChart3 },
];

function SavedViewItem({ 
  view, 
  active, 
  isDefault,
  provided,
  isDragging
}: { 
  view: SavedView; 
  active: boolean; 
  isDefault: boolean;
  provided: any;
  isDragging: boolean;
}) {
  const { loadView, deleteView, setDefaultViewId } = useView();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    if (pathname !== "/") router.push("/");
    loadView(view);
  };

  const isPreset = PRESET_SAVED_VIEWS.some(p => p.id === view.id);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      onClick={handleClick}
      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
        active ? "bg-orange-50" : "hover:bg-stone-100"
      } ${isDragging ? "shadow-lg border border-orange-200 bg-white z-50 ring-2 ring-orange-500/20" : ""}`}
    >
      <div 
        {...provided.dragHandleProps}
        className="opacity-0 group-hover:opacity-100 p-0.5 -ml-1 text-stone-300 hover:text-stone-500 transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      
      <span className="text-sm shrink-0">{view.emoji}</span>
      <span className={`text-sm flex-1 truncate font-medium ${active ? "text-orange-700" : "text-stone-600"}`}>
        {view.name}
      </span>
      
      <div className="flex items-center gap-0.5">
        <button
          onClick={e => { e.stopPropagation(); setDefaultViewId(isDefault ? null : view.id); }}
          className={`p-1 rounded transition-all ${isDefault ? "text-orange-500 opacity-100" : "text-stone-300 opacity-0 group-hover:opacity-100 hover:text-orange-500 hover:bg-orange-50"}`}
          title={isDefault ? "Remove default" : "Set as default"}
        >
          <Pin className={`w-3 h-3 ${isDefault ? "fill-orange-500" : ""}`} />
        </button>
        {!isPreset && (
          <button
            onClick={e => { 
              e.stopPropagation(); 
              if (confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
                deleteView(view.id); 
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete view"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { savedViews, activeViewId, saveCurrentView, defaultViewId, loadDefaultView, reorderViews } = useView();
  const [showThinkAloud, setShowThinkAloud] = useState(false);
  const onTasksPage = pathname === "/";

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U";

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(savedViews);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderViews(items.map(v => v.id));
  };

  return (
    <aside className="w-56 h-screen bg-white border-r border-stone-200 flex flex-col shrink-0 select-none">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <Link href="/" onClick={loadDefaultView} className="flex items-center gap-2.5">
          <LifeOSLogo />
          <div>
            <p className="text-sm font-bold text-stone-900 leading-none">Life OS</p>
            <p className="text-[11px] text-stone-400 mt-0.5 font-medium">Personal Assistant</p>
          </div>
        </Link>
      </div>

      {/* Think Aloud AI */}
      <div className="px-3 pb-2">
        <button 
          onClick={() => setShowThinkAloud(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-100 transition-all active:scale-[0.98] group"
        >
          <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
          <span className="text-sm font-bold tracking-tight">Think Aloud</span>
        </button>
      </div>

      <div className="mx-4 h-px bg-stone-100 mb-3" />

      {/* Saved views */}
      <div className="flex-1 px-3 overflow-y-auto pb-3">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Saved Views</p>
          {onTasksPage && (
            <button
              onClick={() => {
                const name = prompt("Name this view:");
                if (name?.trim()) saveCurrentView(name.trim(), "📋");
              }}
              className="p-0.5 rounded text-stone-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="views-list">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-0.5"
              >
                {savedViews.map((v, index) => (
                  <Draggable key={v.id} draggableId={v.id} index={index}>
                    {(provided, snapshot) => (
                      <SavedViewItem 
                        view={v} 
                        active={onTasksPage && activeViewId === v.id} 
                        isDefault={defaultViewId === v.id}
                        provided={provided}
                        isDragging={snapshot.isDragging}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-stone-100 space-y-1">
        <div className="flex items-center gap-1.5 px-2">
          <NotificationBell />
          <Link href="/settings" className={`p-2 rounded-xl transition-colors ${pathname === '/settings' ? "bg-orange-50 text-orange-600" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"}`}>
            <Settings className="w-5 h-5" />
          </Link>
          <button 
            onClick={() => signOut()}
            className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors group min-w-0">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 border border-orange-200">
            <span className="text-xs font-bold text-orange-700">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-stone-900 truncate leading-none">{session?.user?.name || 'User'}</p>
            <p className="text-[11px] text-stone-400 truncate mt-1 font-medium">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      {showThinkAloud && <ThinkAloudModal onClose={() => setShowThinkAloud(false)} />}
    </aside>
  );
}
