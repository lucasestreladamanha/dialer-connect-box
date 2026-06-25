import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload as UploadIcon, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/phone";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload — Firma do 7" }] }),
  component: UploadPage,
});

type ParsedRow = {
  name: string | null;
  cpf: string | null;
  phone_original: string;
  phone_normalized: string | null;
};

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve(r.data as Record<string, unknown>[]),
        error: reject,
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function detectColumns(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return { name: null, cpf: null, phone: null };
  const keys = Object.keys(rows[0]).map((k) => k.trim());
  const findKey = (...candidates: string[]) =>
    keys.find((k) =>
      candidates.some((c) => k.toLowerCase().includes(c)),
    ) ?? null;
  return {
    name: findKey("nome", "name"),
    cpf: findKey("cpf"),
    phone:
      findKey("telefone", "phone", "whats", "celular", "numero", "número") ??
      (keys.length === 1 ? keys[0] : null),
  };
}

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setProgress("Lendo arquivo...");
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) throw new Error("Planilha vazia");
      const cols = detectColumns(rows);
      if (!cols.phone) throw new Error("Não encontrei coluna de telefone");

      setProgress(`Normalizando ${rows.length.toLocaleString("pt-BR")} contatos...`);
      const parsed: ParsedRow[] = rows.map((r) => {
        const phoneOriginal = String(r[cols.phone!] ?? "").trim();
        return {
          name: cols.name ? String(r[cols.name] ?? "").trim() || null : null,
          cpf: cols.cpf ? String(r[cols.cpf] ?? "").trim() || null : null,
          phone_original: phoneOriginal,
          phone_normalized: normalizePhone(phoneOriginal),
        };
      }).filter((r) => r.phone_original);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      setProgress("Salvando upload...");
      const { data: upload, error: upErr } = await supabase
        .from("uploads")
        .insert({
          user_id: userId,
          file_name: file.name,
          total_contacts: parsed.length,
        })
        .select("id")
        .single();
      if (upErr) throw upErr;

      // Insert in chunks of 500
      for (let i = 0; i < parsed.length; i += 500) {
        const chunk = parsed.slice(i, i + 500).map((c) => ({
          ...c,
          user_id: userId,
          upload_id: upload.id,
        }));
        const { error } = await supabase.from("contacts").insert(chunk);
        if (error) throw error;
        setProgress(
          `Salvando contatos: ${Math.min(i + 500, parsed.length).toLocaleString("pt-BR")} / ${parsed.length.toLocaleString("pt-BR")}`,
        );
      }

      toast.success(`Upload concluído: ${parsed.length} contatos`);
      navigate({ to: "/contatos" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enviar planilha</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aceitamos CSV e XLSX. Detectamos colunas <code>nome</code>, <code>cpf</code> e{" "}
          <code>telefone</code> automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary/50 transition-colors">
            <UploadIcon className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {file ? file.name : "Clique para selecionar"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">CSV ou XLSX</p>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {progress && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {progress}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={!file || busy} className="w-full">
            {busy ? "Processando..." : "Enviar e normalizar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
