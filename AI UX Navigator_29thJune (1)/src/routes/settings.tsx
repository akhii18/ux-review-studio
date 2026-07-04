import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UX Review Studio" }] }),
  component: Settings,
});

const integrations = [
  { name: "Figma", desc: "Pull frames and prototypes for review", connected: true },
  { name: "Jira", desc: "Create issues from findings", connected: true },
  { name: "Confluence", desc: "Publish reports to spaces", connected: false },
  { name: "Azure OpenAI", desc: "Enterprise AI model provider", connected: true },
  { name: "Google Vertex AI", desc: "Alternate AI provider", connected: false },
  { name: "AWS Bedrock", desc: "Alternate AI provider", connected: false },
  { name: "Slack", desc: "Notifications and digests", connected: true },
  { name: "Microsoft Teams", desc: "Notifications and digests", connected: false },
];

const roles = ["Admin", "UX Lead", "UX Reviewer", "Designer", "Product Owner", "Viewer"];

function Settings() {
  return (
    <>
      <AppHeader title="Settings" subtitle="Workspace, integrations, and governance preferences" />
      <div className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="ai">AI Configuration</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">User profile</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 flex items-center gap-4">
                  <Avatar className="h-14 w-14"><AvatarFallback className="bg-primary text-primary-foreground">RS</AvatarFallback></Avatar>
                  <div><Button variant="outline" size="sm">Change photo</Button></div>
                </div>
                <Field label="Full name"><Input defaultValue="Rakhee Sharma" /></Field>
                <Field label="Email"><Input defaultValue="rakhee@company.com" /></Field>
                <Field label="Role"><Input defaultValue="UX Lead" /></Field>
                <Field label="Team"><Input defaultValue="Enterprise UX" /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">AI model configuration</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Primary model"><Input defaultValue="Azure OpenAI · gpt-4o" /></Field>
                <Field label="Fallback model"><Input defaultValue="Vertex AI · gemini-1.5-pro" /></Field>
                <Field label="Default review depth"><Input defaultValue="Standard" /></Field>
                <Field label="Severity model"><Input defaultValue="Critical / High / Medium / Low" /></Field>
              </CardContent>
            </Card>
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Default review criteria</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {["Nielsen's heuristics", "WCAG 2.2", "Design system", "PRD alignment", "Content clarity"].map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {integrations.map((i) => (
                <Card key={i.name} className="shadow-card"><CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-semibold text-primary">{i.name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.desc}</p>
                  </div>
                  <Badge variant={i.connected ? "secondary" : "outline"} className={i.connected ? "border-success/30 bg-success/10 text-[color:var(--success)]" : ""}>
                    {i.connected ? "Connected" : "Not connected"}
                  </Badge>
                </CardContent></Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Roles</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {roles.map((r) => (
                  <div key={r} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                    <div>
                      <p className="text-sm font-medium">{r}</p>
                      <p className="text-[11px] text-muted-foreground">Default permissions for {r.toLowerCase()}</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card className="shadow-card"><CardContent className="space-y-3 p-4">
              {["Review completed", "New critical finding", "Weekly digest", "Mentions and comments"].map((n) => (
                <div key={n} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                  <Label className="text-sm">{n}</Label>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="org" className="mt-4">
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Organization</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Organization name"><Input defaultValue="Acme Enterprise" /></Field>
                <Field label="Industry"><Input defaultValue="Banking & Financial Services" /></Field>
                <Field label="Workspace URL"><Input defaultValue="acme.uxreview.studio" /></Field>
                <Field label="Seats"><Input defaultValue="48 of 100" /></Field>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="mt-4">
            <Card className="shadow-card"><CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="Brand name"><Input defaultValue="Acme UX Governance" /></Field>
                <Field label="Primary color"><Input defaultValue="#1E3A8A" /></Field>
                <Field label="Report cover note"><Input defaultValue="Confidential — internal use only" /></Field>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
