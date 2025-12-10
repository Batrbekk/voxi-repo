"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import api from "@/lib/api";

export default function BatchCallsPage() {
  useEffect(() => {
    // Test API connection
    api.get('/phone/batch-calls')
      .then(res => console.log('Batch calls:', res.data))
      .catch(err => {
        console.error('Error loading batch calls:', err);
        toast.error('Ошибка загрузки массовых звонков');
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Массовые звонки</h1>
          <p className="text-muted-foreground">
            Управление массовыми кампаниями звонков
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список кампаний</CardTitle>
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
