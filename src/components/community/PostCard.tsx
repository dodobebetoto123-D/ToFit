import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { cn, fromNow } from '@/lib/utils'
import type { CommunityPost } from '@/types'
import { PostPhoto } from './PostPhoto'

interface PostCardProps {
  post: CommunityPost
  onToggleLike: (postId: string) => void
  onOpen?: (post: CommunityPost) => void
}

export function PostCard({ post, onToggleLike, onOpen }: PostCardProps) {
  return (
    <article className="tf-postcard">
      <button
        type="button"
        className="tf-postcard__media"
        onClick={() => onOpen?.(post)}
        aria-label={`${post.title} 게시글 열기`}
      >
        {post.photoUrl ? (
          <img src={post.photoUrl} alt={post.title} className="tf-postcard__photo" />
        ) : (
          <PostPhoto theme={post.outfitPhotoTheme} />
        )}
      </button>

      <div className="tf-postcard__body">
        <div className="tf-postcard__author">
          <Avatar nickname={post.authorNickname} color={post.authorAvatarColor} size={24} />
          <span className="tf-postcard__nickname tf-truncate">{post.authorNickname}</span>
          <span className="tf-micro">{fromNow(post.createdAt)}</span>
        </div>

        <button type="button" className="tf-postcard__titlebtn" onClick={() => onOpen?.(post)}>
          <p className="tf-postcard__title tf-truncate">{post.title}</p>
          <p className="tf-postcard__excerpt">{post.content}</p>
        </button>

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
          <button
            type="button"
            className="tf-stat"
            onClick={() => onOpen?.(post)}
            aria-label={`댓글 ${post.commentCount}개 보기`}
          >
            <Icon name="comment" size={15} />
            {post.commentCount}
          </button>
        </div>
      </div>
    </article>
  )
}
