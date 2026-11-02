import { Building2, Users, Link2, BarChart3 } from "lucide-react";
import { t } from "@/i18n";
import { BottomTabBar, type TabItem } from "@/components/shared/BottomTabBar";

/** Training Officer mobile tab bar (up to 639px). */
const tabs: TabItem[] = [
  { to: "/school-admin", label: t("SA-tabs.home"), icon: Building2 },
  { to: "/school-admin/teachers", label: t("SA-tabs.instructors"), icon: Users },
  { to: "/school-admin/classes", label: t("SA-tabs.classes"), icon: Link2 },
  { to: "/school-admin/analytics", label: t("SA-tabs.analytics"), icon: BarChart3 },
];

export function AdminTabs() {
  return <BottomTabBar items={tabs} />;
}
