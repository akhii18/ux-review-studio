"use client";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdatePrincipleMutation } from "@/store/api/principlesApi";
import type { UxPrinciple } from "@uxm/shared";
import { PRINCIPLE_CATEGORY_LABELS } from "@uxm/shared";
import { toast } from "sonner";

export function PrincipleCard({ principle }: { principle: UxPrinciple }) {
  const [update] = useUpdatePrincipleMutation();

  const toggleEnabled = async () => {
    try {
      await update({ id: principle.id, payload: { enabled: !principle.enabled } }).unwrap();
      toast.success(`Principle ${principle.enabled ? "disabled" : "enabled"}`);
    } catch {
      toast.error("Failed to update principle");
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{principle.name}</CardTitle>
          <Switch
            checked={principle.enabled}
            onCheckedChange={toggleEnabled}
            aria-label={principle.enabled ? "Disable principle" : "Enable principle"}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {PRINCIPLE_CATEGORY_LABELS[principle.category]}
          </Badge>
          {principle.isCustom && (
            <Badge variant="outline" className="text-[10px]">Custom</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-[11px] text-muted-foreground">
        <p>{principle.description}</p>
        {principle.source && (
          <p className="mt-1 italic">Source: {principle.source}</p>
        )}
      </CardContent>
    </Card>
  );
}
