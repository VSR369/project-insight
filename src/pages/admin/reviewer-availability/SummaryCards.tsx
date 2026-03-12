import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";
import type { SlotSummary } from "@/hooks/queries/useAdminReviewerSlots";

interface SummaryCardsProps {
  summary: SlotSummary;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      title: "Future Slots",
      value: summary.totalSlots,
      icon: CalendarDays,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Open",
      value: summary.openSlots,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Booked",
      value: summary.bookedSlots,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Reviewers",
      value: summary.uniqueReviewers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? "..." : card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
