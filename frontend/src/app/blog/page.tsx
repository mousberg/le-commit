import Link from 'next/link'
import { getSortedPostsData, getAllTags } from '@/lib/blog'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export default function BlogPage() {
  const posts = getSortedPostsData()
  const tags = getAllTags()

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Blog
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Insights, updates, and thoughts on AI-powered hiring verification and the future of recruitment.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Browse by Topic
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          {posts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No blog posts found. Create some markdown files in the /blog directory to get started.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.slug}
                className="group relative flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{post.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    <Link href={`/blog/${post.slug}`} className="stretched-link">
                      {post.title}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>By {post.author}</span>
                    <time dateTime={post.date}>
                      {formatDistanceToNow(new Date(post.date), { addSuffix: true })}
                    </time>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* CTA Section */}
        {posts.length > 0 && (
          <div className="mt-16 text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Want to stay updated with our latest insights?
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 transition-colors"
            >
              Learn More About Unmask
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}