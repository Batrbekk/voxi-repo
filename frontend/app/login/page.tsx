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
  FormMessage,
} from "@/components/ui/form";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { AuthDecorator } from "@/components/auth/auth-decorator";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(1, "Пароль обязателен"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Успешный вход!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка входа");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <AuthDecorator />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Добро пожаловать
            </h1>
            <p className="text-sm text-muted-foreground">
              Введите свои данные для входа в систему
            </p>
          </div>
          <div className={cn("grid gap-6")}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="E-mail"
                          type="email"
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          placeholder="Пароль"
                          autoCapitalize="none"
                          autoComplete="current-password"
                          autoCorrect="off"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-end w-full mb-2">
                  <button
                    type="button"
                    onClick={() => router.push("/forgot-password")}
                    className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Войти
                </Button>
              </form>
            </Form>
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Нет аккаунта?</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/register")}
                className="w-full"
              >
                Зарегистрироваться
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
