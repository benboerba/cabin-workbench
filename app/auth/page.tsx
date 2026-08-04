import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/current-user";
import { withBasePath } from "../lib/base-path";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  if (await getCurrentUser()) redirect(withBasePath("/"));
  return <main className="auth-shell"><AuthForm /></main>;
}
