import { fetchFacebookPost } from '../src/lib/facebook/parse-post'
import { estimateFacebookImagePixels } from '../src/lib/facebook/image-urls'

async function main() {
  const post = await fetchFacebookPost(
    'https://www.facebook.com/permalink.php?story_fbid=pfbid0fkLmBCLsoP1XQBCTqbnG2apaWv1YwC7XrmdPKtUa2PiXK7ZpP4Zsa2WUnMSJ2Ygel&id=61565503873297'
  )
  console.log('images', post.imageUrls.length)
  for (const u of post.imageUrls) {
    const cstp = u.match(/cstp=mx(\d+)x(\d+)/i)?.[0] ?? 'no cstp'
    const hasCtp = u.includes('ctp=')
    console.log(cstp, 'ctp?', hasCtp, 'pixels', estimateFacebookImagePixels(u), u.slice(0, 95))
  }
}

main().catch(console.error)
