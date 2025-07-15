import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostData, getAllPostSlugs } from '../../../lib/blog';
import { Badge } from '../../../components/ui/badge';
import HeroBackground from '../../../components/HeroBackground';

export async function generateStaticParams() {
  const posts = getAllPostSlugs();
  return posts.map((post) => ({
    slug: post.params.slug,
  }));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const postData = await getPostData(slug);

    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        <HeroBackground className="pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-24" cropped>
          <div className="text-center mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Back link */}
            <div className="mb-8">
              <Link 
                href="/blog"
                className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-500 transition-colors"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Blog
              </Link>
            </div>

            {/* Article header */}
            <header className="mb-12">
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  {postData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <h1 className="text-4xl font-medium tracking-tight text-balance text-zinc-900 sm:text-5xl lg:text-6xl mb-6">
                {postData.title}
              </h1>
              
              <div className="flex items-center justify-center space-x-4 text-zinc-500">
                <time dateTime={postData.date}>
                  {new Date(postData.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span>•</span>
                <span>{postData.author}</span>
              </div>
            </header>
          </div>
        </HeroBackground>

        {/* Content Section */}
        <div className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

          {/* Article content */}
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-pink-600 prose-a:no-underline hover:prose-a:text-pink-500 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded"
            dangerouslySetInnerHTML={{ __html: postData.content }}
          />

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {postData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <Link 
                href="/blog"
                className="text-sm font-medium text-pink-600 hover:text-pink-500 transition-colors"
              >
                View all posts
              </Link>
            </div>
          </footer>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}