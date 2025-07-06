import Image from "next/image";
import Link from "next/link";
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center w-full pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-3xl text-center mb-24">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">Trust your hiring process again.</h1>
        <p className="text-xl text-gray-700 mb-8">ShadowCheck helps you verify candidate skills with real-world coding tasks, so you can hire with confidence and speed.</p>
        <Link href="/app">
          <Button size="lg" className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold">Try ShadowCheck</Button>
        </Link>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-4xl mb-24">
        <h2 className="text-2xl font-semibold text-center mb-10 text-gray-900">How it works</h2>
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-8">
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M19 7v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1Zm-1 6a1 1 0 0 1 1 1v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3a1 1 0 0 1 1-1h12Z"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload a Task</h3>
            <p className="text-base text-gray-600">Choose a real coding challenge for your candidate to solve.</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-1-7V7h2v6h-2Zm0 4v-2h2v2h-2Z"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Candidate Submits</h3>
            <p className="text-base text-gray-600">They complete the task in a secure, monitored environment.</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M9 17l-5-5 1.41-1.41L9 14.17l9.59-9.59L20 6l-11 11Z"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Results</h3>
            <p className="text-base text-gray-600">Review detailed reports and make confident hiring decisions.</p>
          </div>
        </div>
      </section>

      {/* Live Demo/GIF Placeholder */}
      <section id="demo" className="w-full max-w-3xl mb-24 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900">Live Demo</h2>
        <div className="w-full h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl flex items-center justify-center text-gray-400 text-xl font-medium border border-dashed border-emerald-200">
          [Demo GIF or interactive preview coming soon]
        </div>
      </section>

      {/* Testimonial/Use Case */}
      <section id="testimonials" className="w-full max-w-2xl mb-24 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900">What our users say</h2>
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center">
          <div className="mb-4">
            <Image src="/avatar.png" alt="User avatar" width={56} height={56} className="rounded-full" />
          </div>
          <blockquote className="text-lg text-gray-700 italic mb-2">“ShadowCheck let us see real skills, not just resumes. We hired with confidence and saved hours on interviews.”</blockquote>
          <span className="text-base text-gray-500">— Alex P., Tech Lead</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto text-center text-sm text-gray-400 pt-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
          <span>Contact: <a href="mailto:hello@shadowcheck.com" className="underline hover:text-emerald-500">hello@shadowcheck.com</a></span>
          <span>
            <a href="https://github.com/le-commit" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-500">GitHub</a>
          </span>
          <span>Built at Hackathon 2025</span>
        </div>
      </footer>
    </main>
  );
}