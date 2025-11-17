import { trpc } from "@/lib/trpc";
import { Clock, CheckCircle2, AlertCircle, Circle, Loader2 } from "lucide-react";

interface StatusTimelineProps {
  locationId: string;
}

export function StatusTimeline({ locationId }: StatusTimelineProps) {
  const { data: history, isLoading } = trpc.a2p.statusHistory.useQuery({ locationId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No status history available</p>
      </div>
    );
  }

  const getStatusIcon = (brandStatus: string, campaignStatus: string) => {
    const bothApproved = brandStatus === "Approved" && campaignStatus === "Approved";
    const anyInReview = brandStatus === "In Review" || campaignStatus === "In Review";
    const anyYetToStart = brandStatus === "Yet to Start" || campaignStatus === "Yet to Start";

    if (bothApproved) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (anyInReview) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    } else if (anyYetToStart) {
      return <Circle className="w-5 h-5 text-slate-500" />;
    } else {
      return <Circle className="w-5 h-5 text-red-500" />;
    }
  };

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

  return (
    <div className="px-4 py-6 bg-slate-900/50">
      <div className="max-w-4xl">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Status History Timeline
        </h4>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-700" />
          
          {/* Timeline items */}
          <div className="space-y-6">
            {history.map((item, index) => (
              <div key={item.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0">
                  {getStatusIcon(item.brandStatus, item.campaignStatus)}
                </div>
                
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(item.checkedAt).toLocaleDateString()} at {new Date(item.checkedAt).toLocaleTimeString()}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-400">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Brand Status</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(item.brandStatus)}`}>
                          {item.brandStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Campaign Status</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadgeColor(item.campaignStatus)}`}>
                          {item.campaignStatus}
                        </span>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Notes</p>
                        <p className="text-sm text-slate-300">{item.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
