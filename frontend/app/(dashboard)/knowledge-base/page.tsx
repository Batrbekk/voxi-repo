"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api";

export default function KnowledgeBasesPage() {
  useEffect(() => {
    // Test API connection
    api.get('/knowledge-bases')
      .then(res => console.log('Knowledge bases:', res.data))
      .catch(err => {
        console.error('Error loading knowledge bases:', err);
        toast.error('Ошибка загрузки баз знаний');
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Базы знаний</h1>
          <p className="text-muted-foreground">
            Управление базами знаний для AI агентов
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список баз знаний</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Страница в разработке. Проверьте консоль для отладки.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
