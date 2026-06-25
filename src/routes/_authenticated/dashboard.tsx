import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquare,
  Upload,
  CheckCircle2,
  Download,
  Users,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Firma do 7" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [session, total, valid, invalid] = await Promise.all([
        supabase.from("whatsapp_sessions").select("status, phone").maybeSingle(),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("valid_whatsapp", true),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("valid_whatsapp", false),
      ]);
      return {
        status: session.data?.status ?? "CLOSE",
        phone: session.data?.phone ?? null,
        total: total.count ?? 0,
        valid: valid.count ?? 0,
        invalid: invalid.count ?? 0,
      };
    },
    refetchInterval: 5000,
  });

  const connected = stats?.status === "OPEN";

  const steps = [
    {
      n: 1,
      title: "Conectar WhatsApp",
      desc: "Escaneie o QR Code com seu celular.",
      to: "/whatsapp",
      icon: MessageSquare,
      done: connected,
    },
    {
      n: 2,
      title: "Enviar planilha",
      desc: "Suba um arquivo CSV ou XLSX.",
      to: "/upload",
      icon: Upload,
      done: (stats?.total ?? 0) > 0,
    },
    {
      n: 3,
      title: "Validar números",
      desc: "Processamos em lotes de 1.000.",
      to: "/contatos",
      icon: CheckCircle2,
      done: (stats?.valid ?? 0) + (stats?.invalid ?? 0) >= (stats?.total ?? 0) && (stats?.total ?? 0) > 0,
    },
    {
      n: 4,
      title: "Exportar resultados",
      desc: "Baixe CSV ou XLSX por categoria.",
      to: "/exportacao",
      icon: Download,
      done: false,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do seu fluxo de validação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="WhatsApp"
          value={connected ? "Conectado" : "Desconectado"}
          accent={connected ? "success" : "muted"}
          sub={stats?.phone ?? "—"}
          icon={MessageSquare}
        />
        <StatCard
          label="Total de contatos"
          value={(stats?.total ?? 0).toLocaleString("pt-BR")}
          icon={Users}
        />
        <StatCard
          label="Válidos"
          value={(stats?.valid ?? 0).toLocaleString("pt-BR")}
          accent="success"
          icon={CircleCheck}
        />
        <StatCard
          label="Inválidos"
          value={(stats?.invalid ?? 0).toLocaleString("pt-BR")}
          accent="destructive"
          icon={CircleX}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Fluxo em 4 passos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Link key={s.n} to={s.to} className="block group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Passo {s.n}</span>
                    {s.done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <CardTitle className="text-base flex items-center gap-2 mt-2">
                    <s.icon className="h-4 w-4 text-primary" />
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "success" | "destructive" | "muted";
}) {
  const accentClass =
    accent === "success"
      ? "text-primary"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
