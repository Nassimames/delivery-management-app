import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice =
    params.message === "confirmed"
      ? "Your email is confirmed. Sign in to continue."
      : undefined;
  const message =
    params.error === "confirmation"
      ? "That confirmation link is invalid or expired. Sign up again or request a new confirmation email."
      : undefined;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to manage your delivery operation."
      footer={null}
    >
      <LoginForm notice={notice} message={message} />
    </AuthCard>
  );
}
