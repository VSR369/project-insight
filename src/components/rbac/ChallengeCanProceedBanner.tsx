/**
 * SCR-18: Challenge Can Proceed Notification Banner
 * Shows when all roles transition to READY for an org/challenge.
 * BRD Ref: MOD-06, BR-CORE-007
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, ArrowRight, PartyPopper } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChallengeCanProceedBannerProps {
  orgName: string;
  challengeTitle?: string;
  model: string;
  filledCount: number;
  totalCount: number;
  deepLink?: string;
  onDismiss?: () => void;
}

export function ChallengeCanProceedBanner({
  orgName,
  challengeTitle,
  model,
  filledCount,
  totalCount,
  deepLink,
  onDismiss,
}: ChallengeCanProceedBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-green-200 bg-green-50/60 dark:border-green-800/40 dark:bg-green-950/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <PartyPopper className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                Challenge Can Proceed
              </h3>
              <Badge
                variant="outline"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                READY
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mt-1">
              All {totalCount} required roles for{" "}
              <span className="font-medium text-foreground">{orgName}</span>
              {challengeTitle && (
                <>
                  {" — "}
                  <span className="font-medium text-foreground">
                    {challengeTitle}
                  </span>
                </>
              )}{" "}
              have been filled ({filledCount}/{totalCount}).
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {model === "mp" ? "Aggregator" : model === "agg" ? "Aggregator" : model}
              </Badge>
              {deepLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate(deepLink)}
                >
                  View Challenge
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Dismiss */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
