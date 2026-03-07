/**
 * MOD-04 SCR-04-02: Registrant Communication Thread
 * Replaces the stub in VerificationDetailPage "Registrant Comms" tab.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRegistrantThread, type RegistrantMessage } from '@/hooks/queries/useRegistrantThread';
import { useSendRegistrantMessage } from '@/hooks/mutations/useSendRegistrantMessage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationTypeBadge } from '@/components/admin/notifications/NotificationTypeBadge';
import { EmailStatusBadge } from '@/components/admin/notifications/EmailStatusBadge';
import { AlertTriangle, Info, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const PRIVACY_KEYWORDS = ['admin', 'sla', 'escalation', 'tier', 'breach', 'supervisor', 'reassign'];

interface RegistrantCommThreadProps {
  verificationId: string;
  orgName: string;
  recipientEmail?: string;
  recipientName?: string;
  canCompose: boolean; // STATE 1 (assigned admin) or supervisor
}

export function RegistrantCommThread({
  verificationId,
  orgName,
  recipientEmail,
  recipientName,
  canCompose,
}: RegistrantCommThreadProps) {
  const { data: messages, isLoading } = useRegistrantThread(verificationId);
  const sendMutation = useSendRegistrantMessage();

  const [subject, setSubject] = useState(`[Ref: ${orgName}]`);
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Privacy keyword scan
  const privacyWarning = useMemo(() => {
    const text = `${subject} ${body}`.toLowerCase();
    const found = PRIVACY_KEYWORDS.filter((kw) => text.includes(kw));
    return found.length > 0 ? found : null;
  }, [subject, body]);

  const handleSend = () => {
    if (!body.trim() || !recipientEmail) return;
    sendMutation.mutate({
      verificationId,
      subject,
      bodyHtml: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      recipientEmail,
      recipientName,
    }, {
      onSuccess: () => {
        setBody('');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden">
      {/* Privacy Banner */}
      <div className="shrink-0 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border-b px-4 py-2.5 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0" />
        <span>All messages here are visible to the registrant. Do not include internal admin names, SLA metrics, or escalation details.</span>
      </div>

      {/* Message Thread */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {(!messages || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <MessageSquare className="h-8 w-8" />
            <p>No communications have been sent to the registrant yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Compose Panel */}
      {canCompose ? (
        <div className="shrink-0 border-t bg-background p-3 space-y-2">
          {privacyWarning && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Detected privacy-sensitive keywords: <strong>{privacyWarning.join(', ')}</strong>. Please review before sending.</span>
            </div>
          )}
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
          />
          <div className="relative">
            <Textarea
              placeholder="Type your message to the registrant..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[80px] resize-none text-sm pr-16"
              maxLength={2000}
            />
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {body.length}/2000
            </span>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!body.trim() || sendMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-center">
          You do not have permission to compose messages for this verification.
        </div>
      )}
    </div>
  );
}

/** Single message bubble */
function MessageBubble({ message }: { message: RegistrantMessage }) {
  const isSystem = message.message_type !== 'MANUAL';
  const isOutbound = message.direction === 'OUTBOUND';

  return (
    <div className={cn(
      'max-w-[85%] rounded-lg p-3 space-y-1',
      isSystem
        ? 'self-start bg-muted/60 mr-auto'
        : isOutbound
          ? 'self-end bg-primary/10 ml-auto'
          : 'self-start bg-muted/60 mr-auto'
    )}>
      <div className="flex items-center gap-2 flex-wrap">
        {isSystem && <NotificationTypeBadge type={message.message_type} />}
        {message.admin_name && (
          <span className="text-xs font-medium text-foreground">{message.admin_name}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-xs font-medium text-foreground">{message.subject}</p>
      <div
        className="text-sm text-foreground/90"
        dangerouslySetInnerHTML={{ __html: message.body_html }}
      />
      <div className="flex items-center gap-2 pt-1">
        <EmailStatusBadge status={message.email_status} />
      </div>
    </div>
  );
}
