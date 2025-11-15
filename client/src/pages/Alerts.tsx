import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, Bell, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Alerts() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    alertType: "zero_messages" as "zero_messages" | "volume_spike",
    threshold: 7,
    channelFilter: "",
  });

  const alertsQuery = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created successfully");
      setIsCreateDialogOpen(false);
      setNewAlert({
        name: "",
        alertType: "zero_messages",
        threshold: 7,
        channelFilter: "",
      });
      alertsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const deleteMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted successfully");
      alertsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete alert: ${error.message}`);
    },
  });

  const checkAlertsMutation = trpc.alerts.checkAlerts.useMutation({
    onSuccess: (data) => {
      if (data.triggered.length > 0) {
        toast.success(`Triggered ${data.triggered.length} alert(s)`);
      } else {
        toast.info("No alerts triggered");
      }
      alertsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to check alerts: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newAlert.name.trim()) {
      toast.error("Please enter an alert name");
      return;
    }
    if (newAlert.threshold < 1) {
      toast.error("Threshold must be at least 1");
      return;
    }
    createMutation.mutate(newAlert);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this alert?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-slate-400">
              Please log in to manage activity alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Activity Alerts
                </CardTitle>
                <CardDescription className="text-slate-400 mt-2">
                  Configure alerts to monitor channel activity and receive notifications
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => checkAlertsMutation.mutate()}
                  disabled={checkAlertsMutation.isPending}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  {checkAlertsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  Check Now
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Alert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Create New Alert</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Set up a new activity monitoring alert
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="name" className="text-slate-200">Alert Name</Label>
                        <Input
                          id="name"
                          value={newAlert.name}
                          onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                          placeholder="e.g., Inactive Clients Alert"
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="alertType" className="text-slate-200">Alert Type</Label>
                        <Select
                          value={newAlert.alertType}
                          onValueChange={(value: "zero_messages" | "volume_spike") =>
                            setNewAlert({ ...newAlert, alertType: value })
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="zero_messages" className="text-white hover:bg-slate-700">
                              Zero Messages
                            </SelectItem>
                            <SelectItem value="volume_spike" className="text-white hover:bg-slate-700">
                              Volume Spike
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="threshold" className="text-slate-200">
                          Threshold ({newAlert.alertType === "zero_messages" ? "days" : "% increase"})
                        </Label>
                        <Input
                          id="threshold"
                          type="number"
                          value={newAlert.threshold}
                          onChange={(e) => setNewAlert({ ...newAlert, threshold: parseInt(e.target.value) || 1 })}
                          min="1"
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="channelFilter" className="text-slate-200">
                          Channel Filter (optional)
                        </Label>
                        <Input
                          id="channelFilter"
                          value={newAlert.channelFilter}
                          onChange={(e) => setNewAlert({ ...newAlert, channelFilter: e.target.value })}
                          placeholder="tag1, tag2 or channel IDs"
                          className="bg-slate-700 border-slate-600 text-white mt-1"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Leave empty to monitor all channels
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreate}
                        disabled={createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alertsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Name</TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
                      <TableHead className="text-slate-300">Threshold</TableHead>
                      <TableHead className="text-slate-300">Filter</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Last Triggered</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsQuery.data.map((alert) => (
                      <TableRow key={alert.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-slate-200 font-medium">{alert.name}</TableCell>
                        <TableCell className="text-slate-200">
                          {alert.alertType === "zero_messages" ? "Zero Messages" : "Volume Spike"}
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {alert.threshold} {alert.alertType === "zero_messages" ? "days" : "%"}
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {alert.channelFilter || <span className="text-slate-500">All channels</span>}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              alert.isActive
                                ? "bg-green-900/50 text-green-400"
                                : "bg-slate-700 text-slate-400"
                            }`}
                          >
                            {alert.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {alert.lastTriggered
                            ? new Date(alert.lastTriggered).toLocaleDateString()
                            : <span className="text-slate-500">Never</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(alert.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p>No alerts configured</p>
                <p className="text-sm mt-2">Create your first alert to start monitoring channel activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
