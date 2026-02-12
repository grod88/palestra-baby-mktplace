import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";

type Step = "login" | "mfa-setup" | "mfa-verify";

export default function AdminLogin() {
  const auth = useAuth();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA state
  const [totpUri, setTotpUri] = useState("");
  const [factorId, setFactorId] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // If already logged in and MFA verified, redirect
  if (auth.isAdmin && auth.mfaVerified && !auth.isLoading) {
    return <Navigate to="/admin" replace />;
  }

  // If logged in but MFA not verified, show MFA step
  if (auth.isAdmin && !auth.mfaVerified && !auth.isLoading && step === "login") {
    // Auto-advance to MFA
    if (auth.mfaEnrolled) {
      // Has TOTP enrolled, need to verify
      auth.listFactors().then((factors) => {
        if (factors.length > 0) {
          setFactorId(factors[0].id);
          setStep("mfa-verify");
        }
      });
    } else {
      // No TOTP, need to enroll
      auth.enrollTotp().then((data) => {
        setTotpUri(data.totp.uri);
        setFactorId(data.id);
        setStep("mfa-setup");
      });
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await auth.signIn(email, password);

      // After login, check MFA status
      const factors = await auth.listFactors();
      if (factors.length > 0) {
        setFactorId(factors[0].id);
        setStep("mfa-verify");
      } else {
        // First login — setup TOTP
        const data = await auth.enrollTotp();
        setTotpUri(data.totp.uri);
        setFactorId(data.id);
        setStep("mfa-setup");
      }
    } catch (err) {
      toast({
        title: "Erro no login",
        description: err instanceof Error ? err.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setIsLoading(true);

    try {
      await auth.verifyTotp(factorId, otpCode);
      toast({ title: "2FA verificado!", description: "Acesso liberado." });
    } catch (err) {
      toast({
        title: "Código inválido",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-primary">
            🌿 Palestra Baby
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Painel Administrativo
          </p>
        </div>

        {/* Login Step */}
        {step === "login" && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Entrar</CardTitle>
              <CardDescription>
                Acesso restrito a administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@palestrababy.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* MFA Setup Step */}
        {step === "mfa-setup" && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Configurar 2FA</CardTitle>
              <CardDescription>
                Escaneie o QR Code no seu app autenticador (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code — renderizado como texto URI para o app ler */}
              {totpUri && (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-xl border">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                      alt="QR Code TOTP"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Ou copie a chave manualmente no seu app autenticador
                  </p>
                  <code className="text-xs bg-muted p-2 rounded break-all max-w-xs text-center">
                    {totpUri.match(/secret=([^&]+)/)?.[1] ?? ""}
                  </code>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-center block">
                  Digite o código de 6 dígitos
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                className="w-full btn-primary"
                disabled={otpCode.length !== 6 || isLoading}
                onClick={handleVerifyOtp}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar e Ativar 2FA"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* MFA Verify Step */}
        {step === "mfa-verify" && (
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Verificação 2FA</CardTitle>
              <CardDescription>
                Digite o código do seu app autenticador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full btn-primary"
                disabled={otpCode.length !== 6 || isLoading}
                onClick={handleVerifyOtp}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => auth.signOut()}
              >
                Sair e tentar com outra conta
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Palestra Baby — Acesso restrito
        </p>
      </motion.div>
    </div>
  );
}
