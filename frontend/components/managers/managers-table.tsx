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
import { Edit, Trash2, UserX, Check, X } from "lucide-react";
import { Manager } from "@/types";
import { useManagerStore } from "@/store/manager";
import { EditManagerDialog } from "./edit-manager-dialog";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ManagersTableProps {
  managers: Manager[];
}

export function ManagersTable({ managers }: ManagersTableProps) {
  const { deleteManager, deactivateManager } = useManagerStore();
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [deletingManager, setDeletingManager] = useState<Manager | null>(null);
  const [deactivatingManager, setDeactivatingManager] =
    useState<Manager | null>(null);

  const handleDelete = async () => {
    if (deletingManager) {
      try {
        await deleteManager(deletingManager._id);
        toast.success("Менеджер удален");
        setDeletingManager(null);
      } catch (error) {
        toast.error("Не удалось удалить менеджера");
        console.error("Failed to delete manager:", error);
      }
    }
  };

  const handleDeactivate = async () => {
    if (deactivatingManager) {
      try {
        await deactivateManager(deactivatingManager._id);
        toast.success("Менеджер деактивирован");
        setDeactivatingManager(null);
      } catch (error) {
        toast.error("Не удалось деактивировать менеджера");
        console.error("Failed to deactivate manager:", error);
      }
    }
  };

  const getManagerName = (manager: Manager) => {
    if (manager.userId.firstName && manager.userId.lastName) {
      return `${manager.userId.firstName} ${manager.userId.lastName}`;
    }
    return manager.userId.email;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Лиды</TableHead>
            <TableHead>Звонки</TableHead>
            <TableHead>Конверсии</TableHead>
            <TableHead>Дата приглашения</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager) => (
            <TableRow key={manager._id}>
              <TableCell className="font-medium">
                {getManagerName(manager)}
              </TableCell>
              <TableCell>{manager.userId.email}</TableCell>
              <TableCell>{manager.assignedLeadsCount}</TableCell>
              <TableCell>{manager.completedCallsCount}</TableCell>
              <TableCell>{manager.successfulConversionsCount}</TableCell>
              <TableCell>
                {format(new Date(manager.invitedAt), "dd MMM yyyy", {
                  locale: ru,
                })}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {manager.isActive ? (
                    <Badge variant="default" className="w-fit">
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-fit">
                      Неактивен
                    </Badge>
                  )}
                  {!manager.hasChangedPassword && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Не завершил регистрацию
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingManager(manager)}
                    title="Редактировать права"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {manager.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeactivatingManager(manager)}
                      title="Деактивировать"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingManager(manager)}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editingManager && (
        <EditManagerDialog
          open={!!editingManager}
          onOpenChange={(open) => !open && setEditingManager(null)}
          manager={editingManager}
        />
      )}

      <AlertDialog
        open={!!deletingManager}
        onOpenChange={(open) => !open && setDeletingManager(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить менеджера?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить менеджера &quot;
              {deletingManager && getManagerName(deletingManager)}&quot;? Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deactivatingManager}
        onOpenChange={(open) => !open && setDeactivatingManager(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Деактивировать менеджера?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите деактивировать менеджера &quot;
              {deactivatingManager && getManagerName(deactivatingManager)}&quot;?
              Менеджер не сможет войти в систему.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>
              Деактивировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
