import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, Calendar, Loader2, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function Analytics() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const statsQuery = trpc.analytics.getMeetingStats.useQuery(
    { startDate: startDate || undefined, endDate: endDate || undefined },
    { enabled: isAuthenticated }
  );

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
        <h1 className="text-2xl font-bold">Sign in to view analytics</h1>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  const stats = statsQuery.data;

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
              <h1 className="text-2xl font-bold">{APP_TITLE} - Analytics</h1>
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
          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date Range Filter
              </CardTitle>
              <CardDescription>Filter analytics by date range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {statsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalMeetings}</div>
                    <p className="text-xs text-muted-foreground">
                      {startDate || endDate ? "In selected range" : "All time"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.meetingsByChannel.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Channels with meetings
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Participants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.topParticipants.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Total participants
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Meetings by Channel */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Channels</CardTitle>
                  <CardDescription>Top 10 channels by meeting count</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.meetingsByChannel.length > 0 ? (
                    <div className="space-y-4">
                      {stats.meetingsByChannel.map((channel, index) => {
                        const maxCount = stats.meetingsByChannel[0]?.count || 1;
                        const percentage = (channel.count / maxCount) * 100;
                        return (
                          <div key={channel.channelId} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                #{index + 1} - {channel.channelId}
                              </span>
                              <span className="text-muted-foreground">{channel.count} meetings</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Meetings by Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Frequency Over Time</CardTitle>
                  <CardDescription>Meetings per month</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.meetingsByMonth.length > 0 ? (
                    <div className="space-y-4">
                      {stats.meetingsByMonth.map((monthData) => {
                        const maxCount = Math.max(...stats.meetingsByMonth.map(m => m.count));
                        const percentage = (monthData.count / maxCount) * 100;
                        return (
                          <div key={monthData.month} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{monthData.month}</span>
                              <span className="text-muted-foreground">{monthData.count} meetings</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Participants */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Participants</CardTitle>
                  <CardDescription>Most frequent meeting participants</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.topParticipants.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topParticipants.map((participant, index) => {
                        const maxCount = stats.topParticipants[0]?.count || 1;
                        const percentage = (participant.count / maxCount) * 100;
                        return (
                          <div key={participant.name} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">
                                #{index + 1} - {participant.name}
                              </span>
                              <span className="text-muted-foreground">{participant.count} meetings</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
