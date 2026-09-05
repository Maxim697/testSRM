"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Невірний email або пароль.";
  }
  if (message.includes("Email not confirmed")) {
    return "Електронну пошту не підтверджено.";
  }
  return "Не вдалося увійти. Спробуйте ще раз.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(translateAuthError(signInError.message));
      setLoading(false);
      return;
    }

    router.push("/my-day");
  }

  return (
    <div className="flex h-full items-center justify-center bg-surface-0 p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-text-primary">CRM платформа</h1>
        <p className="mt-1 text-base text-text-secondary">
          Увійдіть, щоб продовжити роботу
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs text-text-secondary">
              Електронна пошта
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs text-text-secondary">
              Пароль
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Вхід…" : "Увійти"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
