import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Link as LinkIcon, Loader2, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DiscordClientMatch() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");

  const mappingsQuery = trpc.clientMappings.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const addMappingMutation = trpc.discordClientMatch.addEmailMapping.useMutation({
    onSuccess: () => {
      toast.success("Email mapping added successfully");
      mappingsQuery.refetch();
      setIsDialogOpen(false);
      setSelectedChannelId("");
      setEmail("");
      setContactName("");
    },
    onError: (error) => {
      toast.error(`Failed to add mapping: ${error.message}`);
    },
  });

  const handleAddMapping = () => {
    if (!selectedChannelId || !email) {
      toast.error("Please select a channel and enter an email");
      return;
    }

    addMappingMutation.mutate({
      channelId: selectedChannelId,
      email,
      contactName: contactName || undefined,
    });
  };

  // Group mappings by channel
  const mappingsByChannel = mappingsQuery.data?.mappings.reduce((acc, mapping) => {
    const channelId = mapping.discordChannelId || "unknown";
    if (!acc[channelId]) {
      acc[channelId] = [];
    }
    acc[channelId].push(mapping);
    return {};
  }, {} as Record<string, typeof mappingsQuery.data.mappings>) || {};

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
        <h1 className="text-2xl font-bold">Sign in to manage client mappings</h1>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

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
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">{APP_TITLE} - Discord-Client Matching</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Add Mapping Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Discord Channel to Client Email Mappings
                  </CardTitle>
                  <CardDescription>
                    Associate additional client emails with Discord channels for Read.ai meeting routing
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Email Mapping
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Email to Channel Mapping</DialogTitle>
                      <DialogDescription>
                        Associate a client email with a Discord channel for automatic meeting routing
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="channel">Discord Channel</Label>
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                          <SelectTrigger id="channel">
                            <SelectValue placeholder="Select a channel" />
                          </SelectTrigger>
                          <SelectContent>
                            {mappingsQuery.data?.mappings
                              .filter((m, idx, arr) => 
                                arr.findIndex(x => x.discordChannelId === m.discordChannelId) === idx
                              )
                              .map((mapping) => (
                                <SelectItem 
                                  key={mapping.discordChannelId} 
                                  value={mapping.discordChannelId || ""}
                                >
                                  #{mapping.discordChannelName || mapping.discordChannelId}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Client Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="client@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactName">Contact Name (Optional)</Label>
                        <Input
                          id="contactName"
                          placeholder="John Doe"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMapping} disabled={addMappingMutation.isPending}>
                        {addMappingMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Mapping
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {mappingsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : mappingsQuery.data && mappingsQuery.data.mappings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Discord Channel</TableHead>
                        <TableHead>Contact Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Account Manager</TableHead>
                        <TableHead>Project Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingsQuery.data.mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">
                            #{mapping.discordChannelName || mapping.discordChannelId}
                          </TableCell>
                          <TableCell>{mapping.contactName || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.contactEmail}</TableCell>
                          <TableCell>{mapping.accountManager || "-"}</TableCell>
                          <TableCell>{mapping.projectOwner || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No email mappings found.</p>
                  <p className="text-sm">Upload a client database CSV or add mappings manually.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
