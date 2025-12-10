"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Edit, Trash2, Play, Pause, AudioWaveform } from "lucide-react";
import { Agent } from "@/types";
import { useAgentStore } from "@/store/agent";
import { TestAgentDialog } from "./test-agent-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgentsTableProps {
  agents: Agent[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const router = useRouter();
  const { deleteAgent, updateAgent } = useAgentStore();
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);

  const handleToggleActive = async (agent: Agent) => {
    try {
      await updateAgent(agent._id, { isActive: !agent.isActive });
    } catch (error) {
      console.error("Failed to toggle agent status:", error);
    }
  };

  const handleDelete = async () => {
    if (deletingAgent) {
      try {
        await deleteAgent(deletingAgent._id);
        setDeletingAgent(null);
      } catch (error) {
        console.error("Failed to delete agent:", error);
      }
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Голос</TableHead>
            <TableHead>Модель AI</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent._id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                {agent.voiceSettings.voiceName || "По умолчанию"}
              </TableCell>
              <TableCell>{agent.aiSettings.model}</TableCell>
              <TableCell>
                {agent.isActive ? (
                  <Badge variant="default">Активен</Badge>
                ) : (
                  <Badge variant="secondary">Неактивен</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/agents/${agent._id}/test`)}
                    title="Тестировать агента"
                  >
                    <AudioWaveform className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(agent)}
                    title={agent.isActive ? "Деактивировать" : "Активировать"}
                  >
                    {agent.isActive ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/agents/${agent._id}/edit`)}
                    title="Редактировать агента"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingAgent(agent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {testingAgent && (
        <TestAgentDialog
          open={!!testingAgent}
          onOpenChange={(open) => !open && setTestingAgent(null)}
          agent={testingAgent}
        />
      )}

      <AlertDialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить агента?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить агента &quot;{deletingAgent?.name}
              &quot;? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
