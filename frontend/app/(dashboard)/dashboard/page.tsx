"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bot, Users, Phone, TrendingUp, Clock, CreditCard } from "lucide-react";
import { useAgentStore } from "@/store/agent";
import { subscriptionApi, Subscription } from "@/lib/subscription-api";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { agents, fetchAgents } = useAgentStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  useEffect(() => {
    fetchAgents().catch(console.error);
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setIsLoadingSubscription(true);
    try {
      const data = await subscriptionApi.getCurrentSubscription();
      setSubscription(data);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const stats = [
    {
      title: "Всего агентов",
      value: agents.length,
      icon: Bot,
      description: "Активных AI агентов",
    },
    {
      title: "Активные звонки",
      value: 0,
      icon: Phone,
      description: "В данный момент",
    },
    {
      title: "Лиды",
      value: 0,
      icon: Users,
      description: "Всего в базе",
    },
    {
      title: "Конверсия",
      value: "0%",
      icon: TrendingUp,
      description: "За последний месяц",
    },
  ];

  const getUsagePercentage = (used: number, total: number) => {
    if (total === -1) return 0; // Unlimited
    return (used / total) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'trial': return 'secondary';
      case 'expired': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'trial': return 'Пробный период';
      case 'expired': return 'Истекла';
      case 'cancelled': return 'Отменена';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">
          Обзор вашей платформы AI голосовых ассистентов
        </p>
      </div>

      {/* Subscription Usage Card */}
      {!isLoadingSubscription && subscription && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Использование тарифа</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(subscription.status)}>
                  {getStatusText(subscription.status)}
                </Badge>
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    Изменить план
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Minutes Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Минуты разговоров</span>
                  <span className="font-medium">
                    {subscription.currentPeriodUsage.minutesUsed} / {subscription.plan?.minutesIncluded}
                  </span>
                </div>
                <Progress
                  value={getUsagePercentage(
                    subscription.currentPeriodUsage.minutesUsed,
                    subscription.plan?.minutesIncluded || 0
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {subscription.plan?.minutesIncluded && subscription.plan.minutesIncluded !== -1
                    ? `${subscription.plan.minutesIncluded - subscription.currentPeriodUsage.minutesUsed} минут осталось`
                    : 'Безлимит'}
                </p>
              </div>

              {/* Agents Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI Агенты</span>
                  <span className="font-medium">
                    {subscription.currentPeriodUsage.agentsCreated} / {subscription.plan?.maxAgents === -1 ? '∞' : subscription.plan?.maxAgents}
                  </span>
                </div>
                {subscription.plan?.maxAgents !== -1 && (
                  <>
                    <Progress
                      value={getUsagePercentage(
                        subscription.currentPeriodUsage.agentsCreated,
                        subscription.plan?.maxAgents || 0
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(subscription.plan?.maxAgents || 0) - subscription.currentPeriodUsage.agentsCreated} доступно
                    </p>
                  </>
                )}
                {subscription.plan?.maxAgents === -1 && (
                  <p className="text-xs text-muted-foreground">Без ограничений</p>
                )}
              </div>

              {/* Managers Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Менеджеры</span>
                  <span className="font-medium">
                    {subscription.currentPeriodUsage.managersCreated} / {subscription.plan?.maxManagers === -1 ? '∞' : subscription.plan?.maxManagers}
                  </span>
                </div>
                {subscription.plan?.maxManagers !== -1 && (
                  <>
                    <Progress
                      value={getUsagePercentage(
                        subscription.currentPeriodUsage.managersCreated,
                        subscription.plan?.maxManagers || 0
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(subscription.plan?.maxManagers || 0) - subscription.currentPeriodUsage.managersCreated} доступно
                    </p>
                  </>
                )}
                {subscription.plan?.maxManagers === -1 && (
                  <p className="text-xs text-muted-foreground">Без ограничений</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Период до:</span>
                <span className="font-medium text-foreground">
                  {new Date(subscription.endDate).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="text-muted-foreground">
                План: <span className="font-medium text-foreground">{subscription.plan?.nameRu}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingSubscription && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние разговоры</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Здесь будет список последних разговоров с AI агентами
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
