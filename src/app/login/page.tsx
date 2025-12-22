'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/app/login/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/app-logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" aria-disabled={pending} disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Entrar
    </Button>
  );
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <header className="mb-8">
            <AppLogo />
        </header>

        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>Por favor, insira suas credenciais para continuar.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={dispatch} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Usuário</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Seu nome de usuário"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Sua senha"
                                required
                            />
                        </div>
                    </div>
                    <LoginButton />
                    {errorMessage && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro de Login</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
