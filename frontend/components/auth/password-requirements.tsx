"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    {
      label: "Минимум 8 символов",
      met: password.length >= 8,
    },
    {
      label: "Одна заглавная буква",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Одна цифра",
      met: /[0-9]/.test(password),
    },
    {
      label: "Один специальный символ",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  return (
    <div className="space-y-2 mt-2">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            req.met ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {req.met ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
}
