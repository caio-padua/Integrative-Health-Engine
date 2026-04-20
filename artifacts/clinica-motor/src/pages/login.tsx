import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity, Sparkles } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  senha: z.string().min(1, { message: "Senha é obrigatória" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "validador@motorclinico.com",
      senha: "senha",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const onSubmit = (data: LoginFormValues) => {
    login(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--pw-pergaminho)]">
        <Activity className="animate-spin text-[var(--pw-petroleo)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--pw-pergaminho)]">
      {/* Padrão sutil de pergaminho — gradiente diagonal */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, var(--pw-marfim) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, var(--pw-dourado-suave) 0%, transparent 50%)`,
        }}
      />

      <Card className="w-full max-w-md relative z-10 pw-card rounded-none border-2 border-[var(--pw-marfim)] bg-[var(--pw-offwhite)]">
        {/* Borda dourada superior */}
        <div className="h-1 bg-gradient-to-r from-[var(--pw-dourado)] via-[var(--pw-dourado-vivo)] to-[var(--pw-dourado)]" />

        <CardHeader className="space-y-3 text-center pb-6 border-b border-[var(--pw-marfim)] pt-8">
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 flex items-center justify-center border-2 border-[var(--pw-dourado)] bg-white p-2 rounded-none">
              <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="pw-titulo-manifesto text-3xl text-[var(--pw-petroleo)] uppercase">
            PAWARDS
          </CardTitle>
          <span className="pw-selo-dourado px-3 py-1 inline-block mx-auto text-[10px] tracking-[0.3em]">
            <Sparkles className="w-3 h-3 inline mr-1 mb-[2px]" />
            PADCON · MEDCORE
          </span>
          <p className="text-xs text-[var(--pw-cinza-bruma)] tracking-[0.2em] uppercase pt-1">
            Onde o caos vira fluxo
          </p>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] text-[var(--pw-tinta)] font-semibold">
                      E-mail
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="usuario@pawards.com.br"
                        {...field}
                        className="bg-white border-[var(--pw-marfim)] rounded-none h-11 focus:border-[var(--pw-petroleo)] text-[var(--pw-grafite)]"
                        data-testid="input-email"
                      />
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
                    <FormLabel className="text-[10px] uppercase tracking-[0.2em] text-[var(--pw-tinta)] font-semibold">
                      Senha
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="bg-white border-[var(--pw-marfim)] rounded-none h-11 focus:border-[var(--pw-petroleo)] text-[var(--pw-grafite)]"
                        data-testid="input-senha"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 mt-6 font-semibold uppercase tracking-[0.2em] rounded-none bg-[var(--pw-petroleo)] hover:bg-[var(--pw-petroleo-escuro)] text-white text-sm transition-all"
                data-testid="button-login"
              >
                Entrar no Motor
              </Button>
            </form>
          </Form>

          <p className="text-center text-[10px] text-[var(--pw-cinza-bruma)] mt-6 italic font-serif">
            "A excelência clínica começa pela consciência operacional."
          </p>
        </CardContent>

        {/* Borda dourada inferior */}
        <div className="h-1 bg-gradient-to-r from-[var(--pw-dourado)] via-[var(--pw-dourado-vivo)] to-[var(--pw-dourado)]" />
      </Card>
    </div>
  );
}
