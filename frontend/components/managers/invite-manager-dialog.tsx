"use client";

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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useManagerStore } from "@/store/manager";
import { toast } from "sonner";

const inviteManagerSchema = z.object({
  email: z.string().email("Некорректный email"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  canViewAllLeads: z.boolean().default(true),
  canTakeLeads: z.boolean().default(true),
  canEditLeads: z.boolean().default(true),
  canMakeCallsAsAgent: z.boolean().default(true),
  canViewAnalytics: z.boolean().default(false),
  canManageOwnLeads: z.boolean().default(true),
});

type InviteManagerFormData = z.infer<typeof inviteManagerSchema>;

interface InviteManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteManagerDialog({
  open,
  onOpenChange,
}: InviteManagerDialogProps) {
  const { inviteManager } = useManagerStore();

  const form = useForm({
    resolver: zodResolver(inviteManagerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      canViewAllLeads: true,
      canTakeLeads: true,
      canEditLeads: true,
      canMakeCallsAsAgent: true,
      canViewAnalytics: false,
      canManageOwnLeads: true,
    },
  });

  const onSubmit = async (data: InviteManagerFormData) => {
    try {
      const { email, firstName, lastName, ...permissions } = data;

      await inviteManager({
        email,
        firstName,
        lastName,
        permissions,
      });

      toast.success("Приглашение отправлено");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Не удалось пригласить менеджера";
      toast.error(message);
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Пригласить менеджера</DialogTitle>
          <DialogDescription>
            Новый менеджер получит приглашение на email
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Иван" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия</FormLabel>
                    <FormControl>
                      <Input placeholder="Иванов" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="manager@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border rounded-lg p-4">
              <h3 className="font-semibold">Права доступа</h3>

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
              <Button type="submit">Пригласить</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
