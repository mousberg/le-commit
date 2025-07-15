import Link from 'next/link';
import { getSortedPostsData, getAllTags } from '../../lib/blog';
import { Badge } from '../../components/ui/badge';

export default function BlogPage() {
  const allPostsData = getSortedPostsData();
  const allTags = getAllTags();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Insights, guides, and updates about AI-powered interview integrity
          </p>
        </div>

        {/* Tags */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Blog posts */}
        <div className="space-y-12">
          {allPostsData.map((post) => (
            <article key={post.slug} className="border-b border-gray-200 pb-12 last:border-b-0">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <span>•</span>
                  <span>{post.author}</span>
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="hover:text-pink-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="text-gray-600 mb-4">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-500 transition-colors"
                  >
                    Read more
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty state */}
        {allPostsData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No blog posts available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}