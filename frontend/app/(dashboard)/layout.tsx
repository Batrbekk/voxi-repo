"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuthStore } from "@/store/auth";
import Cookies from "js-cookie";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, fetchMe } = useAuthStore();

  useEffect(() => {
    const accessToken = Cookies.get('accessToken');
    if (accessToken && !user) {
      fetchMe().catch(() => {
        // If fetch fails, tokens might be invalid
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
      });
    }
  }, [user, fetchMe]);

  return (
    <div className="flex h-screen">
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="container px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
