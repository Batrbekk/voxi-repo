"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadStore } from "@/store/lead";
import { LeadDialog } from "@/components/leads/lead-dialog";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadStatus } from "@/types";

export default function LeadsPage() {
  const { leads, fetchLeads, loading } = useLeadStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    handleFetch();
  }, []);

  const handleFetch = () => {
    const filters: any = {};
    if (searchQuery) filters.search = searchQuery;
    if (statusFilter !== "all") filters.status = statusFilter;
    fetchLeads(filters).catch(console.error);
  };

  const handleSearch = () => {
    handleFetch();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as LeadStatus | "all");
  };

  useEffect(() => {
    handleFetch();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Лиды</h1>
          <p className="text-muted-foreground">
            Управление базой потенциальных клиентов
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить лид
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или телефону..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value={LeadStatus.NEW}>Новый</SelectItem>
                <SelectItem value={LeadStatus.CONTACTED}>Связались</SelectItem>
                <SelectItem value={LeadStatus.QUALIFIED}>
                  Квалифицирован
                </SelectItem>
                <SelectItem value={LeadStatus.PROPOSAL}>Предложение</SelectItem>
                <SelectItem value={LeadStatus.NEGOTIATION}>Переговоры</SelectItem>
                <SelectItem value={LeadStatus.CLOSED_WON}>Сделка закрыта</SelectItem>
                <SelectItem value={LeadStatus.CLOSED_LOST}>Потерян</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>Поиск</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список лидов ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет лидов. Добавьте первого лида.
            </div>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </CardContent>
      </Card>

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
