"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CreateChecklistSchema, REVIEW_AREA_LABELS } from "@uxm/shared";
import type { CreateChecklist } from "@uxm/shared";
import { toast } from "@/lib/toast";
import { useCreateChecklistMutation } from "@/store/api/checklistsApi";
import { useRouter } from "next/navigation";

export function ChecklistForm() {
  const router = useRouter();
  const [createChecklist, { isLoading }] = useCreateChecklistMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateChecklist>({
    resolver: zodResolver(CreateChecklistSchema),
    defaultValues: { title: "", description: "", items: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const onSubmit = async (data: CreateChecklist) => {
    try {
      const result = await createChecklist(data).unwrap();
      toast.success("Checklist created");
      router.push(`/checklists/${result.id}`);
    } catch {
      toast.error("Failed to create checklist");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} placeholder="e.g. Baseline UX Governance" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe the purpose of this checklist…"
          rows={3}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ label: "", description: "", required: true, order: fields.length, area: undefined })
            }
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />Add item
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No items yet. Click "Add item" to start.</p>
        )}

        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2 rounded-lg border border-border bg-secondary/20 p-3">
              <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/40" />
              <div className="flex-1 space-y-2">
                <Input
                  {...register(`items.${i}.label`)}
                  placeholder="Item label (e.g. All interactive elements have focus state)"
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Select
                    onValueChange={(v) => {
                      /* react-hook-form field array — use setValue */
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Area (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REVIEW_AREA_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 px-2">
                    <Switch
                      id={`required-${i}`}
                      {...register(`items.${i}.required`)}
                      defaultChecked
                    />
                    <Label htmlFor={`required-${i}`} className="text-xs">Required</Label>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating…" : "Create checklist"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
