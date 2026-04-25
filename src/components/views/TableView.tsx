"use client";
import { useState, Fragment, useEffect } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2, MessageSquare, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { PRIORITY_META, STATUS_META, formatDate, getCatMeta, type Task, type SortField, type GroupBy, PRIORITY_ORDER, STATUS_ORDER, type CategoryDef } from "@/lib/taskData";
import { useView } from "@/lib/viewContext";


function sortTasks(tasks: Task[], by: SortField, dir: "asc"|"desc") {
  return [...tasks].sort((a,b) => {
    let c = 0;
    if (by==="title") c=a.title.localeCompare(b.title);
    else if (by==="dueDate") { if(!a.dueDate&&!b.dueDate) c=0; else if(!a.dueDate) c=1; else if(!b.dueDate) c=-1; else c=a.dueDate.localeCompare(b.dueDate); }
    else if (by==="priority") c=PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority];
    else if (by==="status") c=STATUS_ORDER[a.status]-STATUS_ORDER[b.status];
    else if (by==="category") c=a.category.localeCompare(b.category);
    return dir==="asc"?c:-c;
  });
}

function groupTasks(tasks: Task[], by: GroupBy, allCategories: CategoryDef[]) {
  if (by==="none") return [{key:"all",label:"",color:"",tasks}];
  const map = new Map<string,Task[]>();
  tasks.forEach(t => {
    const k = by==="status"?t.status:by==="category"?t.category:t.priority;
    if (!map.has(k)) map.set(k,[]);
    map.get(k)!.push(t);
  });
  return [...map.entries()].sort((a,b)=>{
    if(by==="priority") return (PRIORITY_ORDER as any)[a[0]] - (PRIORITY_ORDER as any)[b[0]];
    if(by==="status") return (STATUS_ORDER as any)[a[0]] - (STATUS_ORDER as any)[b[0]];
    return a[0].localeCompare(b[0]);
  }).map(([key,tasks])=>({
    key,
    label: by==="status"?(STATUS_META as any)[key].label:by==="category"?getCatMeta(key, allCategories).label:(PRIORITY_META as any)[key]?.label||key,
    color: by==="status"?`${(STATUS_META as any)[key].badge} ${(STATUS_META as any)[key].text}`:by==="category"?`${getCatMeta(key, allCategories).badge} ${getCatMeta(key, allCategories).text}`:`${(PRIORITY_META as any)[key]?.badge} ${(PRIORITY_META as any)[key]?.text}`||"",
    tasks,
  }));
}

/* Mobile card row */
function MobileCard({task, onClick}:{task:Task, onClick:()=>void}) {
  const { allCategories } = useView();
  const cat=getCatMeta(task.category, allCategories), pri=PRIORITY_META[task.priority], st=STATUS_META[task.status], due=formatDate(task.dueDate), done=task.status==="DONE";
  return (
    <div onClick={onClick} className={`bg-white border border-stone-200 rounded-xl p-3.5 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer ${done?"opacity-60":""}`}>
      <div className="flex items-start gap-2.5">
        <div className={`w-1 rounded-full shrink-0 ${cat.dot}`} style={{height:28}}/>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${done?"text-stone-400 line-through":"text-stone-800"}`}>{task.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${st.badge} ${st.text}`}>{st.label}</span>
            <span className={`text-xs font-medium ${cat.text} flex items-center gap-1`}><span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}/>{cat.label}</span>
            {task.dueDate&&<span className={`text-xs font-medium ${due.isOverdue?"text-red-500":due.isToday?"text-orange-600":"text-stone-400"}`}>{due.isOverdue?"⚠️ ":"📅 "}{due.text}</span>}
            <span className={`text-xs font-medium flex items-center gap-1 ${pri.text}`}><span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`}/>{pri.label}</span>
            {task.images && task.images.length > 0 && <span className="text-xs font-medium text-stone-400 flex items-center gap-1"><ImageIcon className="w-3 h-3"/> {task.images.length}</span>}
            {task.comments && task.comments.length > 0 && <span className="text-xs font-medium text-stone-400 flex items-center gap-1"><MessageSquare className="w-3 h-3"/> {task.comments.length}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Desktop table row */
function TableRow({task,selected,onSelect,onClick}:{task:Task;selected:boolean;onSelect:()=>void,onClick:()=>void}) {
  const { deleteTask, allCategories } = useView();
  const cat=getCatMeta(task.category, allCategories), pri=PRIORITY_META[task.priority], st=STATUS_META[task.status], due=formatDate(task.dueDate), done=task.status==="DONE";
  return (
    <div onClick={onClick} className={`flex items-center group border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors cursor-pointer ${selected?"bg-orange-50 hover:bg-orange-50":""} ${done?"opacity-60":""}`}>
      <div className="w-10 shrink-0 flex items-center justify-center py-3">
        <button onClick={(e)=>{e.stopPropagation();onSelect();}} className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all ${selected?"bg-orange-500 border-orange-500":"border-orange-200 hover:border-orange-400"}`}>
          {selected&&<svg viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="9 1 4 7 1 4"/></svg>}
        </button>
      </div>
      <div className="flex-1 py-3 px-3 flex items-center gap-2.5 min-w-0">
        <div className={`w-0.5 h-6 rounded-full shrink-0 ${cat.dot}`}/>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate flex items-center gap-2 ${done?"text-stone-400 line-through":"text-stone-800 hover:text-orange-700"} transition-colors`}>
            {task.title}
            {task.images && task.images.length > 0 && <ImageIcon className="w-3 h-3 text-stone-300" />}
            {task.comments && task.comments.length > 0 && <MessageSquare className="w-3 h-3 text-stone-300" />}
          </p>
        </div>
      </div>
      <div className="w-36 shrink-0 py-3 px-3"><span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${st.badge} ${st.text}`}>{st.label}</span></div>
      <div className="w-28 shrink-0 py-3 px-3"><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${pri.text}`}><span className={`w-2 h-2 rounded-full ${pri.dot}`}/>{pri.label}</span></div>
      <div className="w-32 shrink-0 py-3 px-3"><span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${cat.badge} ${cat.text}`}><span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}/>{cat.label}</span></div>
      <div className="w-36 shrink-0 py-3 px-3">
        {task.dueDate
          ? <span className={`text-xs font-medium ${due.isOverdue?"text-red-600":due.isToday?"text-orange-600":due.isTomorrow?"text-amber-600":"text-stone-500"}`}>{due.isOverdue&&"⚠️ "}{due.text}{task.time&&<span className="text-stone-400 ml-1">· {task.time}</span>}</span>
          : <span className="text-xs text-stone-300">—</span>}
      </div>
      <div className="w-16 shrink-0 py-3 px-2 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e=>{e.stopPropagation();onClick();}} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>
        <button onClick={e=>{e.stopPropagation();deleteTask(task.id);}} className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
      </div>
    </div>
  );
}

const COLS = [
  {id:"title",   label:"Title",    w:"flex-1",  sort:true},
  {id:"status",  label:"Status",   w:"w-36",    sort:true},
  {id:"priority",label:"Priority", w:"w-28",    sort:true},
  {id:"category",label:"Category", w:"w-32",    sort:true},
  {id:"dueDate", label:"Due date", w:"w-36",    sort:true},
  {id:"actions", label:"",         w:"w-16",    sort:false},
];

export default function TableView({tasks,sortBy,sortDir,onSort,groupBy}:{tasks:Task[];sortBy:SortField;sortDir:"asc"|"desc";onSort:(f:SortField)=>void;groupBy:GroupBy}) {
  const { setActiveTaskId, allCategories } = useView();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setPage(1);
  }, [sortBy, sortDir, groupBy, tasks.length]);

  const sorted = sortTasks(tasks,sortBy,sortDir);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginatedTasks = sorted.slice((page - 1) * pageSize, page * pageSize);
  const groups = groupTasks(paginatedTasks,groupBy,allCategories);

  if (tasks.length===0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-stone-400"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <p className="text-sm font-semibold text-stone-600 mb-1">No tasks match your filters</p>
      <p className="text-xs text-stone-400">Try adjusting the filters or date range.</p>
    </div>
  );

  // Mobile: show cards
  const mobileView = (
    <div className="space-y-2 lg:hidden">
      {groups.map(g=>(
        <Fragment key={g.key}>
          {groupBy!=="none"&&<div className="flex items-center gap-2 py-1.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${g.color}`}>{g.label}</span><span className="text-xs text-stone-400">{g.tasks.length}</span></div>}
          {!collapsed.has(g.key)&&g.tasks.map(t=><MobileCard key={t.id} task={t} onClick={() => setActiveTaskId(t.id)}/>)}
        </Fragment>
      ))}
    </div>
  );

  // Desktop: show table
  const desktopView = (
    <div className="hidden lg:block bg-white border border-orange-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-orange-100 bg-orange-50/30 text-[11px] font-semibold text-stone-500 uppercase tracking-wide sticky top-0 z-10">
        <div className="w-10 shrink-0 flex items-center justify-center py-2.5">
          <button onClick={()=>setSelected(s=>s.size===tasks.length?new Set():new Set(tasks.map(t=>t.id)))} className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center ${selected.size===tasks.length?"bg-orange-500 border-orange-500":"border-orange-200 hover:border-orange-400"}`}>
            {selected.size===tasks.length&&<svg viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="9 1 4 7 1 4"/></svg>}
          </button>
        </div>
        {COLS.map(col=>(
          col.sort
            ? <button key={col.id} onClick={()=>onSort(col.id as SortField)} className={`${col.w} shrink-0 flex items-center gap-1.5 py-2.5 px-3 text-left hover:bg-stone-100 transition-colors group`}>
                <span className={sortBy===col.id?"text-orange-700":""}>{col.label}</span>
                <span className={sortBy===col.id?"text-orange-500":"text-stone-300 group-hover:text-stone-400"}>
                  {sortBy===col.id?(sortDir==="asc"?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>):<ChevronsUpDown className="w-3.5 h-3.5"/>}
                </span>
              </button>
            : <div key={col.id} className={`${col.w} shrink-0 py-2.5 px-3`}/>
        ))}
      </div>
      {/* Rows */}
      {groups.map(g=>(
        <Fragment key={g.key}>
          {groupBy!=="none"&&(
            <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50/10 border-b border-orange-100 sticky top-[41px] z-10">
              <button onClick={()=>setCollapsed(s=>{const n=new Set(s);n.has(g.key)?n.delete(g.key):n.add(g.key);return n;})} className="flex items-center gap-2">
                <ChevronDown className={`w-3.5 h-3.5 text-orange-300 transition-transform ${collapsed.has(g.key)?"-rotate-90":""}`}/>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${g.color}`}>{g.label}</span>
                <span className="text-xs text-stone-400">{g.tasks.length}</span>
              </button>
            </div>
          )}
          {!collapsed.has(g.key)&&g.tasks.map(t=><TableRow key={t.id} task={t} selected={selected.has(t.id)} onSelect={()=>setSelected(s=>{const n=new Set(s);n.has(t.id)?n.delete(t.id):n.add(t.id);return n;})} onClick={() => setActiveTaskId(t.id)}/>)}
        </Fragment>
      ))}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
          <p className="text-xs text-stone-500">
            Showing <span className="font-semibold text-stone-700">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-stone-700">{Math.min(page * pageSize, sorted.length)}</span> of <span className="font-semibold text-stone-700">{sorted.length}</span> tasks
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded text-stone-500 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-stone-700 px-2">{page} / {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded text-stone-500 hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size>0&&(
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-stone-900 text-white rounded-xl px-4 py-2.5 shadow-xl z-40">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-4 bg-white/20"/>
          <button className="text-xs font-medium text-white/70 hover:text-white">Mark done</button>
          <button className="text-xs font-medium text-red-400 hover:text-red-300">Delete</button>
          <button onClick={()=>setSelected(new Set())} className="text-xs text-white/40 hover:text-white ml-1">✕</button>
        </div>
      )}
    </div>
  );

  return <>{mobileView}{desktopView}</>;
}
