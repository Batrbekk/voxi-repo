"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Manager } from "@/types";
import { useManagerStore } from "@/store/manager";
import { toast } from "sonner";

const editManagerSchema = z.object({
  canViewAllLeads: z.boolean(),
  canTakeLeads: z.boolean(),
  canEditLeads: z.boolean(),
  canMakeCallsAsAgent: z.boolean(),
  canViewAnalytics: z.boolean(),
  canManageOwnLeads: z.boolean(),
});

type EditManagerFormData = z.infer<typeof editManagerSchema>;

interface EditManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager;
}

export function EditManagerDialog({
  open,
  onOpenChange,
  manager,
}: EditManagerDialogProps) {
  const { updateManager } = useManagerStore();

  const form = useForm<EditManagerFormData>({
    resolver: zodResolver(editManagerSchema),
    defaultValues: {
      canViewAllLeads: true,
      canTakeLeads: true,
      canEditLeads: true,
      canMakeCallsAsAgent: true,
      canViewAnalytics: false,
      canManageOwnLeads: true,
    },
  });

  useEffect(() => {
    if (manager) {
      form.reset({
        canViewAllLeads: manager.permissions.canViewAllLeads,
        canTakeLeads: manager.permissions.canTakeLeads,
        canEditLeads: manager.permissions.canEditLeads,
        canMakeCallsAsAgent: manager.permissions.canMakeCallsAsAgent,
        canViewAnalytics: manager.permissions.canViewAnalytics,
        canManageOwnLeads: manager.permissions.canManageOwnLeads,
      });
    }
  }, [manager, form]);

  const onSubmit = async (data: EditManagerFormData) => {
    try {
      await updateManager(manager._id, {
        permissions: data,
      });

      toast.success("Права обновлены");
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Не удалось обновить права";
      toast.error(message);
      console.error(error);
    }
  };

  const getManagerName = () => {
    if (manager.userId.firstName && manager.userId.lastName) {
      return `${manager.userId.firstName} ${manager.userId.lastName}`;
    }
    return manager.userId.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать права менеджера</DialogTitle>
          <DialogDescription>{getManagerName()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="canViewAllLeads"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Просмотр всех лидов</FormLabel>
                      <FormDescription>
                        Может видеть лиды других менеджеров
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canTakeLeads"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Взятие лидов из пула</FormLabel>
                      <FormDescription>
                        Может брать лиды из общего пула
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canEditLeads"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Редактирование лидов</FormLabel>
                      <FormDescription>
                        Может редактировать информацию о лидах
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canManageOwnLeads"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Управление своими лидами</FormLabel>
                      <FormDescription>
                        Может управлять назначенными ему лидами
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canMakeCallsAsAgent"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Звонки как агент</FormLabel>
                      <FormDescription>
                        Может совершать звонки от имени AI агента
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="canViewAnalytics"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Просмотр аналитики</FormLabel>
                      <FormDescription>
                        Может видеть аналитику и статистику компании
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
