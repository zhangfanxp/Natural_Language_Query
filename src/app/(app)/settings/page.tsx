import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/workspace");
  return <SettingsPanel />;
}
