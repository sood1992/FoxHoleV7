import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Play, Pause, MessageSquare, Check, X, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import * as reviewsApi from '../api/reviews'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Avatar from '../components/common/Avatar'
import { formatDate } from '../utils/formatters'

function CommentMarker({ comment, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 transition-all ${
        isActive
          ? 'bg-primary text-white scale-125 z-20'
          : comment.status === 'resolved'
          ? 'bg-success text-white'
          : 'bg-warning text-white hover:scale-110'
      }`}
      style={{ left: `${comment.x_position}%`, top: `${comment.y_position}%` }}
    >
      {comment.id}
    </button>
  )
}

function CommentThread({ comment, onReply, onResolve }) {
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText)
      setReplyText('')
      setShowReply(false)
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${comment.status === 'resolved' ? 'bg-success/5 border-success/20' : 'bg-surface-secondary border-border'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Avatar name={comment.author_name} size="sm" />
          <div>
            <p className="text-sm font-medium text-text-primary">{comment.author_name}</p>
            <p className="text-xs text-text-muted">{formatDate(comment.created_at, 'MMM d, h:mm a')}</p>
          </div>
        </div>
        {comment.status !== 'resolved' && (
          <Button size="sm" variant="ghost" onClick={() => onResolve(comment.id)}>
            <Check size={14} />
          </Button>
        )}
      </div>

      {comment.timecode && (
        <div className="flex items-center gap-1 text-xs text-primary mb-2">
          <Clock size={12} />
          <span>{comment.timecode}</span>
        </div>
      )}

      <p className="text-sm text-text-primary mb-3">{comment.content}</p>

      {comment.status === 'resolved' && (
        <Badge variant="success" size="sm">Resolved</Badge>
      )}

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <Avatar name={reply.author_name} size="xs" />
              <div>
                <p className="text-xs font-medium text-text-primary">{reply.author_name}</p>
                <p className="text-sm text-text-secondary">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {comment.status !== 'resolved' && (
        <div className="mt-3 pt-3 border-t border-border">
          {showReply ? (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full p-2 text-sm border border-border rounded-lg bg-surface resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Write a reply..."
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowReply(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReply}>
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReply(true)}
              className="text-sm text-primary hover:underline"
            >
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClientReview() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const [portal, setPortal] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeComment, setActiveComment] = useState(null)
  const [newComment, setNewComment] = useState({ show: false, x: 0, y: 0, text: '', name: '' })
  const [clientName, setClientName] = useState(searchParams.get('name') || '')

  useEffect(() => {
    fetchPortal()
  }, [token])

  const fetchPortal = async () => {
    try {
      const data = await reviewsApi.getPublicPortal(token)
      setPortal(data)
      if (data.versions?.length > 0) {
        const latest = data.versions[data.versions.length - 1]
        setCurrentVersion(latest)
        fetchComments(latest.id)
      }
    } catch (error) {
      console.error('Failed to fetch portal:', error)
      setError('This review link is invalid or has expired')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (versionId) => {
    try {
      const data = await reviewsApi.getVersionComments(token, versionId)
      setComments(data)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    }
  }

  const handleVideoClick = (e) => {
    if (!clientName) {
      alert('Please enter your name before commenting')
      return
    }

    const rect = e.target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setNewComment({ show: true, x, y, text: '', name: clientName })
  }

  const handleAddComment = async () => {
    if (!newComment.text.trim()) return

    try {
      await reviewsApi.addComment(token, currentVersion.id, {
        content: newComment.text,
        author_name: clientName,
        x_position: newComment.x,
        y_position: newComment.y,
        timecode: null, // Could add video timecode here
      })
      fetchComments(currentVersion.id)
      setNewComment({ show: false, x: 0, y: 0, text: '', name: clientName })
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleReply = async (commentId, content) => {
    try {
      await reviewsApi.addReply(token, commentId, {
        content,
        author_name: clientName,
      })
      fetchComments(currentVersion.id)
    } catch (error) {
      console.error('Failed to add reply:', error)
    }
  }

  const handleResolve = async (commentId) => {
    try {
      await reviewsApi.resolveComment(token, commentId)
      fetchComments(currentVersion.id)
    } catch (error) {
      console.error('Failed to resolve comment:', error)
    }
  }

  const handleApprove = async () => {
    if (!clientName) {
      alert('Please enter your name to approve')
      return
    }

    try {
      await reviewsApi.approveVersion(token, currentVersion.id, { approved_by: clientName })
      fetchPortal()
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading review...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="text-center">
          <X size={48} className="mx-auto mb-4 text-danger" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Review Not Found</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">{portal?.project_name}</h1>
              <p className="text-sm text-text-secondary">{portal?.task_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Your name"
                className="px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {currentVersion?.status === 'approved' ? (
                <Badge variant="success" size="lg">
                  <Check size={14} className="mr-1" />
                  Approved
                </Badge>
              ) : (
                <Button onClick={handleApprove} disabled={!clientName}>
                  <Check size={16} className="mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video/Image viewer */}
          <div className="lg:col-span-2">
            {/* Version selector */}
            {portal?.versions?.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={portal.versions.indexOf(currentVersion) === 0}
                    onClick={() => {
                      const idx = portal.versions.indexOf(currentVersion)
                      const prev = portal.versions[idx - 1]
                      setCurrentVersion(prev)
                      fetchComments(prev.id)
                    }}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm text-text-primary">
                    Version {currentVersion?.version_number} of {portal.versions.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={portal.versions.indexOf(currentVersion) === portal.versions.length - 1}
                    onClick={() => {
                      const idx = portal.versions.indexOf(currentVersion)
                      const next = portal.versions[idx + 1]
                      setCurrentVersion(next)
                      fetchComments(next.id)
                    }}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <Badge variant={currentVersion?.status === 'approved' ? 'success' : 'warning'}>
                  {currentVersion?.status}
                </Badge>
              </div>
            )}

            {/* Media viewer */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {currentVersion?.file_type === 'video' ? (
                <>
                  <video
                    src={currentVersion.file_url}
                    className="w-full h-full object-contain"
                    onClick={handleVideoClick}
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={currentVersion?.file_url || '/placeholder-review.jpg'}
                    alt="Review content"
                    className="w-full h-full object-contain cursor-crosshair"
                    onClick={handleVideoClick}
                  />
                  {/* Comment markers */}
                  {comments.map((comment) => (
                    <CommentMarker
                      key={comment.id}
                      comment={comment}
                      isActive={activeComment === comment.id}
                      onClick={() => setActiveComment(comment.id)}
                    />
                  ))}
                  {/* New comment marker */}
                  {newComment.show && (
                    <div
                      className="absolute w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                      style={{ left: `${newComment.x}%`, top: `${newComment.y}%` }}
                    >
                      +
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* New comment form */}
            {newComment.show && (
              <div className="mt-4 p-4 bg-surface rounded-lg border border-primary">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-primary" />
                  <span className="text-sm font-medium text-text-primary">Add Comment</span>
                </div>
                <textarea
                  value={newComment.text}
                  onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                  className="w-full p-3 text-sm border border-border rounded-lg bg-surface-secondary resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Describe the change you'd like to see..."
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="ghost" onClick={() => setNewComment({ show: false, x: 0, y: 0, text: '', name: clientName })}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddComment}>
                    Add Comment
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm text-text-muted mt-4 text-center">
              Click anywhere on the image/video to add a comment
            </p>
          </div>

          {/* Comments panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">
                Comments ({comments.length})
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1 text-success">
                  <Check size={14} />
                  {comments.filter(c => c.status === 'resolved').length} resolved
                </span>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Click on the preview to add feedback</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    onReply={handleReply}
                    onResolve={handleResolve}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
