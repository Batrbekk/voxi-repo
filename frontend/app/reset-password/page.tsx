"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { AuthDecorator } from "@/components/auth/auth-decorator";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(128, "Пароль слишком длинный")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]/,
      "Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [passwordReset, setPasswordReset] = useState(false);
  const [password, setPassword] = useState("");

  // Проверка требований к паролю
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("Токен восстановления не найден");
      router.push("/login");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, router]);

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: ResetPasswordData) => {
    if (!token) {
      toast.error("Токен восстановления не найден");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при сбросе пароля');
      }

      setPasswordReset(true);
      toast.success("Пароль успешно изменен!");

      // Перенаправляем на страницу входа через 2 секунды
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Ошибка при сбросе пароля");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null; // или показать loader
  }

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
              Восстановление пароля
            </h1>
            <p className="text-sm text-muted-foreground">
              {passwordReset
                ? "Пароль успешно изменен"
                : "Введите новый пароль"}
            </p>
          </div>

          {passwordReset ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm text-center">
                  Ваш пароль был успешно изменен. Сейчас вы будете перенаправлены на страницу входа.
                </p>
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                Перейти к входу
              </Button>
            </div>
          ) : (
            <div className={cn("grid gap-6")}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PasswordInput
                            placeholder="Новый пароль"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PasswordInput
                            placeholder="Подтвердите новый пароль"
                            autoCapitalize="none"
                            autoComplete="new-password"
                            autoCorrect="off"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Требования к паролю с динамической подсветкой */}
                  {password && (
                    <div className="text-xs space-y-2 p-3 rounded-md border bg-muted/50">
                      <p className="font-medium text-muted-foreground mb-2">Требования к паролю:</p>
                      <ul className="space-y-1">
                        <li className={passwordRequirements.minLength ? "text-green-600" : "text-red-600"}>
                          {passwordRequirements.minLength ? "✓" : "✗"} Минимум 8 символов
                        </li>
                        <li className={passwordRequirements.hasUppercase ? "text-green-600" : "text-red-600"}>
                          {passwordRequirements.hasUppercase ? "✓" : "✗"} Одна заглавная буква (A-Z)
                        </li>
                        <li className={passwordRequirements.hasLowercase ? "text-green-600" : "text-red-600"}>
                          {passwordRequirements.hasLowercase ? "✓" : "✗"} Одна строчная буква (a-z)
                        </li>
                        <li className={passwordRequirements.hasNumber ? "text-green-600" : "text-red-600"}>
                          {passwordRequirements.hasNumber ? "✓" : "✗"} Одна цифра (0-9)
                        </li>
                        <li className={passwordRequirements.hasSpecial ? "text-green-600" : "text-red-600"}>
                          {passwordRequirements.hasSpecial ? "✓" : "✗"} Один спецсимвол (!@#$%^&* и т.д.)
                        </li>
                      </ul>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full cursor-pointer"
                  >
                    {isLoading && (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Изменить пароль
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
