'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Author {
  id: string;
  name: string | null;
  userID: string;
  image?: string | null;
}

interface Comment {
  id: string;
  content: string;
  author: Author | null;
  postId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  childCount?: number;
  likeCount?: number;
  isLiked?: boolean;
}

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
}

export default function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [childComments, setChildComments] = useState<Comment[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Map<string, Comment[]>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Map<string, { count: number; isLiked: boolean }>>(new Map());

  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  const [currentUserName, setCurrentUserName] = useState<string>('User');
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);

  // 確保「留言輸入框」顯示的是最新的名字/頭貼（不要只依賴 session，因為 session 可能尚未刷新）
  useEffect(() => {
    if (!session?.user) return;

    // Fallback: session
    setCurrentUserName(session.user.name || 'User');
    setCurrentUserImage(session.user.image || null);

    if (!sessionUserId) return;

    let cancelled = false;
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`/api/user/${sessionUserId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && data.user) {
          setCurrentUserName(data.user.name || data.user.userID || session.user.name || 'User');
          setCurrentUserImage(data.user.image || session.user.image || null);
        }
      } catch (error) {
        // Ignore; session fallback already set
        console.error('Error fetching current user profile:', error);
      }
    };
    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [sessionUserId, session?.user?.name, session?.user?.image, session?.user]);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      
      if (data.success) {
        const fetchedComments = data.comments || [];
        setComments(fetchedComments);
        
        // 更新按讚狀態
        const newLikesMap = new Map<string, { count: number; isLiked: boolean }>();
        fetchedComments.forEach((comment: Comment) => {
          newLikesMap.set(comment.id, {
            count: comment.likeCount || 0,
            isLiked: comment.isLiked || false,
          });
        });
        setCommentLikes(newLikesMap);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('載入評論失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildComments = async (parentId: string) => {
    setLoadingChildren(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments?parentId=${parentId}`);
      const data = await response.json();
      
      if (data.success) {
        const fetchedChildren = data.comments || [];
        setChildComments(fetchedChildren);
        
        // 更新子評論的按讚狀態
        const newLikesMap = new Map(commentLikes);
        fetchedChildren.forEach((child: Comment) => {
          newLikesMap.set(child.id, {
            count: child.likeCount || 0,
            isLiked: child.isLiked || false,
          });
        });
        setCommentLikes(newLikesMap);
      }
    } catch (error) {
      console.error('Error fetching child comments:', error);
      toast.error('載入回覆失敗');
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!session?.user) {
      toast.error('請先登入');
      return;
    }

    if (!newComment.trim()) {
      toast.error('請輸入評論內容');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment('');
        setIsCommentExpanded(false);
        toast.success('評論發布成功');
        fetchComments();
        // 通知父组件刷新评论数
        onCommentAdded?.();
      } else {
        toast.error(data.error || '發布失敗');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('發布失敗，請稍後再試');
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!session?.user) {
      toast.error('請先登入');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('請輸入回覆內容');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReplyContent('');
        setReplyingTo(null);
        toast.success('回覆發布成功');
        
        // 如果當前正在查看該父評論的詳情，刷新子評論
        if (selectedCommentId === parentId) {
          fetchChildComments(parentId);
        } else {
          // 如果父評論的回复列表已展開，刷新該列表
          if (expandedReplies.has(parentId)) {
            const response = await fetch(`/api/posts/${postId}/comments?parentId=${parentId}`);
            const data = await response.json();
            if (data.success) {
              const fetchedReplies = data.comments || [];
              const newMap = new Map(expandedReplies);
              newMap.set(parentId, fetchedReplies);
              setExpandedReplies(newMap);
              
              // 更新回覆的按讚狀態
              const newLikesMap = new Map(commentLikes);
              fetchedReplies.forEach((reply: Comment) => {
                newLikesMap.set(reply.id, {
                  count: reply.likeCount || 0,
                  isLiked: reply.isLiked || false,
                });
              });
              setCommentLikes(newLikesMap);
            }
          }
          // 刷新頂層評論列表（更新childCount）
          fetchComments();
        }
        // 通知父组件刷新评论数
        onCommentAdded?.();
      } else {
        toast.error(data.error || '發布失敗');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast.error('發布失敗，請稍後再試');
    }
  };

  const handleCommentClick = async (comment: Comment) => {
    setSelectedCommentId(comment.id);
    setSelectedComment(comment);
    setChildComments([]);
    
    // 初始化選中評論的按讚狀態
    const newLikesMap = new Map(commentLikes);
    newLikesMap.set(comment.id, {
      count: comment.likeCount || 0,
      isLiked: comment.isLiked || false,
    });
    setCommentLikes(newLikesMap);
    
    if (comment.childCount && comment.childCount > 0) {
      await fetchChildComments(comment.id);
    }
  };

  const toggleReplies = async (commentId: string) => {
    if (expandedReplies.has(commentId)) {
      // 收起回复
      const newMap = new Map(expandedReplies);
      newMap.delete(commentId);
      setExpandedReplies(newMap);
    } else {
      // 展开回复
      setLoadingReplies(new Set([...Array.from(loadingReplies), commentId]));
      try {
        const response = await fetch(`/api/posts/${postId}/comments?parentId=${commentId}`);
        const data = await response.json();
        
        if (data.success) {
          const fetchedReplies = data.comments || [];
          const newMap = new Map(expandedReplies);
          newMap.set(commentId, fetchedReplies);
          setExpandedReplies(newMap);
          
          // 更新回覆的按讚狀態
          const newLikesMap = new Map(commentLikes);
          fetchedReplies.forEach((reply: Comment) => {
            newLikesMap.set(reply.id, {
              count: reply.likeCount || 0,
              isLiked: reply.isLiked || false,
            });
          });
          setCommentLikes(newLikesMap);
        }
      } catch (error) {
        console.error('Error fetching replies:', error);
        toast.error('載入回覆失敗');
      } finally {
        const newSet = new Set(loadingReplies);
        newSet.delete(commentId);
        setLoadingReplies(newSet);
      }
    }
  };

  const handleBackToComments = () => {
    setSelectedCommentId(null);
    setSelectedComment(null);
    setChildComments([]);
  };

  const handleCommentLike = async (commentId: string) => {
    if (!session?.user) {
      toast.error('請先登入');
      return;
    }

    const currentLikeState = commentLikes.get(commentId);
    const isLiked = currentLikeState?.isLiked || false;
    const currentCount = currentLikeState?.count || 0;

    // 樂觀更新
    const newLikesMap = new Map(commentLikes);
    newLikesMap.set(commentId, {
      count: isLiked ? currentCount - 1 : currentCount + 1,
      isLiked: !isLiked,
    });
    setCommentLikes(newLikesMap);

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // 更新為實際的狀態
        const actualLikesMap = new Map(commentLikes);
        actualLikesMap.set(commentId, {
          count: isLiked ? currentCount - 1 : currentCount + 1,
          isLiked: !isLiked,
        });
        setCommentLikes(actualLikesMap);
      } else {
        // 回滾樂觀更新
        setCommentLikes(new Map(commentLikes));
        toast.error('操作失敗');
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
      // 回滾樂觀更新
      setCommentLikes(new Map(commentLikes));
      toast.error('操作失敗，請稍後再試');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white border-0 shadow-none">
        <div className="text-gray-500 text-center">載入評論中...</div>
      </Card>
    );
  }

  // 如果選擇了某個評論，顯示該評論的詳情頁面
  if (selectedCommentId && selectedComment) {
    return (
      <Card className="p-6 bg-white border-0 shadow-none">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleBackToComments}
          className="mb-4 flex items-center gap-2 hover:bg-gray-100"
          style={{ color: '#5A5A5A' }}
        >
          <ArrowLeft className="h-4 w-4" />
          返回評論列表
        </Button>

        {/* Selected Comment (Pinned) */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
              {selectedComment.author?.image && (
                <img
                  src={selectedComment.author.image}
                  alt={selectedComment.author.name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Link href={`/social/profile/${selectedComment.author?.id || ''}`}>
                  <span className="text-sm font-semibold hover:underline" style={{ color: '#5A5A5A' }}>
                    {selectedComment.author?.name || selectedComment.author?.userID || 'Unknown User'}
                  </span>
                </Link>
                <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
                <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(selectedComment.createdAt)}</span>
              </div>
              <p className="text-sm" style={{ color: '#5A5A5A', lineHeight: '1.75' }}>
                {selectedComment.content}
              </p>
              
              {/* Like and Reply buttons */}
              <div className="flex items-center gap-4 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentLike(selectedComment.id)}
                  className="flex items-center gap-1 hover:bg-transparent group"
                  style={{ color: '#5A5A5A' }}
                >
                  <Heart className={`h-4 w-4 ${commentLikes.get(selectedComment.id)?.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="text-xs">{commentLikes.get(selectedComment.id)?.count || 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 hover:bg-transparent"
                  style={{ color: '#5A5A5A' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{selectedComment.childCount || 0}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {session?.user && (
          <div className="mb-6">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="回覆這則評論..."
              className="mb-2 bg-white"
              style={{ color: '#5A5A5A', backgroundColor: 'white' }}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReplyContent('')}
                style={{
                  borderColor: '#5A5A5A',
                  color: '#5A5A5A',
                  backgroundColor: 'transparent',
                }}
              >
                取消
              </Button>
              <Button
                onClick={() => handleSubmitReply(selectedComment.id)}
                disabled={!replyContent.trim()}
                style={{
                  backgroundColor: '#BAC7E5',
                  color: 'white',
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                回覆
              </Button>
            </div>
          </div>
        )}

        {/* Child Comments */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#5A5A5A' }}>
            回覆 ({selectedComment.childCount || 0})
          </h3>
          {loadingChildren ? (
            <div className="text-gray-500 text-center py-4">載入中...</div>
          ) : childComments.length > 0 ? (
            <div className="space-y-4">
              {childComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                    {comment.author?.image && (
                      <img
                        src={comment.author.image}
                        alt={comment.author.name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/social/profile/${comment.author?.id || ''}`}>
                        <span className="text-sm font-semibold hover:underline" style={{ color: '#5A5A5A' }}>
                          {comment.author?.name || comment.author?.userID || 'Unknown User'}
                        </span>
                      </Link>
                      <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
                      <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm" style={{ color: '#5A5A5A', lineHeight: '1.75' }}>
                      {comment.content}
                    </p>
                    
                    {/* Like button for child comments in detail view - no reply button for nested comments */}
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCommentLike(comment.id)}
                        className="flex items-center gap-1 hover:bg-transparent group"
                        style={{ color: '#5A5A5A' }}
                      >
                        <Heart className={`h-4 w-4 ${commentLikes.get(comment.id)?.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        <span className="text-xs">{commentLikes.get(comment.id)?.count || 0}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">尚無回覆</div>
          )}
        </div>
      </Card>
    );
  }

  // 顯示頂層評論列表
  return (
    <Card className="p-6 bg-white border-0 shadow-none">
      {/* New Comment Form */}
      {session?.user && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          {!isCommentExpanded ? (
            <div
              onClick={() => setIsCommentExpanded(true)}
              className="cursor-text"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                  {currentUserImage && (
                    <img
                      src={currentUserImage}
                      alt={currentUserName || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  )}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#5A5A5A' }}>
                  {currentUserName || 'User'}
                </span>
              </div>
              <div>
                <Textarea
                  value=""
                  placeholder="寫下你的評論..."
                  className="bg-white resize-none"
                  style={{ color: '#5A5A5A', backgroundColor: 'white' }}
                  rows={1}
                  readOnly
                  onFocus={(e) => {
                    e.preventDefault();
                    setIsCommentExpanded(true);
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                  {currentUserImage && (
                    <img
                      src={currentUserImage}
                      alt={currentUserName || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  )}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#5A5A5A' }}>
                  {currentUserName || 'User'}
                </span>
              </div>
              <div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="寫下你的評論..."
                  className="mb-2 bg-white"
                  style={{ color: '#5A5A5A', backgroundColor: 'white' }}
                  rows={1}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsCommentExpanded(false);
                      setNewComment('');
                    }}
                    className="hover:bg-gray-100"
                    style={{
                      color: '#5A5A5A',
                      backgroundColor: 'transparent',
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    style={{
                      backgroundColor: '#BAC7E5',
                      color: 'white',
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    發布
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                  {comment.author?.image && (
                    <img
                      src={comment.author.image}
                      alt={comment.author.name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/social/profile/${comment.author?.id || ''}`}>
                      <span className="text-sm font-semibold hover:underline" style={{ color: '#5A5A5A' }}>
                        {comment.author?.name || comment.author?.userID || 'Unknown User'}
                      </span>
                    </Link>
                    <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
                    <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p 
                    className="text-sm mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors" 
                    style={{ color: '#5A5A5A', lineHeight: '1.75' }}
                    onClick={() => handleCommentClick(comment)}
                  >
                    {comment.content}
                  </p>
                  
                  {/* Like and Reply buttons */}
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCommentLike(comment.id)}
                      className="flex items-center gap-1 hover:bg-transparent group"
                      style={{ color: '#5A5A5A' }}
                    >
                      <Heart className={`h-4 w-4 ${commentLikes.get(comment.id)?.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span className="text-xs">{commentLikes.get(comment.id)?.count || 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent('');
                      }}
                      className="flex items-center gap-1 hover:bg-transparent"
                      style={{ color: '#5A5A5A' }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">{comment.childCount || 0}</span>
                    </Button>
                  </div>
                  
                  {/* View replies link - expand inline */}
                  {comment.childCount && comment.childCount > 0 && !expandedReplies.has(comment.id) && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReplies(comment.id)}
                        className="text-xs p-0 h-auto hover:bg-transparent"
                        style={{ color: '#5A5A5A' }}
                      >
                        <span className="border-b border-gray-300 pb-0.5">
                          查看 {comment.childCount} 則留言
                        </span>
                      </Button>
                    </div>
                  )}

                  {/* First-level replies (inline, left-aligned) */}
                  {expandedReplies.has(comment.id) && (
                    <div className="mt-3 space-y-3">
                      {expandedReplies.get(comment.id)?.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
                            {reply.author?.image && (
                              <img
                                src={reply.author.image}
                                alt={reply.author.name || 'User'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Link href={`/social/profile/${reply.author?.id || ''}`}>
                                <span className="text-sm font-semibold hover:underline" style={{ color: '#5A5A5A' }}>
                                  {reply.author?.name || reply.author?.userID || 'Unknown User'}
                                </span>
                              </Link>
                              <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
                              <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(reply.createdAt)}</span>
                            </div>
                            <p className="text-sm mb-2" style={{ color: '#5A5A5A', lineHeight: '1.75' }}>
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCommentLike(reply.id)}
                                className="flex items-center gap-1 hover:bg-transparent group"
                                style={{ color: '#5A5A5A' }}
                              >
                                <Heart className={`h-4 w-4 ${commentLikes.get(reply.id)?.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                                <span className="text-xs">{commentLikes.get(reply.id)?.count || 0}</span>
                              </Button>
                            </div>
                            
                            {/* Reply form for replies */}
                            {replyingTo === reply.id && session?.user && (
                              <div className="mt-3">
                                <Textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="回覆這則評論..."
                                  className="mb-2 bg-white"
                                  style={{ color: '#5A5A5A', backgroundColor: 'white' }}
                                  rows={2}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyContent('');
                                    }}
                                    className="hover:bg-gray-100"
                                    style={{
                                      color: '#5A5A5A',
                                      backgroundColor: 'transparent',
                                    }}
                                  >
                                    取消
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubmitReply(reply.id)}
                                    disabled={!replyContent.trim()}
                                    style={{
                                      backgroundColor: '#BAC7E5',
                                      color: 'white',
                                    }}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    回覆
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Collapse button - aligned with reply buttons */}
                      <div className="flex items-center gap-4 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs p-0 h-auto hover:bg-transparent"
                          style={{ color: '#5A5A5A' }}
                        >
                          <span className="border-b border-gray-300 pb-0.5">
                            收起留言
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reply form (inline) */}
                  {replyingTo === comment.id && session?.user && (
                    <div className="mt-3">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="回覆這則評論..."
                        className="mb-2 bg-white"
                        style={{ color: '#5A5A5A', backgroundColor: 'white' }}
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="hover:bg-gray-100"
                          style={{
                            color: '#5A5A5A',
                            backgroundColor: 'transparent',
                          }}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim()}
                          style={{
                            backgroundColor: '#BAC7E5',
                            color: 'white',
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          回覆
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">尚無評論</div>
      )}
    </Card>
  );
}

