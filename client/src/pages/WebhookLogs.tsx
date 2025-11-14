import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";

export default function WebhookLogs() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: logs, isLoading } = trpc.webhooks.logs.useQuery({ limit: 100 }, { enabled: isAuthenticated });
  const { data: webhooks } = trpc.webhooks.list.useQuery(undefined, { enabled: isAuthenticated });

  const getWebhookName = (webhookId: number) => {
    return webhooks?.find((w) => w.id === webhookId)?.name || `Webhook #${webhookId}`;
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
            <CardDescription className="text-slate-400">Please sign in to view webhook logs</CardDescription>
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/webhooks">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Webhook Delivery Logs</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-8 text-center text-slate-400">Loading logs...</CardContent>
          </Card>
        ) : !logs || logs.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-8 text-center text-slate-400">
              No webhook delivery logs yet. Webhooks will appear here after they are triggered.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-base flex items-center gap-2">
                        {log.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        {getWebhookName(log.webhookId)}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        {new Date(log.deliveredAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          log.success ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
                        }`}
                      >
                        {log.success ? "Success" : "Failed"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">Event:</span>
                      <span className="ml-2 text-white">{log.eventType}</span>
                    </div>
                    {log.statusCode && (
                      <div>
                        <span className="text-slate-400">Status Code:</span>
                        <span className="ml-2 text-white">{log.statusCode}</span>
                      </div>
                    )}
                    {log.messageId && (
                      <div>
                        <span className="text-slate-400">Message ID:</span>
                        <span className="ml-2 text-white font-mono text-xs">{log.messageId}</span>
                      </div>
                    )}
                  </div>
                  {log.errorMessage && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded">
                      <p className="text-sm text-red-200 font-mono">{log.errorMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
