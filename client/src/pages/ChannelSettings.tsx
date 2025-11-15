import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function ChannelSettings() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [editedChannels, setEditedChannels] = useState<Record<string, { clientWebsite?: string; clientBusinessName?: string }>>({});

  const channelsQuery = trpc.discord.channels.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const bulkUpdateMutation = trpc.discord.bulkUpdateChannels.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.count} channels successfully`);
      setEditedChannels({});
      channelsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update channels: ${error.message}`);
    },
  });

  const handleFieldChange = (channelId: string, field: 'clientWebsite' | 'clientBusinessName', value: string) => {
    setEditedChannels(prev => ({
      ...prev,
      [channelId]: {
        ...prev[channelId],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    const updates = Object.entries(editedChannels).map(([channelId, data]) => ({
      channelId,
      ...data,
    }));

    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    bulkUpdateMutation.mutate(updates);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Sign in to manage channel settings</h1>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const hasChanges = Object.keys(editedChannels).length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Channel Settings</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes {hasChanges && `(${Object.keys(editedChannels).length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Client Metadata</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Update website URLs and business names for your Discord channels. Changes are saved when you click "Save Changes".
            </p>

            {channelsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : channelsQuery.data && channelsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Channel Name</TableHead>
                      <TableHead className="w-[300px]">Client Website</TableHead>
                      <TableHead className="w-[300px]">Client Business Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelsQuery.data.map((channel) => {
                      const edited = editedChannels[channel.id];
                      const currentWebsite = edited?.clientWebsite !== undefined ? edited.clientWebsite : (channel.clientWebsite || '');
                      const currentBusinessName = edited?.clientBusinessName !== undefined ? edited.clientBusinessName : (channel.clientBusinessName || '');

                      return (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>
                            <Input
                              value={currentWebsite}
                              onChange={(e) => handleFieldChange(channel.id, 'clientWebsite', e.target.value)}
                              placeholder="https://example.com"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={currentBusinessName}
                              onChange={(e) => handleFieldChange(channel.id, 'clientBusinessName', e.target.value)}
                              placeholder="Business Name"
                              className="w-full"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No channels found
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
