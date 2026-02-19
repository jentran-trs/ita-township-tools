import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import PublicLanding from "@/components/PublicLanding";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return <PublicLanding />;
}
