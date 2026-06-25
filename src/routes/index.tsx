import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Firma do 7 — Validação de WhatsApp em massa" },
      {
        name: "description",
        content:
          "Conecte seu WhatsApp, envie sua planilha e valide milhares de números rapidamente.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              7
            </div>
            <span className="text-lg font-semibold tracking-tight">Firma do 7</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Criar conta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Plataforma interna
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Valide milhares de números de WhatsApp{" "}
              <span className="text-primary">em minutos</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Conecte sua instância, envie sua planilha de contatos e receba um relatório
              limpo com quem realmente tem WhatsApp ativo. Tudo em um único painel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Criar conta gratuita
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              title: "Conecte via QR Code",
              text: "Login direto no WhatsApp Web em segundos, uma instância por usuário.",
            },
            {
              icon: Zap,
              title: "Validação em lote",
              text: "Processamos 1.000 contatos por vez com barra de progresso ao vivo.",
            },
            {
              icon: ShieldCheck,
              title: "Privado e seguro",
              text: "Cada usuário vê apenas seus próprios dados. Chaves nunca expostas.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-16 grid gap-4 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                Pronto em quatro passos
              </h2>
              <p className="mt-3 text-muted-foreground">
                Conectar WhatsApp, enviar planilha, validar e exportar. Simples assim.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Conecte o WhatsApp escaneando o QR",
                "Faça upload da planilha CSV ou XLSX",
                "Inicie a validação em lotes de 1.000",
                "Exporte válidos, inválidos ou todos",
              ].map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Firma do 7 — Uso interno.
        </div>
      </footer>
    </div>
  );
}
