import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isSetupComplete } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await isSetupComplete())) redirect("/setup");
  if (!(await getSession())) redirect("/login");
  redirect("/workspace");
}
