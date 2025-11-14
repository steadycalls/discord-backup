import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Database, MessageSquare, Webhook } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-slate-300">Welcome, {user?.name}</span>
                <Link href="/webhooks">
                  <Button variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                    Manage Webhooks
                  </Button>
                </Link>
              </>
            ) : (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-6">
            Discord Message Archive & Webhook Manager
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Archive Discord messages to PostgreSQL and trigger webhooks on database events. Search, analyze, and
            integrate your Discord data with external systems.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/messages">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <MessageSquare className="w-5 h-5 mr-2" />
                Browse Messages
              </Button>
            </Link>
            {isAuthenticated && (
              <Link href="/webhooks">
                <Button size="lg" variant="outline" className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                  <Webhook className="w-5 h-5 mr-2" />
                  Configure Webhooks
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Database className="w-12 h-12 text-blue-400 mb-4" />
              <CardTitle className="text-white">Message Archive</CardTitle>
              <CardDescription className="text-slate-400">
                Automatically archive all Discord messages to PostgreSQL with full metadata and attachments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <MessageSquare className="w-12 h-12 text-green-400 mb-4" />
              <CardTitle className="text-white">Search & Browse</CardTitle>
              <CardDescription className="text-slate-400">
                Search through archived messages by guild, channel, user, or content with advanced filters
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Webhook className="w-12 h-12 text-purple-400 mb-4" />
              <CardTitle className="text-white">Webhook Integration</CardTitle>
              <CardDescription className="text-slate-400">
                Trigger HTTP webhooks on message events (insert, update, delete) with custom filters
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-slate-400">
          <p>Discord Archive Webhook Manager - Built with Discord.py, PostgreSQL, and React</p>
        </div>
      </footer>
    </div>
  );
}
