import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { isSetupComplete } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!(await isSetupComplete())) redirect("/setup");
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell username={session.username} role={session.role}>{children}</AppShell>;
}
