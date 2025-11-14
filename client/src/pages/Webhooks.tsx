import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Webhooks() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    eventType: "all" as "message_insert" | "message_update" | "message_delete" | "all",
    guildFilter: "none",
    channelFilter: "none",
  });

  const utils = trpc.useUtils();
  const { data: webhooks, isLoading } = trpc.webhooks.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: guilds } = trpc.discord.guilds.useQuery();

  const createMutation = trpc.webhooks.create.useMutation({
    onSuccess: () => {
      utils.webhooks.list.invalidate();
      setIsCreateOpen(false);
      setFormData({ name: "", url: "", eventType: "all", guildFilter: "none", channelFilter: "none" });
      toast.success("Webhook created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });

  const deleteMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => {
      utils.webhooks.list.invalidate();
      toast.success("Webhook deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    },
  });

  const testMutation = trpc.webhooks.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Webhook test successful (Status: ${data.status})`);
      } else {
        toast.error(`Webhook test failed (Status: ${data.status})`);
      }
    },
    onError: (error) => {
      toast.error(`Webhook test failed: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.url) {
      toast.error("Name and URL are required");
      return;
    }
    createMutation.mutate({
      ...formData,
      guildFilter: formData.guildFilter === "none" ? "" : formData.guildFilter,
      channelFilter: formData.channelFilter === "none" ? "" : formData.channelFilter,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-slate-400">
              Please sign in to manage webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">Webhook Management</h1>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Webhook
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-8 text-center text-slate-400">Loading webhooks...</CardContent>
          </Card>
        ) : webhooks && webhooks.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-8 text-center">
              <WebhookIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No webhooks configured yet</p>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {webhooks?.map((webhook) => (
              <Card key={webhook.id} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white">{webhook.name}</CardTitle>
                      <CardDescription className="text-slate-400 break-all">{webhook.url}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testMutation.mutate({ id: webhook.id })}
                        disabled={testMutation.isPending}
                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                      >
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate({ id: webhook.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Event Type:</span>
                      <span className="ml-2 text-white">{webhook.eventType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Status:</span>
                      <span className={`ml-2 ${webhook.isActive ? "text-green-400" : "text-red-400"}`}>
                        {webhook.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {webhook.guildFilter && (
                      <div>
                        <span className="text-slate-400">Guild Filter:</span>
                        <span className="ml-2 text-white">{webhook.guildFilter}</span>
                      </div>
                    )}
                    {webhook.channelFilter && (
                      <div>
                        <span className="text-slate-400">Channel Filter:</span>
                        <span className="ml-2 text-white">{webhook.channelFilter}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Logs Button */}
        <div className="mt-8 text-center">
          <Link href="/webhook-logs">
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
              View Webhook Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Create Webhook Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Webhook</DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure a webhook to receive notifications on Discord message events
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                placeholder="My Webhook"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Webhook URL</Label>
              <Input
                placeholder="https://example.com/webhook"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Event Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all" className="text-white">
                    All Events
                  </SelectItem>
                  <SelectItem value="message_insert" className="text-white">
                    Message Insert
                  </SelectItem>
                  <SelectItem value="message_update" className="text-white">
                    Message Update
                  </SelectItem>
                  <SelectItem value="message_delete" className="text-white">
                    Message Delete
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Guild Filter (Optional)</Label>
              <Select
                value={formData.guildFilter}
                onValueChange={(value) => setFormData({ ...formData, guildFilter: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Guilds" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="none" className="text-white">
                    All Guilds
                  </SelectItem>
                  {guilds?.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id} className="text-white">
                      {guild.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="bg-slate-700 border-slate-600 text-white">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {createMutation.isPending ? "Creating..." : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
