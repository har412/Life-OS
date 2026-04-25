import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Toaster } from "sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "LifeOS — Personal Task Manager",
  description: "Your personal life operating system",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeOS",
  },
};


import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  let initialTasks: any[] = [];
  let initialCategories: any[] = [];
  let initialViews: any[] = [];

  if (session?.user?.id) {
    initialTasks = await prisma.task.findMany({ 
      where: { userId: session.user.id },
      include: { comments: true },
      orderBy: { createdAt: "desc" }
    });
    
    initialCategories = await prisma.category.findMany({ 
      where: { userId: session.user.id } 
    });
    
    initialViews = await prisma.savedView.findMany({ 
      where: { userId: session.user.id } 
    });
  }

  // Convert Date objects to strings for Client Components
  const safeTasks = initialTasks.map(t => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    comments: t.comments.map((c: any) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    // Map db's categoryId to the frontend's category property
    category: t.categoryId,
  }));

  const safeCategories = initialCategories.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    // Convert the db colorCode string back to dot/badge/text
    dot: c.colorCode ? JSON.parse(c.colorCode).dot : 'bg-stone-500',
    badge: c.colorCode ? JSON.parse(c.colorCode).badge : 'bg-stone-50 text-stone-700',
    text: c.colorCode ? JSON.parse(c.colorCode).text : 'text-stone-700',
  }));

  const safeViews = initialViews.map(v => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    filters: typeof v.filters === 'string' ? JSON.parse(v.filters) : v.filters,
  }));

  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#fffcf9]`} suppressHydrationWarning>
        <Toaster position="top-center" expand={true} richColors closeButton />
        <AppLayout 
          initialTasks={safeTasks} 
          initialCategories={safeCategories} 
          initialViews={safeViews}
        >
          <ServiceWorkerRegistration />
          {children}
        </AppLayout>
      </body>
    </html>

  );
}
