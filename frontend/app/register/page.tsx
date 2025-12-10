"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { AuthDecorator } from "@/components/auth/auth-decorator";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { PasswordRequirements } from "@/components/auth/password-requirements";

const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

const registerSchema = z
  .object({
    companyName: z.string().min(2, "Название компании обязательно"),
    email: z.string().email("Неверный формат email"),
    password: z
      .string()
      .min(1, "Пароль обязателен")
      .refine(
        (val) =>
          val.length >= 8 &&
          /[A-Z]/.test(val) &&
          /[0-9]/.test(val) &&
          /[!@#$%^&*(),.?":{}|<>]/.test(val),
        {
          message: "Пароль не соответствует требованиям",
        }
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.companyName,
          email: data.email,
          password: data.password,
          createCompany: true,
          companyEmail: data.email, // Use the same email for company
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при регистрации');
      }

      toast.success("Регистрация успешна! Проверьте email для подтверждения.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Ошибка при регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AuthDecorator />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к входу
          </button>

          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Создать аккаунт
            </h1>
            <p className="text-sm text-muted-foreground">
              Заполните данные для регистрации
            </p>
          </div>

          <div className={cn("grid gap-6")}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название компании</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ООО 'Моя компания'"
                          autoCapitalize="none"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@company.kz"
                          type="email"
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Введите пароль"
                          autoCapitalize="none"
                          autoComplete="new-password"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setPassword(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                      <PasswordRequirements password={password} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Подтвердите пароль</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Повторите пароль"
                          autoCapitalize="none"
                          autoComplete="new-password"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Зарегистрироваться
                </Button>
              </form>
            </Form>
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Уже есть аккаунт?</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Войти
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
