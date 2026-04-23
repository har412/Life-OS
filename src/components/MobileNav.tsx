"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, BookOpen, BarChart3, Settings } from "lucide-react";

const tabs = [
  { href:"/",        label:"Tasks",   icon:CheckSquare },
  // { href:"/notes",   label:"Journal", icon:BookOpen },
  // { href:"/summary", label:"Summary", icon:BarChart3 },
  { href:"/settings",label:"Settings",icon:Settings },
];

export default function MobileNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-stone-200"
      style={{ paddingBottom:"env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-orange-500" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${active ? "bg-orange-50" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.25]" : "stroke-[1.5]"}`} />
              </div>
              <span className={`text-[10px] font-semibold ${active ? "text-orange-600" : "text-stone-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
