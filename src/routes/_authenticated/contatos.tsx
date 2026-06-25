import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { callEdge } from "@/lib/edge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contatos")({
  head: () => ({ meta: [{ title: "Contatos — Firma do 7" }] }),
  component: ContatosPage,
});

type Filter = "all" | "valid" | "invalid" | "pending";

function ContatosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const list = useQuery({
    queryKey: ["contacts", filter, search],
    queryFn: async () => {
      let q = supabase
        .from("contacts")
        .select("id, name, cpf, phone_original, phone_normalized, valid_whatsapp, validated_at, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "valid") q = q.eq("valid_whatsapp", true);
      if (filter === "invalid") q = q.eq("valid_whatsapp", false);
      if (filter === "pending") q = q.is("valid_whatsapp", null);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},phone_original.ilike.${s},phone_normalized.ilike.${s}`);
      }
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const validate = useMutation({
    mutationFn: async () => {
      // Loop until done
      let processed = 0;
      let total = 0;
      // Get initial pending count
      const { count } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .is("valid_whatsapp", null);
      total = count ?? 0;
      if (total === 0) {
        toast.info("Nada para validar");
        return;
      }
      setProgress({ done: 0, total });
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await callEdge<{ processed: number; remaining: number; done: boolean }>(
          "validate-contacts",
          { method: "POST", body: {} },
        );
        processed += res.processed;
        setProgress({ done: total - res.remaining, total });
        if (res.done || res.processed === 0) break;
      }
      return processed;
    },
    onSuccess: (n) => {
      if (n) toast.success(`Validação concluída: ${n} contatos`);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setProgress(null),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.count.toLocaleString("pt-BR") ?? 0} registros encontrados
          </p>
        </div>
        <Button onClick={() => validate.mutate()} disabled={validate.isPending}>
          {validate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Validar pendentes
        </Button>
      </div>

      {progress && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Validando…</span>
              <span className="text-muted-foreground">
                {progress.done.toLocaleString("pt-BR")} /{" "}
                {progress.total.toLocaleString("pt-BR")}
              </span>
            </div>
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="valid">Válidos</TabsTrigger>
            <TabsTrigger value="invalid">Inválidos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome ou telefone..."
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : list.data?.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Sem contatos.
                  </TableCell>
                </TableRow>
              ) : (
                list.data?.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.cpf ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div>{r.phone_normalized ?? r.phone_original}</div>
                      {r.phone_normalized && r.phone_original !== r.phone_normalized && (
                        <div className="text-muted-foreground">{r.phone_original}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.valid_whatsapp === true ? (
                        <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-primary/30">
                          Válido
                        </Badge>
                      ) : r.valid_whatsapp === false ? (
                        <Badge variant="outline" className="border-destructive/40 text-destructive">
                          Inválido
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {(list.data?.count ?? 0) > 200 && (
        <p className="text-xs text-muted-foreground">
          Mostrando os 200 mais recentes. Use a busca para refinar.
        </p>
      )}
    </div>
  );
}
