import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exportacao")({
  head: () => ({ meta: [{ title: "Exportação — Firma do 7" }] }),
  component: ExportPage,
});

type Scope = "valid" | "invalid" | "all";
type Format = "csv" | "xlsx";

function ExportPage() {
  const [scope, setScope] = useState<Scope>("valid");
  const [format, setFormat] = useState<Format>("csv");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      let q = supabase
        .from("contacts")
        .select("name, cpf, phone_original, phone_normalized, valid_whatsapp, validated_at, created_at")
        .order("created_at", { ascending: false });
      if (scope === "valid") q = q.eq("valid_whatsapp", true);
      if (scope === "invalid") q = q.eq("valid_whatsapp", false);

      // Pull in pages of 1000
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await q.range(from, from + pageSize - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }

      if (all.length === 0) {
        toast.info("Nada para exportar");
        return;
      }

      const rows = all.map((c) => ({
        nome: c.name ?? "",
        cpf: c.cpf ?? "",
        telefone_original: c.phone_original ?? "",
        telefone: c.phone_normalized ?? "",
        whatsapp_valido: c.valid_whatsapp === true ? "sim" : c.valid_whatsapp === false ? "não" : "pendente",
        validado_em: c.validated_at ?? "",
      }));

      const filename = `firma-do-7-${scope}-${new Date().toISOString().slice(0, 10)}`;

      if (format === "csv") {
        const ws = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
      } else {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Contatos");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
      }

      toast.success(`${all.length} registros exportados`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exportação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Baixe seus contatos validados em CSV ou XLSX.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que exportar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Escopo</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as Scope)}>
              {[
                { v: "valid", l: "Somente válidos" },
                { v: "invalid", l: "Somente inválidos" },
                { v: "all", l: "Todos" },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`s-${o.v}`} />
                  <Label htmlFor={`s-${o.v}`} className="cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">Formato</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as Format)}>
              {[
                { v: "csv", l: "CSV" },
                { v: "xlsx", l: "XLSX (Excel)" },
              ].map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`f-${o.v}`} />
                  <Label htmlFor={`f-${o.v}`} className="cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button onClick={run} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
