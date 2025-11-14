import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Chat() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const messagesQuery = trpc.chat.messages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId }
  );

  const createConversationMutation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      conversationsQuery.refetch();
      setSelectedConversationId(data.id);
      toast.success("New conversation created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      setMessageInput("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteConversationMutation = trpc.chat.deleteConversation.useMutation({
    onSuccess: () => {
      conversationsQuery.refetch();
      setSelectedConversationId(null);
      toast.success("Conversation deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversationsQuery.data && conversationsQuery.data.length > 0) {
      setSelectedConversationId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  const handleNewChat = () => {
    const title = `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    createConversationMutation.mutate({ title });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageInput.trim(),
    });
  };

  const handleDeleteConversation = (id: number) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate({ id });
    }
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
        <h1 className="text-2xl font-bold">Sign in to use AI Chat</h1>
        <p className="text-muted-foreground">Search through your Discord archive with AI assistance</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign In</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <Link href="/">
            <a className="text-lg font-semibold hover:text-primary transition-colors">{APP_TITLE}</a>
          </Link>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            disabled={createConversationMutation.isPending}
            className="w-full"
            variant="outline"
          >
            {createConversationMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-3">
          {conversationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversationsQuery.data && conversationsQuery.data.length > 0 ? (
            <div className="space-y-1 pb-3">
              {conversationsQuery.data.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversationId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setSelectedConversationId(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate text-sm">{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations yet. Click "New Chat" to start.
            </div>
          )}
        </ScrollArea>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/settings">Settings</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              {messagesQuery.isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : messagesQuery.data && messagesQuery.data.length > 0 ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {messagesQuery.data.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <MessageSquare className="w-16 h-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">Start a conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ask questions about your Discord archive
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Ask anything about your Discord messages..."
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sendMessageMutation.isPending || !messageInput.trim()}>
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No conversation selected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select a conversation or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
