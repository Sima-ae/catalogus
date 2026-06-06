import { fetchFacebookGraphForUrl } from '../src/lib/facebook/client'
import { fetchFacebookPost } from '../src/lib/facebook/parse-post'
import { parseFacebookUrlMeta } from '../src/lib/facebook/parse-url'

const url =
  process.argv[2] ??
  'https://www.facebook.com/photo?fbid=122208937622516795&set=pcb.122208938522516795'

async function main() {
  const meta = parseFacebookUrlMeta(url)
  console.log('meta', meta)

  const graph = await fetchFacebookGraphForUrl(meta)
  console.log('graph', {
    title: graph.title,
    description: graph.description?.slice(0, 120),
    imageCount: graph.imageUrls.length,
    errors: graph.errors,
    firstImage: graph.imageUrls[0]?.slice(0, 100),
  })

  try {
    const post = await fetchFacebookPost(url)
    console.log('fetchFacebookPost ok', {
      externalId: post.externalId,
      title: post.title,
      descriptionPreview: post.description.slice(0, 200),
      imageCount: post.imageUrls.length,
    })
    for (const img of post.imageUrls) console.log(' image', img.slice(0, 140))
  } catch (error) {
    console.error('fetchFacebookPost failed:', error instanceof Error ? error.message : error)
  }
}

main().catch(console.error)
