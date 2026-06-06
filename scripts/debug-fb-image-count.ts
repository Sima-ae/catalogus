import { fetchFacebookHtml } from '../src/lib/facebook/client'
import { facebookPermalinkFetchUrls, parseFacebookUrlMeta } from '../src/lib/facebook/parse-url'
import { facebookImageAssetId, unescapeFacebookUrl } from '../src/lib/facebook/image-urls'
import { fetchFacebookPost } from '../src/lib/facebook/parse-post'

async function main() {
  const url =
    process.argv[2] ??
    'https://www.facebook.com/permalink.php?story_fbid=pfbid0fkLmBCLsoP1XQBCTqbnG2apaWv1YwC7XrmdPKtUa2PiXK7ZpP4Zsa2WUnMSJ2Ygel&id=61565503873297'

  const post = await fetchFacebookPost(url)
  console.log('fetchFacebookPost images:', post.imageUrls.length)
  if (post.carouselImageCount != null) {
    console.log('carouselImageCount (from HTML):', post.carouselImageCount)
  }

  const meta = parseFacebookUrlMeta(url)
  const html = await fetchFacebookHtml(facebookPermalinkFetchUrls(meta)[0]!)

  const assetIds = new Set<string>()
  const re = /(\d{9,}_\d{9,}_\d{9,})_n\.(?:jpg|jpeg|png|webp)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    assetIds.add(m[1]!)
  }
  console.log('unique asset ids in HTML regex:', assetIds.size)

  for (const pat of [
    'subattachments',
    'all_subattachments',
    'photo_attachments',
    'attachment_list',
    'mediaset',
    'pcb.',
  ]) {
    const count = (html.match(new RegExp(pat, 'gi')) ?? []).length
    if (count) console.log(pat, 'mentions', count)
  }

  // photo fbid patterns
  const fbids = new Set<string>()
  for (const match of Array.from(html.matchAll(/"photo_id":"(\d+)"/g))) fbids.add(match[1]!)
  for (const match of Array.from(html.matchAll(/fbid=(\d{10,})/g))) fbids.add(match[1]!)
  console.log('photo_id/fbid in HTML:', fbids.size)
}

main().catch(console.error)
