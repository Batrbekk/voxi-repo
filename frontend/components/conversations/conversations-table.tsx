"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye } from "lucide-react";
import { Conversation, CallStatus } from "@/types";
import { useConversationStore } from "@/store/conversation";
import { ConversationDialog } from "./conversation-dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ConversationsTableProps {
  conversations: Conversation[];
}

const statusLabels: Record<CallStatus, string> = {
  [CallStatus.RINGING]: "Звонит",
  [CallStatus.ONGOING]: "В процессе",
  [CallStatus.COMPLETED]: "Завершен",
  [CallStatus.FAILED]: "Ошибка",
  [CallStatus.MISSED]: "Пропущен",
  [CallStatus.NO_ANSWER]: "Нет ответа",
  [CallStatus.BUSY]: "Занято",
};

const statusVariants: Record<
  CallStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [CallStatus.RINGING]: "outline",
  [CallStatus.ONGOING]: "default",
  [CallStatus.COMPLETED]: "default",
  [CallStatus.FAILED]: "destructive",
  [CallStatus.MISSED]: "secondary",
  [CallStatus.NO_ANSWER]: "secondary",
  [CallStatus.BUSY]: "secondary",
};

export function ConversationsTable({ conversations }: ConversationsTableProps) {
  const { playRecording } = useConversationStore();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Агент</TableHead>
            <TableHead>Лид</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Длительность</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((conversation) => (
            <TableRow key={conversation._id}>
              <TableCell>
                {format(new Date(conversation.startedAt), "dd MMM yyyy, HH:mm", {
                  locale: ru,
                })}
              </TableCell>
              <TableCell className="font-medium">
                {conversation.agentId
                  ? typeof conversation.agentId === 'object'
                    ? (conversation.agentId as any).name || (conversation.agentId as any)._id
                    : conversation.agentId
                  : "-"}
              </TableCell>
              <TableCell>
                {conversation.leadId
                  ? typeof conversation.leadId === 'object'
                    ? (conversation.leadId as any).name || (conversation.leadId as any)._id
                    : conversation.leadId
                  : "-"}
              </TableCell>
              <TableCell>{conversation.phoneNumber}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[conversation.status]}>
                  {statusLabels[conversation.status]}
                </Badge>
              </TableCell>
              <TableCell>{formatDuration(conversation.duration)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(conversation)}
                    title="Просмотр деталей"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {conversation.audioUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => playRecording(conversation.audioUrl!)}
                      title="Прослушать запись"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedConversation && (
        <ConversationDialog
          open={!!selectedConversation}
          onOpenChange={(open) => !open && setSelectedConversation(null)}
          conversation={selectedConversation}
        />
      )}
    </>
  );
}
