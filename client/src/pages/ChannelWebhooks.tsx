import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ChannelWebhooks() {
  const { data: webhookInventory, isLoading, refetch } = trpc.discord.channelWebhooks.useQuery();

  const handleRefresh = async () => {
    toast.info("Refreshing webhook inventory...");
    await refetch();
    toast.success("Webhook inventory refreshed");
  };

  const getChannelTypeLabel = (type: number) => {
    const types: Record<number, string> = {
      0: "Text",
      2: "Voice",
      4: "Category",
      5: "Announcement",
      13: "Stage",
      15: "Forum",
    };
    return types[type] || `Type ${type}`;
  };

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
            <div>
              <h1 className="text-2xl font-bold text-white">Channel Webhooks Inventory</h1>
              <p className="text-sm text-slate-400">Weekly automated export of Discord channel webhooks</p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        {webhookInventory && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">Total Channels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {webhookInventory.summary?.total_channels || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">Total Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-400">
                  {webhookInventory.summary?.total_webhooks || 0}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">Channels with Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400">
                  {webhookInventory.summary?.channels_with_webhooks || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Channel Webhooks</CardTitle>
            <CardDescription className="text-slate-400">
              {webhookInventory?.export_datetime 
                ? `Last updated: ${new Date(webhookInventory.export_datetime).toLocaleString()}`
                : 'Loading webhook inventory...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-slate-400">Loading webhook inventory...</div>
            ) : !webhookInventory?.webhooks || webhookInventory.webhooks.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No webhooks found. The weekly export will populate this table automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-700/50">
                      <TableHead className="text-slate-300">Channel Name</TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
                      <TableHead className="text-slate-300">Webhook Name</TableHead>
                      <TableHead className="text-slate-300">Webhook ID</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookInventory.webhooks.map((webhook, index) => (
                      <TableRow key={`${webhook.channel_id}-${webhook.webhook_id}-${index}`} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">
                          {webhook.channel_name || <span className="text-slate-500 italic">Unknown</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                            {getChannelTypeLabel(webhook.channel_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {webhook.webhook_name || <span className="text-slate-500 italic">N/A</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-400">
                          {webhook.webhook_id || <span className="text-slate-500 italic">N/A</span>}
                        </TableCell>
                        <TableCell>
                          {webhook.webhook_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                              onClick={() => {
                                navigator.clipboard.writeText(webhook.webhook_url);
                                toast.success("Webhook URL copied to clipboard");
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Copy URL
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">About This Data</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-400 text-sm space-y-2">
            <p>
              This inventory is automatically updated every <strong className="text-white">Monday at 5:00 AM</strong> via a scheduled script.
            </p>
            <p>
              The script fetches all channels and their associated webhooks from your Discord guild and sends the data to this dashboard.
            </p>
            <p className="text-amber-400">
              ⚠️ <strong>Security Note:</strong> Webhook URLs are sensitive credentials. Handle with care and never share publicly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
