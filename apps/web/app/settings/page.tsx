import { AppHeader } from "@/components/ui/AppHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata = { title: "Settings — UXNavigator" };

export default function SettingsPage() {
  return (
    <>
      <AppHeader
        title="Settings"
        subtitle="Workspace, integrations, and governance preferences"
      />
      <div className="flex-1 p-4 md:p-6">
        <SettingsForm />
      </div>
    </>
  );
}
