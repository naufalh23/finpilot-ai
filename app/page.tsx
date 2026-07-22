import { redirect } from "next/navigation"

export default function RootPage() {
  // The proxy already gates auth; signed-in users land straight on the dashboard.
  redirect("/dashboard")
}
