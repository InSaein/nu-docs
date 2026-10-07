import LoginClient from "@/components/login-client";

export default function LoginPage() {
  const showDemoLogin = process.env.ENABLE_DEMO_LOGIN === "true";

  return <LoginClient showDemoLogin={showDemoLogin} />;
}
