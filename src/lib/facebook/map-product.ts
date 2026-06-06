import type { FacebookPostData } from '@/lib/facebook/types'

export function mapFacebookPost(post: FacebookPostData): FacebookPostData {
  return {
    postUrl: post.postUrl.trim(),
    externalId: post.externalId.trim(),
    title: post.title.trim(),
    description: post.description.trim(),
    imageUrls: post.imageUrls.map((u) => u.trim()).filter(Boolean),
    detectedPriceHint: post.detectedPriceHint,
  }
}
