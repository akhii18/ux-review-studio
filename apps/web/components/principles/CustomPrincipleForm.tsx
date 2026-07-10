"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePrincipleSchema, PRINCIPLE_CATEGORY_LABELS } from "@uxm/shared";
import type { CreatePrinciple } from "@uxm/shared";
import { useCreatePrincipleMutation } from "@/store/api/principlesApi";
import { toast } from "@/lib/toast";
import { useState } from "react";

export function CustomPrincipleForm() {
  const [open, setOpen] = useState(false);
  const [create, { isLoading }] = useCreatePrincipleMutation();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreatePrinciple>({
    resolver: zodResolver(CreatePrincipleSchema),
    defaultValues: { enabled: true },
  });

  const onSubmit = async (data: CreatePrinciple) => {
    try {
      await create(data).unwrap();
      toast.success("Custom principle created");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to create principle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Add custom principle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom principle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="e.g. Mobile-first touch targets" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Explain this principle…"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select onValueChange={(v) => setValue("category", v as CreatePrinciple["category"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRINCIPLE_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source">Source (optional)</Label>
            <Input id="source" {...register("source")} placeholder="e.g. Apple HIG, Internal Design System" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding…" : "Add principle"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
