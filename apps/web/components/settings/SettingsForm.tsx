"use client";

import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSettingsQuery } from "@/store/api/settingsApi";
import { useDispatch } from "react-redux";
import { markSaved } from "@/store/slices/settingsSlice";
import { toast } from "@/lib/toast";
import { me as apiMe } from "@/lib/api";

const integrations = [
  { name: "Figma", desc: "Pull frames and prototypes for review", connected: true },
  { name: "Jira", desc: "Create issues from findings", connected: true },
  { name: "Confluence", desc: "Publish reports to spaces", connected: false },
  { name: "Azure OpenAI", desc: "Enterprise AI model provider", connected: true },
  { name: "Google Vertex AI", desc: "Alternate AI provider", connected: false },
  { name: "AWS Bedrock", desc: "Alternate AI provider", connected: false },
  { name: "Slack", desc: "Notifications and digests", connected: true },
  { name: "Microsoft Teams", desc: "Notifications and digests", connected: false },
] as const;

const roles = ["Admin", "UX Lead", "UX Reviewer", "Designer", "Product Owner", "Viewer"] as const;

export function SettingsForm() {
  const dispatch = useDispatch();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let active = true;

    apiMe()
      .then((user) => {
        if (!active) return;
        setProfileName(user.name ?? "");
        setProfileEmail(user.email ?? "");
      })
      .catch(() => {
        if (active) {
          toast.error("Failed to load profile");
        }
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const profileInitials = profileName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "US";

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
    <Tabs defaultValue="profile">
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="org">Organization</TabsTrigger>
        <TabsTrigger value="ai">AI Configuration</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">User profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary text-primary-foreground">{profileInitials}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled>
                  Change photo
                </Button>
              </div>
            </div>

            {profileLoading ? (
              <div className="md:col-span-2 space-y-3">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
              </div>
            ) : (
              <>
                <Field label="Full name" readOnly>
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                    {profileName || "User"}
                  </p>
                </Field>
                <Field label="Email" readOnly>
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                    {profileEmail || "—"}
                  </p>
                </Field>
              </>
            )}
            <Field label="Role">
              <Input defaultValue="UX Lead" />
            </Field>
            <Field label="Team">
              <Input defaultValue="Enterprise UX" />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="org" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Organization name">
              <Input defaultValue="Acme Enterprise" />
            </Field>
            <Field label="Industry">
              <Input defaultValue="Banking & Financial Services" />
            </Field>
            <Field label="Workspace URL">
              <Input defaultValue="acme.uxreview.studio" />
            </Field>
            <Field label="Seats">
              <Input defaultValue="48 of 100" />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ai" className="mt-4 space-y-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">AI model configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Primary model">
              <Input defaultValue="Azure OpenAI · gpt-4o" />
            </Field>
            <Field label="Fallback model">
              <Input defaultValue="Vertex AI · gemini-1.5-pro" />
            </Field>
            <Field label="Default review depth">
              <Input defaultValue={(settings?.review_depth as string) ?? "Standard"} />
            </Field>
            <Field label="Severity model">
              <Input defaultValue="Critical / High / Medium / Low" />
            </Field>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Default review criteria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {["Nielsen's heuristics", "WCAG 2.2", "Design system", "PRD alignment", "Content clarity"].map((item) => (
              <Badge key={item} variant="secondary">{item}</Badge>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="integrations" className="mt-4">
        <div className="grid gap-3 md:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.name} className="shadow-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-semibold text-primary">
                  {integration.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.desc}</p>
                </div>
                <Badge
                  variant={integration.connected ? "secondary" : "outline"}
                  className={integration.connected ? "border-success/30 bg-success/10 text-[color:var(--success)]" : ""}
                >
                  {integration.connected ? "Connected" : "Not connected"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="roles" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                <div>
                  <p className="text-sm font-medium">{role}</p>
                  <p className="text-[11px] text-muted-foreground">Default permissions for {role.toLowerCase()}</p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-4">
            {["Review completed", "New critical finding", "Weekly digest", "Mentions and comments"].map((notification) => (
              <div key={notification} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                <Label className="text-sm">{notification}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="branding" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Brand name">
              <Input defaultValue="Acme UX Governance" />
            </Field>
            <Field label="Primary color">
              <Input defaultValue="#1E3A8A" />
            </Field>
            <Field label="Report cover note">
              <Input defaultValue="Confidential — internal use only" />
            </Field>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children, readOnly = false }: { label: string; children: ReactNode; readOnly?: boolean }) {
  const fieldId = useId();
  const labelId = `${fieldId}-label`;

  if (readOnly) {
    return (
      <div className="space-y-1.5">
        <Label id={labelId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <div aria-labelledby={labelId}>{children}</div>
      </div>
    );
  }

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id: fieldId })
    : children;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {control}
    </div>
  );
}
