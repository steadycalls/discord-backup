import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowDown, ArrowUp, ExternalLink, Loader2, Search, Filter } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortColumn = "locationName" | "brandStatus" | "campaignStatus" | "checkedAt" | null;
type SortDirection = "asc" | "desc";

export default function A2PStatus() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>("checkedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: a2pStatuses, isLoading } = trpc.a2p.latestStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    if (!a2pStatuses) return [];

    let filtered = [...a2pStatuses];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.locationName?.toLowerCase().includes(term) ||
          item.companyName?.toLowerCase().includes(term) ||
          item.locationId.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "approved") {
        filtered = filtered.filter(
          (item) => item.brandStatus === "Approved" && item.campaignStatus === "Approved"
        );
      } else if (statusFilter === "not-approved") {
        filtered = filtered.filter(
          (item) => item.brandStatus !== "Approved" || item.campaignStatus !== "Approved"
        );
      } else if (statusFilter === "in-review") {
        filtered = filtered.filter(
          (item) => item.brandStatus === "In Review" || item.campaignStatus === "In Review"
        );
      } else if (statusFilter === "yet-to-start") {
        filtered = filtered.filter(
          (item) => item.brandStatus === "Yet to Start" || item.campaignStatus === "Yet to Start"
        );
      }
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];

        if (sortColumn === "checkedAt") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal?.toLowerCase() || "";
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [a2pStatuses, searchTerm, statusFilter, sortColumn, sortDirection]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-900/50 text-green-400";
      case "In Review":
        return "bg-yellow-900/50 text-yellow-400";
      case "Yet to Start":
        return "bg-slate-700 text-slate-400";
      case "UNKNOWN":
        return "bg-red-900/50 text-red-400";
      default:
        return "bg-slate-700 text-slate-400";
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUp className="w-4 h-4 opacity-30" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
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
              Please log in to view A2P campaign status
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
            <CardTitle className="text-white text-2xl">A2P Campaign Status</CardTitle>
            <CardDescription className="text-slate-400">
              Monitor Application-to-Person messaging campaign approval status across all GoHighLevel locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by location name, company, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-slate-700 border-slate-600 text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">All Statuses</SelectItem>
                  <SelectItem value="approved" className="text-white hover:bg-slate-700">Fully Approved</SelectItem>
                  <SelectItem value="not-approved" className="text-white hover:bg-slate-700">Not Approved</SelectItem>
                  <SelectItem value="in-review" className="text-white hover:bg-slate-700">In Review</SelectItem>
                  <SelectItem value="yet-to-start" className="text-white hover:bg-slate-700">Yet to Start</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredAndSortedData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort("locationName")}
                          className="flex items-center gap-2 hover:text-white"
                        >
                          Location Name
                          <SortIcon column="locationName" />
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Company</TableHead>
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort("brandStatus")}
                          className="flex items-center gap-2 hover:text-white"
                        >
                          Brand Status
                          <SortIcon column="brandStatus" />
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort("campaignStatus")}
                          className="flex items-center gap-2 hover:text-white"
                        >
                          Campaign Status
                          <SortIcon column="campaignStatus" />
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort("checkedAt")}
                          className="flex items-center gap-2 hover:text-white"
                        >
                          Last Checked
                          <SortIcon column="checkedAt" />
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.map((status) => (
                      <TableRow key={status.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-slate-200 font-medium">
                          {status.locationName}
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {status.companyName || <span className="text-slate-500">-</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(status.brandStatus)}`}>
                            {status.brandStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(status.campaignStatus)}`}>
                            {status.campaignStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-200">
                          {new Date(status.checkedAt).toLocaleDateString()} {new Date(status.checkedAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          >
                            <a href={status.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              A2P Wizard
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No A2P status data found</p>
                {searchTerm || statusFilter !== "all" ? (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                ) : (
                  <p className="text-sm mt-2">Import A2P status data to get started</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
