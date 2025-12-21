#!/bin/bash
# Fix all implicit any types in posts/route.ts

sed -i.bak3 \
  -e 's/(userLikes\.data || \[\])\.map(l => l\.postId)/((userLikes.data || []) as { postId: string }[]).map((l) => l.postId)/g' \
  -e 's/(userReposts\.data || \[\])\.map(r => r\.postId)/((userReposts.data || []) as { postId: string }[]).map((r) => r.postId)/g' \
  -e 's/(likesData\.data || \[\])\.forEach(like =>/(((likesData.data || []) as { postId: string }[])).forEach((like) =>/g' \
  -e 's/(repostsData\.data || \[\])\.forEach(repost =>/(((repostsData.data || []) as { postId: string }[])).forEach((repost) =>/g' \
  -e 's/(commentsData\.data || \[\])\.forEach(comment =>/(((commentsData.data || []) as { postId: string }[])).forEach((comment) =>/g' \
  -e 's/(hashtagsData\.data || \[\])\.forEach(hashtag =>/(((hashtagsData.data || []) as { postId: string; content: string }[])).forEach((hashtag) =>/g' \
  -e 's/(photosData\.data || \[\])\.forEach(photo =>/(((photosData.data || []) as { postId: string; url: string }[])).forEach((photo) =>/g' \
  -e 's/(schoolsData\.data || \[\])\.forEach(ps =>/(((schoolsData.data || []) as { postId: string }[])).forEach((ps) =>/g' \
  -e 's/(ratingsData\.data || \[\])\.forEach(rating =>/(((ratingsData.data || []) as { postId: string }[])).forEach((rating) =>/g' \
  app/api/posts/route.ts

echo "Fixed types in posts/route.ts"
