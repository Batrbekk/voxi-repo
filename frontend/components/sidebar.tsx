"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Bot,
  Users,
  Phone,
  MessageSquare,
  BookOpen,
  Settings,
  LogOut,
  User as UserIcon,
  CreditCard,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "@/types";

const routes = [
  {
    label: "Дашборд",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "AI Агенты",
    icon: Bot,
    href: "/agents",
  },
  {
    label: "Лиды",
    icon: Users,
    href: "/leads",
  },
  {
    label: "Разговоры",
    icon: MessageSquare,
    href: "/conversations",
  },
  {
    label: "Номера",
    icon: Phone,
    href: "/phone-numbers",
  },
  {
    label: "База знаний",
    icon: BookOpen,
    href: "/knowledge-base",
  },
  {
    label: "Тарифы",
    icon: CreditCard,
    href: "/pricing",
  },
  {
    label: "Настройки",
    icon: Settings,
    href: "/settings",
  },
];

function getUserInitials(email: string, firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName && firstName.length >= 2) {
    return firstName.substring(0, 2).toUpperCase();
  }
  if (firstName && firstName.length === 1) {
    return firstName[0].toUpperCase();
  }
  if (email && email.length >= 2) {
    return email.substring(0, 2).toUpperCase();
  }
  if (email && email.length === 1) {
    return email[0].toUpperCase();
  }
  return "U";
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "Супер Админ";
    case UserRole.COMPANY_ADMIN:
      return "Админ компании";
    case UserRole.MANAGER:
      return "Менеджер";
    default:
      return "Пользователь";
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight">Voxi</h2>
        <p className="text-sm text-muted-foreground">AI Voice Platform</p>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {routes.map((route) => (
            <Link key={route.href} href={route.href}>
              <Button
                variant={pathname === route.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  pathname === route.href && "bg-secondary"
                )}
              >
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-auto">
        <Separator />
        {user && (
          <div className="p-3">
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials(user.email, user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="p-3 pt-0">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
    </div>
  );
}
