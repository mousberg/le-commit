import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostData, getSortedPostsData } from '@/lib/blog'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowLeft, Clock, User } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = getSortedPostsData()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const post = await getPostData(slug)

  if (!post) {
    notFound()
  }

  const allPosts = getSortedPostsData()
  const currentIndex = allPosts.findIndex((p) => p.slug === slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        <div className="relative mx-auto max-w-4xl px-6 py-16 lg:px-8">
          {/* Back Link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>By {post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <time dateTime={post.date}>
                {format(new Date(post.date), 'MMMM d, yyyy')} 
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  ({formatDistanceToNow(new Date(post.date), { addSuffix: true })})
                </span>
              </time>
            </div>
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-6 text-xl leading-8 text-gray-600 dark:text-gray-300">
              {post.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <article className="prose prose-lg prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-pink-600 dark:prose-a:text-pink-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-pre:bg-gray-900 dark:prose-pre:bg-gray-800">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>

        {/* Navigation */}
        {(prevPost || nextPost) && (
          <div className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-16">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Previous Post */}
              <div className="flex flex-col">
                {prevPost ? (
                  <>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Previous Post
                    </span>
                    <Link
                      href={`/blog/${prevPost.slug}`}
                      className="group flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {prevPost.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {prevPost.excerpt}
                      </p>
                    </Link>
                  </>
                ) : (
                  <div />
                )}
              </div>

              {/* Next Post */}
              <div className="flex flex-col">
                {nextPost ? (
                  <>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Next Post
                    </span>
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className="group flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-pink-300 dark:hover:border-pink-700 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {nextPost.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {nextPost.excerpt}
                      </p>
                    </Link>
                  </>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center border-t border-gray-200 dark:border-gray-800 pt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Transform Your Hiring Process?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
            Discover how Unmask's AI-powered verification can help you make better hiring decisions with confidence.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 transition-colors"
          >
            Learn More About Unmask
          </Link>
        </div>
      </div>
    </div>
  )
}