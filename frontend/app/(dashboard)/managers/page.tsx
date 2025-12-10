"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManagerStore } from "@/store/manager";
import { InviteManagerDialog } from "@/components/managers/invite-manager-dialog";
import { ManagersTable } from "@/components/managers/managers-table";

export default function ManagersPage() {
  const { managers, fetchManagers, isLoading } = useManagerStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchManagers().catch(console.error);
  }, [fetchManagers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Менеджеры</h1>
          <p className="text-muted-foreground">
            Управление менеджерами компании
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Пригласить менеджера
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список менеджеров</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет менеджеров. Пригласите первого менеджера.
            </div>
          ) : (
            <ManagersTable managers={managers} />
          )}
        </CardContent>
      </Card>

      <InviteManagerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
