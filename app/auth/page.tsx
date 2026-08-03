import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/current-user";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  if (await getCurrentUser()) redirect("/");
  return <main className="auth-shell"><AuthForm /></main>;
}
