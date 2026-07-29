"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGetSettingsQuery } from "@/store/api/settingsApi";
import { useDispatch } from "react-redux";
import { markSaved } from "@/store/slices/settingsSlice";
import { toast } from "@/lib/toast";
import { deleteAccount as apiDeleteAccount, me as apiMe, updateMe as apiUpdateMe } from "@/lib/api";

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
const MAX_AVATAR_BYTES = 1_000_000;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PROFILE_DETAILS_STORAGE_KEY = "uxm_profile_details";
const ORGANIZATION_STORAGE_KEY = "uxm_organization_settings";
const DEFAULT_PROFILE_DETAILS = {
  role: "UX Lead",
  team: "Enterprise UX",
};
const DEFAULT_ORGANIZATION = {
  name: "Acme Enterprise",
  industry: "Banking & Financial Services",
  workspaceUrl: "acme.uxreview.studio",
  seats: "48 of 100",
};

export function SettingsForm() {
  const dispatch = useDispatch();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileRole, setProfileRole] = useState(DEFAULT_PROFILE_DETAILS.role);
  const [savedProfileRole, setSavedProfileRole] = useState(DEFAULT_PROFILE_DETAILS.role);
  const [profileTeam, setProfileTeam] = useState(DEFAULT_PROFILE_DETAILS.team);
  const [savedProfileTeam, setSavedProfileTeam] = useState(DEFAULT_PROFILE_DETAILS.team);
  const [profileAvatarDataUrl, setProfileAvatarDataUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileDetailsSaving, setProfileDetailsSaving] = useState(false);
  const [profilePhotoSaving, setProfilePhotoSaving] = useState(false);
  const [organizationName, setOrganizationName] = useState(DEFAULT_ORGANIZATION.name);
  const [savedOrganizationName, setSavedOrganizationName] = useState(DEFAULT_ORGANIZATION.name);
  const [organizationIndustry, setOrganizationIndustry] = useState(DEFAULT_ORGANIZATION.industry);
  const [savedOrganizationIndustry, setSavedOrganizationIndustry] = useState(DEFAULT_ORGANIZATION.industry);
  const [organizationWorkspaceUrl, setOrganizationWorkspaceUrl] = useState(DEFAULT_ORGANIZATION.workspaceUrl);
  const [savedOrganizationWorkspaceUrl, setSavedOrganizationWorkspaceUrl] = useState(DEFAULT_ORGANIZATION.workspaceUrl);
  const [organizationSeats, setOrganizationSeats] = useState(DEFAULT_ORGANIZATION.seats);
  const [savedOrganizationSeats, setSavedOrganizationSeats] = useState(DEFAULT_ORGANIZATION.seats);
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;

    const storedProfileDetails = localStorage.getItem(PROFILE_DETAILS_STORAGE_KEY);
    if (storedProfileDetails) {
      try {
        const parsed = JSON.parse(storedProfileDetails) as Partial<typeof DEFAULT_PROFILE_DETAILS>;
        const role = typeof parsed.role === "string" ? parsed.role : DEFAULT_PROFILE_DETAILS.role;
        const team = typeof parsed.team === "string" ? parsed.team : DEFAULT_PROFILE_DETAILS.team;
        setProfileRole(role);
        setSavedProfileRole(role);
        setProfileTeam(team);
        setSavedProfileTeam(team);
      } catch {
        localStorage.removeItem(PROFILE_DETAILS_STORAGE_KEY);
      }
    }

    const storedOrganization = localStorage.getItem(ORGANIZATION_STORAGE_KEY);
    if (storedOrganization) {
      try {
        const parsed = JSON.parse(storedOrganization) as Partial<typeof DEFAULT_ORGANIZATION>;
        const name = typeof parsed.name === "string" ? parsed.name : DEFAULT_ORGANIZATION.name;
        const industry = typeof parsed.industry === "string" ? parsed.industry : DEFAULT_ORGANIZATION.industry;
        const workspaceUrl = typeof parsed.workspaceUrl === "string" ? parsed.workspaceUrl : DEFAULT_ORGANIZATION.workspaceUrl;
        const seats = typeof parsed.seats === "string" ? parsed.seats : DEFAULT_ORGANIZATION.seats;
        setOrganizationName(name);
        setSavedOrganizationName(name);
        setOrganizationIndustry(industry);
        setSavedOrganizationIndustry(industry);
        setOrganizationWorkspaceUrl(workspaceUrl);
        setSavedOrganizationWorkspaceUrl(workspaceUrl);
        setOrganizationSeats(seats);
        setSavedOrganizationSeats(seats);
      } catch {
        localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
      }
    }

    apiMe()
      .then((user) => {
        if (!active) return;
        setProfileName(user.name ?? "");
        setProfileEmail(user.email ?? "");
        setProfileAvatarDataUrl(user.avatarDataUrl ?? null);
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

  const normalizedProfileRole = profileRole.trim().replace(/\s+/g, " ");
  const normalizedProfileTeam = profileTeam.trim().replace(/\s+/g, " ");
  const canSaveProfileDetails =
    normalizedProfileRole.length > 0 &&
    normalizedProfileTeam.length > 0 &&
    (normalizedProfileRole !== savedProfileRole || normalizedProfileTeam !== savedProfileTeam) &&
    !profileDetailsSaving;
  const normalizedOrganizationName = organizationName.trim().replace(/\s+/g, " ");
  const normalizedOrganizationIndustry = organizationIndustry.trim().replace(/\s+/g, " ");
  const normalizedOrganizationWorkspaceUrl = organizationWorkspaceUrl.trim().replace(/\s+/g, " ");
  const normalizedOrganizationSeats = organizationSeats.trim().replace(/\s+/g, " ");
  const canSaveOrganization =
    normalizedOrganizationName.length > 0 &&
    normalizedOrganizationIndustry.length > 0 &&
    normalizedOrganizationWorkspaceUrl.length > 0 &&
    normalizedOrganizationSeats.length > 0 &&
    (normalizedOrganizationName !== savedOrganizationName ||
      normalizedOrganizationIndustry !== savedOrganizationIndustry ||
      normalizedOrganizationWorkspaceUrl !== savedOrganizationWorkspaceUrl ||
      normalizedOrganizationSeats !== savedOrganizationSeats) &&
    !organizationSaving;
  const isDeleteConfirmed = deleteConfirmation.trim().toLowerCase() === "delete";

  const syncCurrentUser = (user: { name?: string | null; email?: string | null; avatarDataUrl?: string | null }) => {
    localStorage.setItem(
      "current_user",
      JSON.stringify({ name: user.name || "User", email: user.email, avatarDataUrl: user.avatarDataUrl ?? null })
    );
    window.dispatchEvent(new Event("uxm:user-updated"));
  };

  const handleSaveProfileDetails = () => {
    if (!canSaveProfileDetails) return;

    setProfileDetailsSaving(true);
    localStorage.setItem(
      PROFILE_DETAILS_STORAGE_KEY,
      JSON.stringify({ role: normalizedProfileRole, team: normalizedProfileTeam })
    );
    setProfileRole(normalizedProfileRole);
    setSavedProfileRole(normalizedProfileRole);
    setProfileTeam(normalizedProfileTeam);
    setSavedProfileTeam(normalizedProfileTeam);
    dispatch(markSaved(new Date().toISOString()));
    toast.success("Profile details saved");
    setProfileDetailsSaving(false);
  };

  const handleSaveOrganization = () => {
    if (!canSaveOrganization) return;

    setOrganizationSaving(true);
    localStorage.setItem(
      ORGANIZATION_STORAGE_KEY,
      JSON.stringify({
        name: normalizedOrganizationName,
        industry: normalizedOrganizationIndustry,
        workspaceUrl: normalizedOrganizationWorkspaceUrl,
        seats: normalizedOrganizationSeats,
      })
    );
    setOrganizationName(normalizedOrganizationName);
    setSavedOrganizationName(normalizedOrganizationName);
    setOrganizationIndustry(normalizedOrganizationIndustry);
    setSavedOrganizationIndustry(normalizedOrganizationIndustry);
    setOrganizationWorkspaceUrl(normalizedOrganizationWorkspaceUrl);
    setSavedOrganizationWorkspaceUrl(normalizedOrganizationWorkspaceUrl);
    setOrganizationSeats(normalizedOrganizationSeats);
    setSavedOrganizationSeats(normalizedOrganizationSeats);
    dispatch(markSaved(new Date().toISOString()));
    toast.success("Organization saved");
    setOrganizationSaving(false);
  };

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || profilePhotoSaving) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Profile photo must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const avatarDataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!avatarDataUrl) {
        toast.error("Unable to read profile photo.");
        return;
      }

      try {
        setProfilePhotoSaving(true);
        const result = await apiUpdateMe({ avatarDataUrl });
        localStorage.setItem("token", result.token);
        syncCurrentUser(result.user);
        document.cookie = `token=${result.token}; Path=/; Max-Age=${result.expiresInSeconds}; SameSite=Lax`;
        setProfileAvatarDataUrl(result.user.avatarDataUrl ?? null);
        toast.success("Profile photo updated");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update profile photo");
      } finally {
        setProfilePhotoSaving(false);
      }
    };
    reader.onerror = () => toast.error("Unable to read profile photo.");
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    if (!isDeleteConfirmed || !deletePassword || deleteSubmitting) return;

    try {
      setDeleteSubmitting(true);
      setDeleteError(null);
      await apiDeleteAccount({ password: deletePassword });
      localStorage.removeItem("token");
      localStorage.removeItem("current_user");
      document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
      toast.success("Account deleted permanently");
      window.location.replace("/auth");
    } catch (err: any) {
      setDeleteError(err?.message ?? "Unable to delete account.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (isLoading || profileLoading) {
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
                {profileAvatarDataUrl && <AvatarImage src={profileAvatarDataUrl} alt="" />}
                <AvatarFallback className="bg-primary text-primary-foreground">{profileInitials}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept={ALLOWED_AVATAR_TYPES.join(",")}
                  className="hidden"
                  onChange={handleProfilePhotoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={profileLoading || profilePhotoSaving}
                >
                  {profilePhotoSaving ? "Uploading..." : "Change photo"}
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
                <Field label="Full name">
                  <p className="px-0.5 -mt-2 text-sm font-medium text-foreground">
                    {profileName || "—"}
                  </p>
                </Field>
                <Field label="Email" readOnly>
                  <p className="text-sm font-medium text-foreground px-0.5 -mt-2">
                    {profileEmail || "—"}
                  </p>
                </Field>
              </>
            )}
            <Field label="Role">
              <Input
                value={profileRole}
                onChange={(event) => setProfileRole(event.target.value.replace(/^\s+/, ""))}
                disabled={profileDetailsSaving}
              />
            </Field>
            <Field label="Team">
              <Input
                value={profileTeam}
                onChange={(event) => setProfileTeam(event.target.value.replace(/^\s+/, ""))}
                disabled={profileDetailsSaving}
              />
            </Field>
            <div className="md:col-span-2 flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                onClick={handleSaveProfileDetails}
                disabled={!canSaveProfileDetails}
                className="min-w-24"
              >
                {profileDetailsSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-4 border border-red-200 border-l-4 border-l-destructive bg-red-50/50 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-destructive ring-1 ring-red-200">
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
              Danger zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-950">Delete account</p>
              <p className="max-w-2xl text-sm text-red-700">
                This will delete all of your data permanently and cannot be undone.
              </p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) {
                setDeleteConfirmation("");
                setDeletePassword("");
                setDeleteError(null);
              }
            }}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" className="shrink-0">
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-red-200 bg-red-50 sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" aria-hidden />
                    Delete your account permanently?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-red-800">
                    This will delete all of your data permanently and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2 rounded-lg border border-red-200 bg-white p-3">
                    <Label htmlFor="delete-account-confirmation" className="text-red-950">Type delete to continue</Label>
                    <Input
                      id="delete-account-confirmation"
                      value={deleteConfirmation}
                      onChange={(event) => {
                        setDeleteConfirmation(event.target.value);
                        setDeleteError(null);
                      }}
                      autoComplete="off"
                      disabled={deleteSubmitting}
                      className="border-red-200 bg-white focus-visible:ring-red-300"
                    />
                  </div>
                  {isDeleteConfirmed && (
                    <div className="space-y-2 rounded-lg border border-red-200 bg-white p-3">
                      <Label htmlFor="delete-account-password" className="text-red-950">Enter your password</Label>
                      <Input
                        id="delete-account-password"
                        type="password"
                        value={deletePassword}
                        onChange={(event) => {
                          setDeletePassword(event.target.value);
                          setDeleteError(null);
                        }}
                        autoComplete="current-password"
                        disabled={deleteSubmitting}
                        className="border-red-200 bg-white focus-visible:ring-red-300"
                      />
                    </div>
                  )}
                  {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={!isDeleteConfirmed || !deletePassword || deleteSubmitting}
                  >
                    {deleteSubmitting ? "Deleting..." : "Delete permanently"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              <Input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value.replace(/^\s+/, ""))}
                disabled={organizationSaving}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={organizationIndustry}
                onChange={(event) => setOrganizationIndustry(event.target.value.replace(/^\s+/, ""))}
                disabled={organizationSaving}
              />
            </Field>
            <Field label="Workspace URL">
              <Input
                value={organizationWorkspaceUrl}
                onChange={(event) => setOrganizationWorkspaceUrl(event.target.value.replace(/^\s+/, ""))}
                disabled={organizationSaving}
              />
            </Field>
            <Field label="Seats">
              <Input
                value={organizationSeats}
                onChange={(event) => setOrganizationSeats(event.target.value.replace(/^\s+/, ""))}
                disabled={organizationSaving}
              />
            </Field>
            <div className="md:col-span-2 flex justify-end border-t border-border pt-4">
              <Button
                type="button"
                onClick={handleSaveOrganization}
                disabled={!canSaveOrganization}
                className="min-w-24"
              >
                {organizationSaving ? "Saving..." : "Save"}
              </Button>
            </div>
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
