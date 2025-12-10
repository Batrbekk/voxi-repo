"use client";

import { useState, useEffect } from "react";
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
import { Edit, Trash2, UserPlus } from "lucide-react";
import { Lead, LeadStatus } from "@/types";
import { useLeadStore } from "@/store/lead";
import { useAgentStore } from "@/store/agent";
import { LeadDialog } from "./lead-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LeadsTableProps {
  leads: Lead[];
}

const statusLabels: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "Новый",
  [LeadStatus.CONTACTED]: "Связались",
  [LeadStatus.QUALIFIED]: "Квалифицирован",
  [LeadStatus.PROPOSAL]: "Предложение",
  [LeadStatus.NEGOTIATION]: "Переговоры",
  [LeadStatus.CLOSED_WON]: "Сделка закрыта",
  [LeadStatus.CLOSED_LOST]: "Потерян",
};

const statusVariants: Record<
  LeadStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [LeadStatus.NEW]: "default",
  [LeadStatus.CONTACTED]: "secondary",
  [LeadStatus.QUALIFIED]: "outline",
  [LeadStatus.PROPOSAL]: "secondary",
  [LeadStatus.NEGOTIATION]: "secondary",
  [LeadStatus.CLOSED_WON]: "default",
  [LeadStatus.CLOSED_LOST]: "destructive",
};

export function LeadsTable({ leads }: LeadsTableProps) {
  const { deleteLead, assignLeadToAgent } = useLeadStore();
  const { agents, fetchAgents } = useAgentStore();
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents().catch(console.error);
    }
  }, []);

  const handleDelete = async () => {
    if (deletingLead) {
      try {
        await deleteLead(deletingLead._id);
        toast.success("Лид удален");
        setDeletingLead(null);
      } catch (error) {
        toast.error("Ошибка при удалении лида");
        console.error("Failed to delete lead:", error);
      }
    }
  };

  const handleAssignAgent = async (leadId: string, agentId: string) => {
    try {
      await assignLeadToAgent(leadId, agentId);
      toast.success("Агент назначен");
    } catch (error) {
      toast.error("Ошибка при назначении агента");
      console.error("Failed to assign agent:", error);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Агент</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead._id}>
              <TableCell className="font-medium">
                {lead.firstName} {lead.lastName}
              </TableCell>
              <TableCell>{lead.phone}</TableCell>
              <TableCell>{lead.email || "-"}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[lead.status]}>
                  {statusLabels[lead.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={lead.assignedTo || "unassigned"}
                  onValueChange={(value) =>
                    value !== "unassigned" && handleAssignAgent(lead._id, value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Не назначен" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Не назначен</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent._id} value={agent._id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingLead(lead)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingLead(lead)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingLead && (
        <LeadDialog
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          lead={editingLead}
        />
      )}

      <AlertDialog
        open={!!deletingLead}
        onOpenChange={(open) => !open && setDeletingLead(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить лида?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить лида &quot;{deletingLead?.firstName}{" "}
              {deletingLead?.lastName}&quot;? Это действие нельзя отменить.
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
