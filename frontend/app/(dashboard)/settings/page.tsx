"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">
          Управление настройками аккаунта и компании
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки компании</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Страница в разработке
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
