import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Activity } from "lucide-react";

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
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground"><Activity className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="space-y-3 text-center pb-6 border-b border-border">
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 flex items-center justify-center border-2 border-primary/30 bg-white/90 p-2">
              <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground uppercase">Pawards</CardTitle>
          <p className="text-[11px] text-muted-foreground tracking-[0.3em] uppercase">Powered by Padcon Tech</p>
          <CardDescription className="text-muted-foreground text-sm">
            Onde o caos vira fluxo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider">E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@clinica.com" {...field} className="bg-input/50 h-11" data-testid="input-email" />
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
                    <FormLabel className="text-xs uppercase tracking-wider">Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-input/50 h-11" data-testid="input-senha" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 mt-4 font-bold uppercase tracking-wider" data-testid="button-login">
                Entrar no Motor
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
