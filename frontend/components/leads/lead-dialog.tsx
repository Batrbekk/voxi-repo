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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lead, LeadStatus } from "@/types";
import { useLeadStore } from "@/store/lead";
import { toast } from "sonner";

const leadSchema = z.object({
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  phone: z.string().min(10, "Введите корректный номер телефона"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  notes: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
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

export function LeadDialog({ open, onOpenChange, lead }: LeadDialogProps) {
  const { createLead, updateLead } = useLeadStore();

  const form = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      status: LeadStatus.NEW,
      notes: [],
      metadata: {},
    },
  });

  useEffect(() => {
    if (lead) {
      form.reset({
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email || "",
        status: lead.status,
        notes: lead.notes || [],
        metadata: lead.customFields || {},
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        status: LeadStatus.NEW,
        notes: [],
        metadata: {},
      });
    }
  }, [lead, form]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      const leadData = {
        ...data,
        email: data.email || undefined,
      };

      if (lead) {
        await updateLead(lead._id, leadData);
        toast.success("Лид обновлен");
      } else {
        await createLead(leadData);
        toast.success("Лид создан");
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Ошибка при сохранении лида");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lead ? "Редактировать лида" : "Добавить лида"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о потенциальном клиенте
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Телефон</FormLabel>
                  <FormControl>
                    <Input placeholder="+7 (999) 123-45-67" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (опционально)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Статус</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(LeadStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Заметки</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Дополнительная информация..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">
                {lead ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
