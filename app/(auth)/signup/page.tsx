import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Get started with a secure Wayline workspace."
      footer={null}
    >
      <SignupForm />
    </AuthCard>
  );
}
