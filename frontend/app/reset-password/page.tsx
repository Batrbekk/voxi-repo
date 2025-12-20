"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Загрузка...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
