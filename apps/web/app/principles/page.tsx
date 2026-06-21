import { AppHeader } from "@/components/ui/AppHeader";
import { PrincipleLibrary } from "@/components/principles/PrincipleLibrary";

export const metadata = { title: "UX Principles — UXNavigator" };

export default function PrinciplesPage() {
  return (
    <>
      <AppHeader
        title="UX Principles"
        subtitle="Principle library — enable, disable, and add custom principles"
      />
      <div className="flex-1 p-4 md:p-6">
        <PrincipleLibrary />
      </div>
    </>
  );
}
