import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2, QrCode, CheckCircle2, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { callEdge } from "@/lib/edge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Firma do 7" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["wa-status"],
    queryFn: async () => {
      try {
        return await callEdge<{ status: string; phone: string | null }>(
          "connection-status",
          { method: "GET" },
        );
      } catch {
        return { status: "CLOSE", phone: null };
      }
    },
    refetchInterval: 3000,
  });

  const session = useQuery({
    queryKey: ["wa-session"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("instance_name, status, phone")
        .maybeSingle();
      return data;
    },
  });

  const qr = useQuery({
    queryKey: ["wa-qr", status.data?.status],
    queryFn: async () =>
      callEdge<{ qr: string | null }>("connect-instance", { method: "GET" }),
    enabled: status.data?.status !== "OPEN",
    refetchInterval: 25000,
  });

  const createInstance = useMutation({
    mutationFn: () => callEdge("create-instance", { method: "POST" }),
    onSuccess: () => {
      toast.success("Instância pronta");
      qc.invalidateQueries({ queryKey: ["wa-qr"] });
      qc.invalidateQueries({ queryKey: ["wa-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logout = useMutation({
    mutationFn: () => callEdge("logout-instance", { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Desconectado");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!session.data) createInstance.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.data]);

  const connected = status.data?.status === "OPEN";
  const qrSrc = qr.data?.qr
    ? qr.data.qr.startsWith("data:")
      ? qr.data.qr
      : `data:image/png;base64,${qr.data.qr.replace(/^data:image\/png;base64,/, "")}`
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conexão do WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada usuário possui sua própria instância isolada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected
                  ? "bg-primary"
                  : status.data?.status === "CONNECTING"
                    ? "bg-warning"
                    : "bg-muted-foreground"
              }`}
            />
            Status: {connected ? "Conectado" : status.data?.status ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">WhatsApp ativo</p>
                  <p className="text-sm text-muted-foreground">
                    {status.data?.phone ?? session.data?.phone ?? "Conectado"}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center aspect-square max-w-[300px] mx-auto rounded-lg border border-border bg-muted/30">
                {qr.isLoading || createInstance.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : qrSrc ? (
                  <img src={qrSrc} alt="QR Code WhatsApp" className="w-full h-full p-4" />
                ) : (
                  <div className="text-center text-muted-foreground p-6">
                    <QrCode className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">Aguardando QR...</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Abra o WhatsApp no celular → Aparelhos conectados → Conectar
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  createInstance.mutate();
                  qr.refetch();
                }}
                disabled={createInstance.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar QR
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
