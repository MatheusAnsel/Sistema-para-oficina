"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/gestao/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível entrar");
      }
      // "proximo" vem da URL: so aceita caminho interno da propria gestao (evita redirecionar para outro site)
      const proximo = params.get("proximo") ?? "";
      router.push(/^\/gestao(\/|$|\?)/.test(proximo) ? proximo : "/gestao");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="wrap gestao-login">
      <form className="gestao-login-card" onSubmit={onSubmit}>
        <h1>Gestão de veículos</h1>
        <p className="section-lead">Acesso restrito à oficina.</p>

        <label className="form-group">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="form-group">
          <span>Senha</span>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>

        {erro && (
          <p className="status-error" role="alert">
            {erro}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
