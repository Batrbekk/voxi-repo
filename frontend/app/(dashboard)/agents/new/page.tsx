"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgentStore } from "@/store/agent";
import { toast } from "sonner";
import api from "@/lib/api";

// Gemini Live voices
const GEMINI_LIVE_VOICES = [
  { id: 'Aoede', name: 'Aoede', description: 'Чистый, нейтральный голос (рекомендуется для русского)', languages: ['ru', 'en', 'kz'] },
  { id: 'Orbit', name: 'Orbit', description: 'Универсальный голос с естественной интонацией', languages: ['ru', 'en', 'kz'] },
  { id: 'Vale', name: 'Vale', description: 'Естественный и выразительный голос', languages: ['ru', 'en'] },
  { id: 'Puck', name: 'Puck', description: 'Дружелюбный и разговорный голос (английский)', languages: ['en'] },
  { id: 'Charon', name: 'Charon', description: 'Спокойный и профессиональный голос', languages: ['en'] },
  { id: 'Kore', name: 'Kore', description: 'Теплый и вовлекающий голос', languages: ['en'] },
  { id: 'Fenrir', name: 'Fenrir', description: 'Глубокий и авторитетный голос', languages: ['en'] },
];

const agentSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),

  // Voice settings
  voiceName: z.string().min(1, "Выберите голос"),
  language: z.enum(['ru', 'en', 'kz']),
  speakingRate: z.number().min(0.5).max(2),
  pitch: z.number().min(-10).max(10),

  // AI settings
  model: z.string(),
  systemPrompt: z.string().min(1, "Системный промпт обязателен"),
  temperature: z.number().min(0).max(1),
  responseModalities: z.array(z.enum(['AUDIO', 'TEXT'])),

  // Greeting messages
  inboundGreetingMessage: z.string().optional(),
  outboundGreetingMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
  endingMessage: z.string().optional(),

  // Knowledge base
  knowledgeBaseId: z.string().optional(),

  // Working hours
  workingHoursEnabled: z.boolean(),
  timezone: z.string(),
  workingHoursStart: z.string(),
  workingHoursEnd: z.string(),
  workDays: z.array(z.number()),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function NewAgentPage() {
  const router = useRouter();
  const { createAgent } = useAgentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      description: "",
      voiceName: "Aoede",
      language: "ru",
      speakingRate: 1.0,
      pitch: 0,
      model: "gemini-2.0-flash-exp",
      systemPrompt: "Ты дружелюбный и профессиональный AI ассистент компании. Отвечай вежливо и по существу.",
      temperature: 0.7,
      responseModalities: ['AUDIO', 'TEXT'],
      inboundGreetingMessage: "Здравствуйте! Спасибо за звонок. Чем могу помочь?",
      outboundGreetingMessage: "Добрый день! Меня зовут AI ассистент. Звоню из компании...",
      fallbackMessage: "Извините, не совсем понял. Можете повторить?",
      endingMessage: "Спасибо за обращение! Хорошего дня!",
      knowledgeBaseId: "",
      workingHoursEnabled: false,
      timezone: "Asia/Almaty",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      workDays: [1, 2, 3, 4, 5],
    },
  });

  // Load knowledge bases
  useEffect(() => {
    loadKnowledgeBases();
    loadAvailableVoices();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      const response = await api.get("/knowledge-bases");
      setKnowledgeBases(response.data.data || []);
    } catch (error) {
      console.error("Failed to load knowledge bases:", error);
    }
  };

  const loadAvailableVoices = async () => {
    try {
      const response = await api.get("/agents/voices");
      setAvailableVoices(response.data.voices || GEMINI_LIVE_VOICES);
    } catch (error) {
      console.error("Failed to load voices:", error);
      setAvailableVoices(GEMINI_LIVE_VOICES);
    }
  };

  const onSubmit = async (data: AgentFormData) => {
    try {
      setIsSubmitting(true);

      const agentData: any = {
        name: data.name,
        description: data.description,
        voiceSettings: {
          voiceName: data.voiceName,
          language: data.language,
          speakingRate: data.speakingRate,
          pitch: data.pitch,
        },
        aiSettings: {
          model: data.model,
          systemPrompt: data.systemPrompt,
          temperature: data.temperature,
          responseModalities: data.responseModalities,
        },
        inboundGreetingMessage: data.inboundGreetingMessage,
        outboundGreetingMessage: data.outboundGreetingMessage,
        fallbackMessage: data.fallbackMessage,
        endingMessage: data.endingMessage,
        knowledgeBaseId: data.knowledgeBaseId || undefined,
        workingHours: data.workingHoursEnabled ? {
          enabled: true,
          timezone: data.timezone,
          start: data.workingHoursStart,
          end: data.workingHoursEnd,
          workDays: data.workDays,
        } : undefined,
      };

      await createAgent(agentData);
      toast.success("Агент успешно создан!");
      router.push("/agents");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка при создании агента");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter voices by selected language
  const selectedLanguage = form.watch("language");
  const filteredVoices = availableVoices.filter(voice =>
    voice.languages.includes(selectedLanguage)
  );

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <Link href="/agents">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад к списку агентов
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Создать нового агента</h1>
        <p className="text-muted-foreground mt-2">
          Настройте AI агента с использованием Gemini Live API для естественных разговоров
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Основное</TabsTrigger>
              <TabsTrigger value="voice">Голос</TabsTrigger>
              <TabsTrigger value="ai">AI настройки</TabsTrigger>
              <TabsTrigger value="messages">Сообщения</TabsTrigger>
              <TabsTrigger value="schedule">Расписание</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Основная информация</CardTitle>
                  <CardDescription>
                    Базовые настройки агента
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название агента *</FormLabel>
                        <FormControl>
                          <Input placeholder="Например: Менеджер по продажам" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Описание</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Опишите роль и задачи агента..."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Краткое описание для внутреннего использования
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="knowledgeBaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>База знаний (RAG)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите базу знаний (опционально)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {knowledgeBases.map((kb) => (
                              <SelectItem key={kb._id} value={kb._id}>
                                {kb.name} ({kb.totalDocuments} документов)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Агент будет использовать эту базу для ответов на вопросы
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voice Tab */}
            <TabsContent value="voice">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки голоса</CardTitle>
                  <CardDescription>
                    Голос и речевые характеристики агента (Gemini Live)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Язык</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ru">Русский</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="kz">Қазақша</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="voiceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Голос Gemini Live</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredVoices.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name} - {voice.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Выберите голос для агента. Gemini Live автоматически адаптирует интонации.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="speakingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Скорость речи: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0.5}
                            max={2}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Влияет через промпт (Gemini Live не поддерживает прямую настройку)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pitch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тон голоса: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={-10}
                            max={10}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Влияет через промпт (Gemini Live не поддерживает прямую настройку)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle>Настройки AI</CardTitle>
                  <CardDescription>
                    Параметры искусственного интеллекта
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Модель</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gemini-2.0-flash-exp">
                              Gemini 2.0 Flash (Рекомендуется для Gemini Live)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Системный промпт *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Опишите роль, поведение и знания агента..."
                            {...field}
                            rows={6}
                          />
                        </FormControl>
                        <FormDescription>
                          Инструкции, определяющие поведение и знания агента
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature: {field.value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormDescription>
                          Креативность ответов (0 - точные, 1 - креативные)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseModalities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Модальности ответа</FormLabel>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="audio-modality"
                              checked={field.value?.includes('AUDIO') ?? false}
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                const newValue = e.target.checked
                                  ? [...currentValue, 'AUDIO']
                                  : currentValue.filter(v => v !== 'AUDIO');
                                field.onChange(newValue);
                              }}
                              className="h-4 w-4"
                            />
                            <label htmlFor="audio-modality" className="text-sm font-normal">Аудио ответы</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="text-modality"
                              checked={field.value?.includes('TEXT') ?? false}
                              onChange={(e) => {
                                const currentValue = field.value || [];
                                const newValue = e.target.checked
                                  ? [...currentValue, 'TEXT']
                                  : currentValue.filter(v => v !== 'TEXT');
                                field.onChange(newValue);
                              }}
                              className="h-4 w-4"
                            />
                            <label htmlFor="text-modality" className="text-sm font-normal">Текстовые ответы</label>
                          </div>
                        </div>
                        <FormDescription>
                          Выберите форматы ответов агента
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Приветственные и служебные сообщения</CardTitle>
                  <CardDescription>
                    Настройте сообщения для различных ситуаций
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="inboundGreetingMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Приветствие для входящих звонков</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Здравствуйте! Спасибо за звонок..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Первое сообщение при ответе на входящий звонок
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outboundGreetingMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Приветствие для исходящих звонков</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Добрый день! Меня зовут..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          Первое сообщение при исходящем звонке
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fallbackMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сообщение при непонимании</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Извините, не совсем понял..."
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormDescription>
                          Когда агент не понимает запрос
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endingMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Завершающее сообщение</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Спасибо за обращение! Хорошего дня!"
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormDescription>
                          Сообщение при завершении разговора
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle>Рабочее расписание</CardTitle>
                  <CardDescription>
                    Настройте время работы агента
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="workingHoursEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Включить рабочее расписание</FormLabel>
                          <FormDescription>
                            Агент будет работать только в указанное время
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

                  {form.watch("workingHoursEnabled") && (
                    <>
                      <FormField
                        control={form.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Часовой пояс</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Asia/Almaty">Алматы (GMT+6)</SelectItem>
                                <SelectItem value="Europe/Moscow">Москва (GMT+3)</SelectItem>
                                <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="workingHoursStart"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Начало работы</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workingHoursEnd"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Конец работы</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="workDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Рабочие дни</FormLabel>
                            <div className="grid grid-cols-7 gap-2">
                              {[
                                { value: 1, label: "Пн" },
                                { value: 2, label: "Вт" },
                                { value: 3, label: "Ср" },
                                { value: 4, label: "Чт" },
                                { value: 5, label: "Пт" },
                                { value: 6, label: "Сб" },
                                { value: 0, label: "Вс" },
                              ].map((day) => (
                                <div key={day.value}>
                                  <input
                                    type="checkbox"
                                    id={`day-${day.value}`}
                                    checked={field.value?.includes(day.value) ?? false}
                                    onChange={(e) => {
                                      const currentValue = field.value || [];
                                      const newValue = e.target.checked
                                        ? [...currentValue, day.value]
                                        : currentValue.filter(v => v !== day.value);
                                      field.onChange(newValue);
                                    }}
                                    className="sr-only"
                                  />
                                  <label
                                    htmlFor={`day-${day.value}`}
                                    className={`block text-center py-2 px-3 border rounded cursor-pointer transition-colors ${
                                      field.value?.includes(day.value)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-background hover:bg-muted'
                                    }`}
                                  >
                                    {day.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/agents")}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Создание...
                </>
              ) : (
                "Создать агента"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}