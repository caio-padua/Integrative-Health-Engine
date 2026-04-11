import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useListarUsuarios, getListarUsuariosQueryKey, 
  useCriarUsuario,
  CriarUsuarioBodyPerfil,
  useListarUnidades, getListarUnidadesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Users, ShieldAlert, CloudUpload, FileText, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const usuarioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  perfil: z.nativeEnum(CriarUsuarioBodyPerfil),
  unidadeId: z.coerce.number().optional(),
});

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: usuarios, isLoading } = useListarUsuarios({}, {
    query: { queryKey: getListarUsuariosQueryKey({}) }
  });

  const { data: unidades } = useListarUnidades({
    query: { queryKey: getListarUnidadesQueryKey() }
  });
  
  const [open, setOpen] = useState(false);
  const criarUsuario = useCriarUsuario();
  const [backupResumo, setBackupResumo] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<any>(null);

  const handleBackup = async () => {
    if (backupResumo.trim().length < 5) {
      toast({ title: "Informe um resumo com pelo menos 5 caracteres", variant: "destructive" });
      return;
    }
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiUrl = `${window.location.origin}${baseUrl}api/backup-drive`.replace(/\/+/g, "/").replace(":/", "://");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumo: backupResumo.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ erro: `Erro do servidor (${res.status})` }));
        toast({ title: errorData.erro || `Erro ${res.status}`, variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.sucesso) {
        setBackupResult(data);
        setBackupResumo("");
        toast({ title: "Backup enviado com sucesso para o Google Drive!" });
      } else {
        toast({ title: data.erro || "Erro ao enviar backup", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexao com o servidor", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const form = useForm<z.infer<typeof usuarioSchema>>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      perfil: CriarUsuarioBodyPerfil.enfermeira,
      unidadeId: undefined,
    }
  });

  const onSubmit = (values: z.infer<typeof usuarioSchema>) => {
    criarUsuario.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListarUsuariosQueryKey({}) });
        setOpen(false);
        form.reset();
        toast({ title: "Usuário criado com sucesso." });
      }
    });
  };

  const getPerfilBadge = (perfil: string) => {
    switch(perfil) {
      case 'validador_mestre': return <Badge className="bg-primary text-primary-foreground border-none shadow-[0_0_10px_rgba(var(--primary),0.5)]"><ShieldAlert className="w-3 h-3 mr-1"/> Mestre</Badge>;
      case 'medico_tecnico': return <Badge variant="outline" className="text-blue-500 border-blue-500/50">Médico Téc.</Badge>;
      case 'validador_enfermeiro': return <Badge variant="outline" className="text-orange-500 border-orange-500/50">Validador Enf.</Badge>;
      default: return <Badge variant="secondary">Enfermeira</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-1">Configurações globais e gestão de usuários.</p>
          </div>
        </div>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Usuários do Sistema
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Usuário</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="senha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha Provisória</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="perfil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Perfil</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(CriarUsuarioBodyPerfil).map(([k, v]) => (
                                  <SelectItem key={k} value={v} className="capitalize">{k.replace('_', ' ')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unidadeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidade</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(parseInt(val))} 
                              defaultValue={field.value ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {unidades?.map(u => (
                                  <SelectItem key={u.id} value={u.id.toString()}>{u.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={criarUsuario.isPending}>
                      {criarUsuario.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {getPerfilBadge(u.perfil)}
                        </TableCell>
                        <TableCell className="text-sm">{u.unidadeNome || "Global"}</TableCell>
                        <TableCell className="text-right">
                          {u.ativo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Ativo</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">Inativo</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="w-5 h-5 text-primary" />
              Backup para Google Drive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envia 3 arquivos com CODIGO-FONTE COMPLETO para a pasta BANCO CODIGOS REPLIT GITHUB no Google Drive:
              Google Doc (leitura direta por IA), TXT e MD (Markdown formatado). Inclui schema do banco, rotas backend,
              paginas frontend, design system, usuarios demo. Qualquer IA (ChatGPT, Claude, Manus) consegue ler e entender
              o projeto inteiro abrindo qualquer um dos 3 arquivos.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="Descreva a melhoria implementada..."
                value={backupResumo}
                onChange={(e) => setBackupResumo(e.target.value)}
                className="flex-1"
                disabled={backupLoading}
              />
              <Button
                onClick={handleBackup}
                disabled={backupLoading || backupResumo.trim().length < 5}
              >
                {backupLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  <><CloudUpload className="mr-2 h-4 w-4" /> Enviar Backup</>
                )}
              </Button>
            </div>

            {backupResult && (
              <div className="rounded border border-green-500/30 bg-green-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Backup enviado com sucesso!
                </div>
                <div className="space-y-1">
                  {backupResult.arquivos?.map((arq: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span>{arq.tipo}: {arq.nome}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={backupResult.pasta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir pasta no Google Drive
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}