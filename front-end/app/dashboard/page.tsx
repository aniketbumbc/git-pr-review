import { NavBar } from "@/app/components/nav-bar";
import { DashboardView } from "./dashboard-view";

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <NavBar active="dashboard" />
      <DashboardView />
    </div>
  );
}
