"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { ViewProvider } from "@/lib/viewContext";
import { useState } from "react";
import { Plus } from "lucide-react";
import AddTaskModal from "@/components/AddTaskModal";
import MobileNav from "@/components/MobileNav";

function AuthGuard({ 
  children, 
  isAuthPage,
  initialTasks,
  initialCategories,
  initialViews
}: { 
  children: React.ReactNode; 
  isAuthPage: boolean;
  initialTasks: any[];
  initialCategories: any[];
  initialViews: any[];
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const isHomePage = pathname === "/";
    if (status === "unauthenticated" && !isAuthPage && !isHomePage) {
      router.push("/login");
    } else if (status === "authenticated" && isAuthPage) {
      router.push("/");
    }
  }, [status, isAuthPage, pathname, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><p className="text-stone-500 font-medium animate-pulse">Loading workspace...</p></div>;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <ViewProvider initialTasks={initialTasks} initialCategories={initialCategories} initialViews={initialViews}>
      {/* Desktop layout */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        
        {/* Mobile FAB */}
        <button 
          onClick={() => setShowAdd(true)}
          className="fixed bottom-20 right-5 w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-2xl shadow-xl shadow-orange-200 flex items-center justify-center z-40 active:scale-90 transition-transform border border-orange-300/20"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>

        <MobileNav />
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </ViewProvider>
  );
}

export default function AppLayout({ 
  children,
  initialTasks,
  initialCategories,
  initialViews
}: { 
  children: React.ReactNode;
  initialTasks: any[];
  initialCategories: any[];
  initialViews: any[];
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  return (
    <SessionProvider>
      <AuthGuard 
        isAuthPage={isAuthPage} 
        initialTasks={initialTasks}
        initialCategories={initialCategories}
        initialViews={initialViews}
      >
        {children}
      </AuthGuard>
    </SessionProvider>
  );
}
