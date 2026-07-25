import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { cn, fromNow } from '@/lib/utils'
import type { CommunityPost } from '@/types'
import { PostPhoto } from './PostPhoto'

interface PostCardProps {
  post: CommunityPost
  onToggleLike: (postId: string) => void
}

export function PostCard({ post, onToggleLike }: PostCardProps) {
  return (
    <article className="tf-postcard">
      <div className="tf-postcard__media">
        <PostPhoto theme={post.outfitPhotoTheme} />
      </div>

      <div className="tf-postcard__body">
        <div className="tf-postcard__author">
          <Avatar nickname={post.authorNickname} color={post.authorAvatarColor} size={24} />
          <span className="tf-postcard__nickname tf-truncate">{post.authorNickname}</span>
          <span className="tf-micro">{fromNow(post.createdAt)}</span>
        </div>

        <p className="tf-postcard__tags tf-truncate">
          {post.hashtags.map((tag) => `#${tag}`).join(' ')}
        </p>

        <div className="tf-postcard__stats">
          <button
            type="button"
            className={cn('tf-stat', post.liked && 'is-liked')}
            onClick={() => onToggleLike(post.id)}
            aria-pressed={post.liked}
            aria-label={`좋아요 ${post.likeCount}개`}
          >
            <Icon name={post.liked ? 'heart-filled' : 'heart'} size={15} />
            {post.likeCount}
          </button>
          <span className="tf-stat" aria-label={`댓글 ${post.commentCount}개`}>
            <Icon name="comment" size={15} />
            {post.commentCount}
          </span>
        </div>
      </div>
    </article>
  )
}
