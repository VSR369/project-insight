import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useContentComments, useAddComment, useDeleteComment, PulseCommentWithProvider } from '@/hooks/queries/usePulseSocial';

interface CommentSectionProps {
  contentId: string;
  currentUserProviderId: string;
  maxDepth?: number;
}

export function CommentSection({ contentId, currentUserProviderId, maxDepth = 3 }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments, isLoading } = useContentComments(contentId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  // Focus reply input when opening reply
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      { content_id: contentId, provider_id: currentUserProviderId, comment_text: newComment.trim() },
      { 
        onSuccess: () => {
          setNewComment('');
          // Focus back to comment input after submission
          commentInputRef.current?.focus();
        } 
      }
    );
  };

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return;
    addComment.mutate(
      { content_id: contentId, provider_id: currentUserProviderId, comment_text: replyText.trim(), parent_comment_id: parentId },
      { 
        onSuccess: () => {
          setReplyText('');
          setReplyingTo(null);
          setExpandedReplies(prev => new Set(prev).add(parentId));
        } 
      }
    );
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const renderComment = (comment: PulseCommentWithProvider, depth: number = 0) => {
    const replies = comment.replies ?? [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const canReply = depth < maxDepth - 1;
    const providerName = comment.provider 
      ? `${comment.provider.first_name || ''} ${comment.provider.last_name || ''}`.trim() || 'User'
      : 'User';
    const initials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const isOwnComment = comment.provider_id === currentUserProviderId;

    return (
      <article 
        key={comment.id} 
        className={cn("group", depth > 0 && "ml-8 mt-3")}
        aria-label={`Comment by ${providerName}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{providerName}</span>
              <span className="text-xs text-muted-foreground">
                <time dateTime={comment.created_at}>
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </time>
              </span>
              
              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteComment.mutate({ commentId: comment.id, contentId })}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">
              {comment.comment_text}
            </p>

            <div className="flex items-center gap-3 mt-1">
              {canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground min-h-[44px]"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  aria-label={`Reply to ${providerName}`}
                  aria-expanded={replyingTo === comment.id}
                >
                  Reply
                </Button>
              )}
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground gap-1 min-h-[44px]"
                  onClick={() => toggleReplies(comment.id)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Hide replies' : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                      Hide replies
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="flex gap-2 mt-2" role="form" aria-label={`Reply to ${providerName}`}>
                <Textarea
                  ref={replyInputRef}
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  maxLength={1500}
                  aria-label="Write a reply"
                />
                <Button
                  size="icon"
                  className="shrink-0 min-w-[44px] min-h-[44px]"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyText.trim() || addComment.isPending}
                  aria-label="Submit reply"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Nested Replies */}
            {isExpanded && hasReplies && (
              <div className="mt-2" role="list" aria-label="Replies">
                {replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </article>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4" aria-label="Loading comments">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="border-t border-border" aria-label="Comments">
      {/* Comment Input */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2" role="form" aria-label="Add a comment">
          <Textarea
            ref={commentInputRef}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            maxLength={1500}
            aria-label="Write a comment"
          />
          <Button
            size="icon"
            className="shrink-0 min-w-[44px] min-h-[44px]"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || addComment.isPending}
            aria-label="Submit comment"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right" aria-live="polite">
          {newComment.length}/1500
        </p>
      </div>

      {/* Comments List */}
      <div className="p-4 space-y-4" role="list" aria-label="Comments list">
        {(comments ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          (comments ?? []).map(comment => renderComment(comment))
        )}
      </div>
    </section>
  );
}
