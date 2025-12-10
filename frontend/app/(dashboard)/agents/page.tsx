"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentStore } from "@/store/agent";
import { AgentsTable } from "@/components/agents/agents-table";

export default function AgentsPage() {
  const { agents, fetchAgents, isLoading } = useAgentStore();

  useEffect(() => {
    fetchAgents().catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Агенты</h1>
          <p className="text-muted-foreground">
            Управление голосовыми ассистентами
          </p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать агента
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список агентов</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет созданных агентов. Создайте первого агента.
            </div>
          ) : (
            <AgentsTable agents={agents} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
