import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";

export default function Messages() {
  const [searchText, setSearchText] = useState("");
  const [selectedGuild, setSelectedGuild] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: guilds } = trpc.discord.guilds.useQuery();
  
  // Set default guild to "Restoration Inbound" when guilds are loaded
  useEffect(() => {
    if (guilds && guilds.length > 0 && selectedGuild === "all") {
      // Try exact match first
      let restorationGuild = guilds.find(g => g.name === "Restoration Inbound");
      // Try case-insensitive match if exact doesn't work
      if (!restorationGuild) {
        restorationGuild = guilds.find(g => g.name.toLowerCase().includes("restoration") && g.name.toLowerCase().includes("inbound"));
      }
      if (restorationGuild) {
        setSelectedGuild(restorationGuild.id);
      }
    }
  }, [guilds]);
  const { data: channels } = trpc.discord.channels.useQuery({ guildId: selectedGuild !== "all" ? selectedGuild : undefined });
  const { data: messagesData, isLoading } = trpc.discord.messages.useQuery({
    guildId: selectedGuild !== "all" ? selectedGuild : undefined,
    channelId: selectedChannel !== "all" ? selectedChannel : undefined,
    searchText: searchText || undefined,
    limit,
    offset: page * limit,
  });

  const messages = messagesData?.messages || [];
  const total = messagesData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Message Archive</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Search & Filter</CardTitle>
            <CardDescription className="text-slate-400">
              Filter messages by guild, channel, or search content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-slate-300">Guild</Label>
                <Select value={selectedGuild} onValueChange={setSelectedGuild}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All Guilds" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all" className="text-white">
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

              <div>
                <Label className="text-slate-300">Channel</Label>
                <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={!selectedGuild}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="all" className="text-white">
                      All Channels
                    </SelectItem>
                    {channels?.slice().sort((a, b) => a.name.localeCompare(b.name)).map((channel) => (
                      <SelectItem key={channel.id} value={channel.id} className="text-white">
                        #{channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Search Content</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-400">
                Showing {messages.length} of {total} messages
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-slate-300">
                  Page {page + 1} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-8 text-center text-slate-400">Loading messages...</CardContent>
            </Card>
          ) : messages.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-8 text-center text-slate-400">
                No messages found. Make sure your Discord bot is running and syncing messages.
              </CardContent>
            </Card>
          ) : (
            messages.map((item) => (
              <Card key={item.message.id} className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-base">
                        {item.author?.username || "Unknown User"}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        {item.guild?.name} / #{item.channel?.name} •{" "}
                        {new Date(item.message.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-200 whitespace-pre-wrap">{item.message.content || "(No content)"}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
