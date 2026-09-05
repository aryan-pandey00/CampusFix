import { AuthForm } from "@/components/auth-form";
import { AuthCard } from "@/components/auth-card";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "Create account · CampusFix" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="Everyone signs up here. The office grants admin and department access."
    >
      <AuthForm mode="signup" action={signUp} />
    </AuthCard>
  );
}
