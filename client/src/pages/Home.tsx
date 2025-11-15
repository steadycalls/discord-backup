import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Database, MessageSquare, Webhook, Sparkles, Calendar, BarChart3, User, Settings, LogOut, ChevronDown, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import React from "react";

function ProfileDropdown({ user }: { user: any }) {
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-800">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.email ? `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase())}?d=identicon` : undefined} />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-slate-300">{user?.name}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
        <DropdownMenuItem asChild className="cursor-pointer text-slate-200 focus:bg-slate-700 focus:text-white">
          <Link href="/settings">
            <User className="w-4 h-4 mr-2" />
            <span>Edit Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer text-slate-200 focus:bg-slate-700 focus:text-white">
          <Link href="/settings">
            <Settings className="w-4 h-4 mr-2" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-400 focus:bg-slate-700 focus:text-red-300"
          disabled={logoutMutation.isPending}
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple MD5 hash for Gravatar
function md5(str: string): string {
  // Simple hash for demo - in production use a proper MD5 library
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [timeRange, setTimeRange] = React.useState<"24h" | "7d">("24h");
  const [clientTimeRange, setClientTimeRange] = React.useState<"24h" | "7d" | "30d">("24h");
  const [sortColumn, setSortColumn] = React.useState<"channelName" | "messageCount" | "meetingCount" | null>("messageCount");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const { data: activityStats } = trpc.stats.activity.useQuery({ timeRange });
  const { data: clientChannelStats } = trpc.stats.clientChannels.useQuery({ timeRange: clientTimeRange });

  const handleSort = (column: "channelName" | "messageCount" | "meetingCount") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "messageCount" ? "desc" : "asc");
    }
  };

  const sortedClientChannelStats = React.useMemo(() => {
    if (!clientChannelStats || clientChannelStats.length === 0) return [];
    
    const sorted = [...clientChannelStats];
    
    if (sortColumn === "channelName") {
      sorted.sort((a, b) => {
        const comparison = a.channelName.localeCompare(b.channelName);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortColumn === "messageCount") {
      sorted.sort((a, b) => {
        const comparison = a.messageCount - b.messageCount;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    } else if (sortColumn === "meetingCount") {
      sorted.sort((a, b) => {
        const comparison = a.meetingCount - b.meetingCount;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    
    return sorted;
  }, [clientChannelStats, sortColumn, sortDirection]);

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
              <ProfileDropdown user={user} />
            ) : (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Activity Stats */}
      {isAuthenticated && (
        <section className="container mx-auto px-4 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Activity Overview</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={timeRange === "24h" ? "default" : "outline"}
                onClick={() => setTimeRange("24h")}
                className={timeRange === "24h" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}
              >
                24 Hours
              </Button>
              <Button
                size="sm"
                variant={timeRange === "7d" ? "default" : "outline"}
                onClick={() => setTimeRange("7d")}
                className={timeRange === "7d" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-800"}
              >
                7 Days
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-blue-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Discord Messages</CardTitle>
                  <MessageSquare className="w-8 h-8 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2">
                  {activityStats?.messages.toLocaleString() || 0}
                </div>
                <p className="text-sm text-blue-200">
                  {timeRange === "24h" ? "in the last 24 hours" : "in the last 7 days"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border-purple-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">Read.ai Meetings</CardTitle>
                  <Calendar className="w-8 h-8 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2">
                  {activityStats?.meetings.toLocaleString() || 0}
                </div>
                <p className="text-sm text-purple-200">
                  {timeRange === "24h" ? "in the last 24 hours" : "in the last 7 days"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/40 to-green-800/40 border-green-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">AI Chats</CardTitle>
                  <Sparkles className="w-8 h-8 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white mb-2">
                  {activityStats?.chats.toLocaleString() || 0}
                </div>
                <p className="text-sm text-green-200">
                  {timeRange === "24h" ? "in the last 24 hours" : "in the last 7 days"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-6">
            {APP_TITLE}
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Archive Discord messages to PostgreSQL and trigger webhooks on database events. Search, analyze, and
            integrate your Discord data with external systems.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {isAuthenticated && (
              <Link href="/chat">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI Chat
                </Button>
              </Link>
            )}
            <Link href="/messages">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                <MessageSquare className="w-5 h-5 mr-2" />
                Browse Messages
              </Button>
            </Link>
            <Link href="/meetings">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <Calendar className="w-5 h-5 mr-2" />
                Meetings Dashboard
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
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

      {/* Client Activity Table */}
      {isAuthenticated && (
        <section className="container mx-auto px-4 py-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-red-400" />
                  <CardTitle className="text-white text-xl">Client Channel Activity</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Link href="/channel-settings">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Settings
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant={clientTimeRange === "24h" ? "default" : "outline"}
                    onClick={() => setClientTimeRange("24h")}
                    className={clientTimeRange === "24h" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                  >
                    24hrs
                  </Button>
                  <Button
                    size="sm"
                    variant={clientTimeRange === "7d" ? "default" : "outline"}
                    onClick={() => setClientTimeRange("7d")}
                    className={clientTimeRange === "7d" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                  >
                    7 Days
                  </Button>
                  <Button
                    size="sm"
                    variant={clientTimeRange === "30d" ? "default" : "outline"}
                    onClick={() => setClientTimeRange("30d")}
                    className={clientTimeRange === "30d" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                  >
                    30 Days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-red-400 font-semibold">
                        <button
                          onClick={() => handleSort("channelName")}
                          className="flex items-center gap-1 hover:text-red-300 transition-colors"
                        >
                          Client Channel
                          {sortColumn === "channelName" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-red-400 font-semibold">
                        <button
                          onClick={() => handleSort("messageCount")}
                          className="flex items-center gap-1 hover:text-red-300 transition-colors"
                        >
                          # of Messages
                          {sortColumn === "messageCount" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="text-red-400 font-semibold">Client Website</TableHead>
                      <TableHead className="text-red-400 font-semibold">Client Business Name</TableHead>
                      <TableHead className="text-red-400 font-semibold">
                        <button
                          onClick={() => handleSort("meetingCount")}
                          className="flex items-center gap-1 hover:text-red-300 transition-colors"
                        >
                          # of Meetings
                          {sortColumn === "meetingCount" ? (
                            sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClientChannelStats && sortedClientChannelStats.length > 0 ? (
                      sortedClientChannelStats.map((channel) => (
                        <TableRow key={channel.channelId} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="text-slate-200">{channel.channelName}</TableCell>
                          <TableCell className="text-slate-200">{channel.messageCount}</TableCell>
                          <TableCell className="text-slate-200">
                            {channel.clientWebsite ? (
                              <a href={channel.clientWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                {channel.clientWebsite}
                              </a>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-200">
                            {channel.clientBusinessName || <span className="text-slate-500">-</span>}
                          </TableCell>
                          <TableCell className="text-slate-200">{channel.meetingCount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-slate-700">
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                          No client activity in the selected time range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Sparkles className="w-12 h-12 text-purple-400 mb-4" />
              <CardTitle className="text-white">AI Chat Search</CardTitle>
              <CardDescription className="text-slate-400">
                Ask questions about your Discord archive using AI-powered search and conversation
              </CardDescription>
            </CardHeader>
          </Card>

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
          <p>{APP_TITLE} - Built with Discord.py, PostgreSQL, and React</p>
        </div>
      </footer>
    </div>
  );
}
