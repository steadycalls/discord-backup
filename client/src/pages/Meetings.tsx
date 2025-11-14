import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, ExternalLink, FileText, Loader2, Upload, Search, Filter } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Meetings() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const suggestionsQuery = trpc.analytics.getSearchSuggestions.useQuery(
    { query: searchText, limit: 5 },
    { enabled: isAuthenticated && searchText.length >= 2 }
  );

  const meetingsQuery = trpc.meetings.filter.useQuery(
    {
      searchText: searchText || undefined,
      channelId: selectedChannel || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 50,
    },
    { enabled: isAuthenticated }
  );

  // Channels will be fetched from matched channel IDs in meetings

  const uploadMutation = trpc.meetings.uploadCsv.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.count} meetings`);
      meetingsQuery.refetch();
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

  const handleClearFilters = () => {
    setSearchText("");
    setSelectedChannel("");
    setStartDate("");
    setEndDate("");
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
        <h1 className="text-2xl font-bold">Sign in to view meetings</h1>
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
              <h1 className="text-2xl font-bold">{APP_TITLE} - Meetings Dashboard</h1>
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
                Import Meetings from CSV
              </CardTitle>
              <CardDescription>
                Upload a Read.ai CSV export to populate the meetings database
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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
                {meetingsQuery.data && (
                  <span className="text-sm text-muted-foreground">
                    Total meetings: {meetingsQuery.data.total}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search title, client, or participant..."
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="pl-9"
                    />
                    {showSuggestions && searchText.length >= 2 && suggestionsQuery.data && (
                      (suggestionsQuery.data.clients.length > 0 ||
                       suggestionsQuery.data.participants.length > 0 ||
                       suggestionsQuery.data.topics.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {suggestionsQuery.data.clients.length > 0 && (
                            <div className="p-2">
                              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Clients</div>
                              {suggestionsQuery.data.clients.map((client, idx) => (
                                <button
                                  key={`client-${idx}`}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm transition-colors"
                                  onClick={() => {
                                    setSearchText(client);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {client}
                                </button>
                              ))}
                            </div>
                          )}
                          {suggestionsQuery.data.participants.length > 0 && (
                            <div className="p-2 border-t">
                              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Participants</div>
                              {suggestionsQuery.data.participants.map((participant, idx) => (
                                <button
                                  key={`participant-${idx}`}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm transition-colors"
                                  onClick={() => {
                                    setSearchText(participant);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {participant}
                                </button>
                              ))}
                            </div>
                          )}
                          {suggestionsQuery.data.topics.length > 0 && (
                            <div className="p-2 border-t">
                              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">Topics</div>
                              {suggestionsQuery.data.topics.map((topic, idx) => (
                                <button
                                  key={`topic-${idx}`}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm transition-colors"
                                  onClick={() => {
                                    setSearchText(topic);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {topic}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discord Channel</label>
                  <Select value={selectedChannel} onValueChange={(val) => setSelectedChannel(val === "all" ? undefined : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      {/* Channel options will be populated from meeting data */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Meetings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Read.ai Meetings
              </CardTitle>
              <CardDescription>
                All meetings received from Read.ai webhooks and CSV imports
              </CardDescription>
            </CardHeader>
            <CardContent>
              {meetingsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : meetingsQuery.data && meetingsQuery.data.meetings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Summary</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetingsQuery.data.meetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell className="whitespace-nowrap">
                            {meeting.startTime
                              ? new Date(meeting.startTime).toLocaleDateString()
                              : new Date(meeting.receivedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{meeting.title}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="line-clamp-2 text-sm text-muted-foreground">
                              {meeting.summary || "No summary"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {meeting.participants
                              ? meeting.participants.split(",").slice(0, 3).join(", ") +
                                (meeting.participants.split(",").length > 3 ? "..." : "")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {meeting.matchedChannelId ? (
                              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">
                                Matched
                              </span>
                            ) : (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                No match
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {meeting.meetingLink ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={meeting.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No meetings found.</p>
                  <p className="text-sm">Upload a CSV file or wait for Read.ai webhooks.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
