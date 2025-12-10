"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { subscriptionApi, Plan, Subscription } from "@/lib/subscription-api";
import { toast } from "sonner";
import { Icons } from "@/components/icons";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription().catch(() => null),
      ]);
      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (error: any) {
      toast.error("Ошибка загрузки данных о тарифах");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setSubscribingTo(planType);
    try {
      if (currentSubscription) {
        await subscriptionApi.updateSubscription(planType);
        toast.success("Тарифный план успешно обновлен!");
      } else {
        await subscriptionApi.createSubscription(planType);
        toast.success("Подписка успешно оформлена!");
      }
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка оформления подписки");
    } finally {
      setSubscribingTo(null);
    }
  };

  const isCurrentPlan = (planType: string) => {
    return currentSubscription?.planType === planType;
  };

  const getPlanButtonText = (planType: string) => {
    if (isCurrentPlan(planType)) {
      return "Текущий план";
    }
    if (currentSubscription) {
      return "Перейти на план";
    }
    return "Выбрать план";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Тарифные планы</h1>
        <p className="text-muted-foreground mt-2">
          Выберите подходящий тарифный план для вашего бизнеса
        </p>
      </div>

      {currentSubscription && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Текущая подписка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">План:</span>
                <span className="font-medium">{currentSubscription.plan?.nameRu}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Статус:</span>
                <Badge variant={currentSubscription.status === 'active' ? 'default' : 'secondary'}>
                  {currentSubscription.status === 'active' ? 'Активна' :
                   currentSubscription.status === 'trial' ? 'Пробный период' :
                   currentSubscription.status === 'expired' ? 'Истекла' : 'Отменена'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Использовано минут:</span>
                <span className="font-medium">
                  {currentSubscription.currentPeriodUsage.minutesUsed} / {currentSubscription.plan?.minutesIncluded}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дата окончания:</span>
                <span className="font-medium">
                  {new Date(currentSubscription.endDate).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans
          .sort((a, b) => a.priceKzt - b.priceKzt)
          .map((plan) => (
            <Card
              key={plan._id}
              className={`relative ${isCurrentPlan(plan.type) ? 'border-primary shadow-lg' : ''}`}
            >
              {isCurrentPlan(plan.type) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Ваш план</Badge>
                </div>
              )}

              {plan.type === 'business' && !isCurrentPlan(plan.type) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary">Популярный</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.nameRu}</CardTitle>
                <CardDescription>{plan.name}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.priceKzt.toLocaleString('ru-RU')}</span>
                    <span className="text-muted-foreground">₸</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ~${plan.priceUsd.toFixed(2)} / месяц
                  </p>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Минуты в месяц:</span>
                    <span className="font-medium">{plan.minutesIncluded.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI агенты:</span>
                    <span className="font-medium">
                      {plan.maxAgents === -1 ? 'Безлимит' : `До ${plan.maxAgents}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Менеджеры:</span>
                    <span className="font-medium">
                      {plan.maxManagers === -1 ? 'Безлимит' : `До ${plan.maxManagers}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Доп. минута:</span>
                    <span className="font-medium">{plan.pricePerExtraMinute}₸</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={isCurrentPlan(plan.type) || subscribingTo !== null}
                  variant={isCurrentPlan(plan.type) ? "secondary" : "default"}
                >
                  {subscribingTo === plan.type && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {getPlanButtonText(plan.type)}
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Дополнительная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            • Все тарифы включают автоматическое продление подписки
          </p>
          <p>
            • При превышении лимита минут, дополнительные минуты тарифицируются по указанной стоимости
          </p>
          <p>
            • Вы можете изменить или отменить подписку в любое время
          </p>
          <p>
            • При смене тарифа новый план начнет действовать со следующего расчетного периода
          </p>
          <p>
            • Для корпоративных клиентов возможны индивидуальные условия - свяжитесь с нашей службой поддержки
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
