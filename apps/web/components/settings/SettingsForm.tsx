"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateSettingsSchema } from "@uxm/shared";
import type { UpdateSettings } from "@uxm/shared";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/store/api/settingsApi";
import { useDispatch } from "react-redux";
import { markSaved } from "@/store/slices/settingsSlice";
import { toast } from "sonner";

export function SettingsForm() {
  const dispatch = useDispatch();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  const { register, handleSubmit, setValue, watch, reset } = useForm<UpdateSettings>({
    resolver: zodResolver(UpdateSettingsSchema),
  });

  useEffect(() => {
    if (settings) {
      reset(settings as UpdateSettings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: UpdateSettings) => {
    try {
      await updateSettings(data).unwrap();
      dispatch(markSaved(new Date().toISOString()));
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Review defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="depth">Default depth</Label>
            <Select
              defaultValue={(settings?.review_depth as string) ?? "standard"}
              onValueChange={(v) => setValue("review_depth", v as UpdateSettings["review_depth"])}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="threshold">Confidence threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min={50}
              max={99}
              className="w-24"
              {...register("review_confidence_threshold", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner">Default owner</Label>
            <Input
              id="owner"
              {...register("default_review_owner")}
              placeholder="e.g. Alex Rivera"
              className="w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: "enable_usability_checks", label: "Usability heuristics", desc: "Nielsen's 10 heuristics + interaction laws" },
            { id: "enable_accessibility_checks", label: "Accessibility (WCAG 2.2)", desc: "WCAG 2.2 AA conformance checks" },
            { id: "enable_content_checks", label: "Content & microcopy", desc: "Labels, errors, and plain language review" },
            { id: "enable_consistency_checks", label: "Design consistency", desc: "Spacing, component, and token adherence" },
          ].map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={s.id} className="text-sm font-medium">{s.label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <Switch
                id={s.id}
                defaultChecked={(settings?.[s.id as keyof typeof settings] as boolean) ?? true}
                onCheckedChange={(v) =>
                  setValue(s.id as keyof UpdateSettings, v)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Governance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Require checklist approval</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Checklists must be approved before they can be used in reviews.
              </p>
            </div>
            <Switch
              defaultChecked={(settings?.checklist_require_approval as boolean) ?? true}
              onCheckedChange={(v) => setValue("checklist_require_approval", v)}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Show AI confidence</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display confidence scores alongside AI-generated findings.
              </p>
            </div>
            <Switch
              defaultChecked={(settings?.show_ai_confidence as boolean) ?? true}
              onCheckedChange={(v) => setValue("show_ai_confidence", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Engine status (read-only display) */}
      <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Azure OpenAI
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Active
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Endpoint and API key are configured via server environment variables.</p>
          <p className="font-mono">AZURE_OPENAI_ENDPOINT · AZURE_OPENAI_API_KEY · AZURE_OPENAI_DEPLOYMENT</p>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>Authentication settings will be available in a later phase.</p>
      </div>

      <Button type="submit" disabled={isSaving} className="gap-1.5">
        <Save className="h-4 w-4" />
        {isSaving ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
