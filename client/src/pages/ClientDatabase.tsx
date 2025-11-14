import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Upload, Loader2, Database, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function ClientDatabase() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mappingsQuery = trpc.clientMappings.list.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated }
  );

  const uploadMutation = trpc.clientMappings.upload.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully uploaded ${data.count} client mappings`);
      mappingsQuery.refetch();
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      uploadMutation.mutate({ csvContent });
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploading(false);
    };

    reader.readAsText(file);
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
        <h1 className="text-2xl font-bold">Sign in to manage client database</h1>
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
              <h1 className="text-2xl font-bold">{APP_TITLE} - Client Database</h1>
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
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Client Database
              </CardTitle>
              <CardDescription>
                Upload a CSV file containing client contact emails and Discord channel mappings.
                This will replace all existing mappings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Select CSV File
                      </>
                    )}
                  </Button>
                  {mappingsQuery.data && (
                    <span className="text-sm text-muted-foreground">
                      Current mappings: {mappingsQuery.data.total}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Required CSV columns:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Primary Point of Contact Email (required)</li>
                    <li>Discord Channel ID (required)</li>
                    <li>Discord Channel Name (optional)</li>
                    <li>Primary Point of Contact Name (optional)</li>
                    <li>AM (Account Manager, optional)</li>
                    <li>PO (Project Owner, optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mappings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Current Client Mappings
              </CardTitle>
              <CardDescription>
                Email-to-Discord channel mappings for Read.ai meeting notifications
              </CardDescription>
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
                        <TableHead>Contact Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Discord Channel</TableHead>
                        <TableHead>Channel ID</TableHead>
                        <TableHead>AM</TableHead>
                        <TableHead>PO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingsQuery.data.mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>{mapping.contactName || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{mapping.contactEmail}</TableCell>
                          <TableCell>{mapping.discordChannelName || "-"}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {mapping.discordChannelId || "-"}
                          </TableCell>
                          <TableCell>{mapping.accountManager || "-"}</TableCell>
                          <TableCell>{mapping.projectOwner || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No client mappings uploaded yet.</p>
                  <p className="text-sm">Upload a CSV file to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
