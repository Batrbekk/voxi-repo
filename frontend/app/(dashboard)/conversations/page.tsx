"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConversationStore } from "@/store/conversation";
import { useAgentStore } from "@/store/agent";
import { ConversationsTable } from "@/components/conversations/conversations-table";
import { CallStatus } from "@/types";

export default function ConversationsPage() {
  const { conversations, fetchConversations, loading } = useConversationStore();
  const { agents, fetchAgents } = useAgentStore();
  const [statusFilter, setStatusFilter] = useState<CallStatus | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  useEffect(() => {
    fetchAgents().catch(console.error);
  }, []);

  useEffect(() => {
    handleFetch();
  }, [statusFilter, agentFilter]);

  const handleFetch = () => {
    const filters: any = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    if (agentFilter !== "all") filters.agentId = agentFilter;
    fetchConversations(filters).catch(console.error);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as CallStatus | "all");
  };

  const handleAgentChange = (value: string) => {
    setAgentFilter(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Разговоры</h1>
        <p className="text-muted-foreground">
          История всех разговоров с AI агентами
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value={CallStatus.RINGING}>Звонит</SelectItem>
                <SelectItem value={CallStatus.ONGOING}>В процессе</SelectItem>
                <SelectItem value={CallStatus.COMPLETED}>Завершен</SelectItem>
                <SelectItem value={CallStatus.FAILED}>Ошибка</SelectItem>
                <SelectItem value={CallStatus.MISSED}>Пропущен</SelectItem>
                <SelectItem value={CallStatus.NO_ANSWER}>Нет ответа</SelectItem>
                <SelectItem value={CallStatus.BUSY}>Занято</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={handleAgentChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Агент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все агенты</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent._id} value={agent._id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История разговоров ({conversations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет записанных разговоров
            </div>
          ) : (
            <ConversationsTable conversations={conversations} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
