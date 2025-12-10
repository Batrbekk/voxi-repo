"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Conversation, CallStatus } from "@/types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Play, Phone, Clock, User, Bot } from "lucide-react";
import { useConversationStore } from "@/store/conversation";

interface ConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
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

export function ConversationDialog({
  open,
  onOpenChange,
  conversation,
}: ConversationDialogProps) {
  const { playRecording } = useConversationStore();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали разговора</DialogTitle>
          <DialogDescription>
            {format(new Date(conversation.startedAt), "dd MMMM yyyy, HH:mm", {
              locale: ru,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Duration */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Статус</p>
              <Badge variant={statusVariants[conversation.status]}>
                {statusLabels[conversation.status]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Длительность</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatDuration(conversation.duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Agent and Lead Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">AI Агент</p>
              </div>
              <p className="text-lg font-semibold">
                {conversation.agentId
                  ? typeof conversation.agentId === 'object'
                    ? (conversation.agentId as any).name || (conversation.agentId as any)._id
                    : conversation.agentId
                  : "Не указан"}
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Лид</p>
              </div>
              {conversation.leadId ? (
                <p className="text-lg font-semibold">
                  {typeof conversation.leadId === 'object'
                    ? (conversation.leadId as any).name || (conversation.leadId as any)._id
                    : conversation.leadId}
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">Не назначен</p>
              )}
            </div>
          </div>

          {/* Phone Number */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Номер телефона</p>
            </div>
            <p className="text-lg font-semibold">{conversation.phoneNumber}</p>
          </div>

          {/* Transcript */}
          {conversation.transcript && (
            <div className="border rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Транскрипт разговора</p>
              <div className="max-h-[300px] overflow-y-auto bg-muted rounded p-3">
                <p className="text-sm whitespace-pre-wrap">{conversation.transcript}</p>
              </div>
            </div>
          )}

          {/* Recording */}
          {conversation.audioUrl && (
            <div className="flex justify-center">
              <Button
                onClick={() => playRecording(conversation.audioUrl!)}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                Прослушать запись
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
