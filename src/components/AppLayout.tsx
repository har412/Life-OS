"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { ViewProvider } from "@/lib/viewContext";
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
  const isPublicPage = pathname === "/" || pathname === "/privacy" || pathname === "/terms";


  useEffect(() => {
    if (status === "unauthenticated" && !isAuthPage && !isPublicPage) {
      router.push("/login");
    } else if (status === "authenticated" && isAuthPage) {
      router.push("/");
    }
  }, [status, isAuthPage, isPublicPage, router]);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><p className="text-stone-500 font-medium animate-pulse">Loading workspace...</p></div>;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }


  if (status === "unauthenticated" && !isPublicPage) {
    return null;
  }

  // If it's a public page and we're unauthenticated, we still want to show the content (LandingPage or PrivacyPage)
  if (status === "unauthenticated" && isPublicPage) {
    return <>{children}</>;
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
        
        <MobileNav />
      </div>


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
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password";

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
