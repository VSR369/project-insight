import { useState } from 'react';
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

  const { data: comments, isLoading } = useContentComments(contentId);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      { content_id: contentId, provider_id: currentUserProviderId, comment_text: newComment.trim() },
      { onSuccess: () => setNewComment('') }
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
      <div key={comment.id} className={cn("group", depth > 0 && "ml-8 mt-3")}>
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
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              
              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-3 w-3" />
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
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  Reply
                </Button>
              )}
              
              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground gap-1"
                  onClick={() => toggleReplies(comment.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Hide replies
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Reply Input */}
            {replyingTo === comment.id && (
              <div className="flex gap-2 mt-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                  maxLength={1500}
                />
                <Button
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyText.trim() || addComment.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Nested Replies */}
            {isExpanded && hasReplies && (
              <div className="mt-2">
                {replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
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
    <div className="border-t border-border">
      {/* Comment Input */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            maxLength={1500}
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || addComment.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {newComment.length}/1500
        </p>
      </div>

      {/* Comments List */}
      <div className="p-4 space-y-4">
        {(comments ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          (comments ?? []).map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
}
