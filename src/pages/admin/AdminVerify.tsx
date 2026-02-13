import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Loader2, Mail, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export default function AdminVerify() {
  const { isAuthenticated, isMfaVerified, isLoading, sendOtp, verifyOtp, signOut } =
    useAdminAuth();

  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  // Redirect if already fully authenticated
  if (!isLoading && isMfaVerified) {
    return <Navigate to="/admin" replace />;
  }

  // Redirect if not authenticated at all
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Send OTP on mount
  const handleSendOtp = useCallback(async () => {
    setIsSending(true);
    try {
      await sendOtp();
      setOtpSent(true);
      setTimer(OTP_EXPIRY_SECONDS);
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para o código de 6 dígitos.",
      });
    } catch (err) {
      toast({
        title: "Erro ao enviar código",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [sendOtp]);

  // Auto-send OTP when page loads (if authenticated)
  useEffect(() => {
    if (isAuthenticated && !isMfaVerified && !otpSent && !isLoading) {
      handleSendOtp();
    }
  }, [isAuthenticated, isMfaVerified, otpSent, isLoading, handleSendOtp]);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (otpCode.length !== 6) return;
    setIsVerifying(true);

    try {
      await verifyOtp(otpCode);
      toast({ title: "Verificado!", description: "Acesso liberado ao painel." });
      // Navigate happens via state change → isMfaVerified becomes true
    } catch (err) {
      const error = err as Error & { attemptsRemaining?: number };
      const msg = error.attemptsRemaining !== undefined
        ? `${error.message}. ${error.attemptsRemaining} tentativa(s) restante(s).`
        : error.message;

      toast({
        title: "Código inválido",
        description: msg,
        variant: "destructive",
      });
      setOtpCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setOtpCode("");
    await handleSendOtp();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verificação por Email</CardTitle>
            <CardDescription>
              {otpSent
                ? "Digite o código de 6 dígitos enviado para seu email"
                : "Enviando código de verificação..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sending state */}
            {isSending && !otpSent && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Enviando código...
                </span>
              </div>
            )}

            {/* OTP Input */}
            {otpSent && (
              <>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Verifique seu email</span>
                </div>

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

                {/* Timer */}
                {timer > 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Código expira em{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {formatTime(timer)}
                    </span>
                  </p>
                )}

                {timer <= 0 && otpSent && (
                  <p className="text-center text-sm text-destructive">
                    Código expirado. Solicite um novo.
                  </p>
                )}

                {/* Verify button */}
                <Button
                  className="w-full btn-primary"
                  disabled={otpCode.length !== 6 || isVerifying || timer <= 0}
                  onClick={handleVerify}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar Código"
                  )}
                </Button>

                {/* Resend */}
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isSending}
                  onClick={handleResend}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isSending ? "animate-spin" : ""}`}
                  />
                  {isSending ? "Enviando..." : "Reenviar código"}
                </Button>
              </>
            )}

            {/* Sign out */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={signOut}
            >
              Sair e tentar com outra conta
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Palestra Baby — Acesso restrito
        </p>
      </motion.div>
    </div>
  );
}
