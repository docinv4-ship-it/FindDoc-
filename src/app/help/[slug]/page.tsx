"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronRight, Loader2, Stethoscope, ArrowLeft, ThumbsUp, ThumbsDown,
  Check, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
  category_id: string;
  view_count: number;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
}

function renderMarkdown(md: string): string {
  let html = md;
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-teal-600 hover:underline">$1</a>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
  html = html.replace(/^> (.*$)/gm, '<blockquote class="border-l-4 pl-4 py-2 my-4 bg-gray-50 rounded-r-lg" style="border-color: #36d1cf">$1</blockquote>');
  html = html.replace(/^\| (.*)\|$/gm, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    if (cells[0]?.includes('---')) return '';
    return `<tr>${cells.map(c => `<td class="border border-gray-200 px-4 py-2">${c.trim()}</td>`).join('')}</tr>`;
  });
  html = html.replace(/^(\d+)\. (.*$)/gm, '<li class="ml-6 list-decimal">$2</li>');
  html = html.replace(/^- (.*$)/gm, '<li class="ml-6 list-disc">$1</li>');
  html = html.replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed">');
  html = '<p class="text-gray-700 leading-relaxed">' + html + '<\/p>';
  html = html.replace(/<li/g, '<ul class="space-y-1 my-3"><li').replace(/<\/li>(?!\s*<li)/g, '</li></ul>');
  html = html.replace(/<\/h[123]><\/p>/g, '</h$1>');
  html = html.replace(/<p class="text-gray-700 leading-relaxed"><h/g, '<h');
  html = html.replace(/<\/p><h/g, '</h');
  return html;
}

export default function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [slug, setSlug] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => { params.then(p => setSlug(p.slug)); }, [params]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const { data: art } = await supabase
        .from("help_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (art) {
        setArticle(art);
        // Increment view count
        await supabase.from("help_articles").update({ view_count: (art.view_count || 0) + 1 }).eq("id", art.id);

        if (art.category_id) {
          const { data: cat } = await supabase
            .from("help_categories")
            .select("id, slug, name")
            .eq("id", art.category_id)
            .maybeSingle();
          setCategory(cat);

          const { data: rel } = await supabase
            .from("help_articles")
            .select("id, slug, title")
            .eq("category_id", art.category_id)
            .eq("is_published", true)
            .neq("id", art.id)
            .order("display_order", { ascending: true })
            .limit(5);
          setRelated(rel || []);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, slug]);

  const submitFeedback = async (isHelpful: boolean) => {
    if (!article) return;
    setFeedbackSubmitted(true);
    setFeedbackExpanded(false);
    try {
      await fetch("/api/help/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: article.id, is_helpful: isHelpful }),
      });
    } catch { /* non-critical */ }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="w-12 h-12 mx-auto text-gray-300" />
        <p className="text-gray-500 text-lg mt-4">Article not found</p>
        <Link href="/help" className="inline-flex items-center gap-2 mt-4 text-sm font-medium" style={{ color: "#36d1cf" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Help Center
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">DocFind</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm overflow-hidden">
              <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">Help</Link>
              {category && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <Link href={`/help/category/${category.slug}`} className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">{category.name}</Link>
                </>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-900 font-medium truncate">{article.title}</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">
          <article>
            <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>
            {article.summary && <p className="text-lg text-gray-600 mt-3">{article.summary}</p>}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>{tag}</span>
                ))}
              </div>
            )}
            <div className="prose prose-lg max-w-none mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />

            {/* Feedback section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              {feedbackSubmitted ? (
                <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: "#e6faf9" }}>
                  <Check className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  <p className="text-gray-900 font-medium">Thank you for your feedback!</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Was this article helpful?</h3>
                    {feedbackExpanded ? (
                      <button onClick={() => setFeedbackExpanded(false)} className="text-gray-400 hover:text-gray-600">
                        <ChevronUp className="w-5 h-5" />
                      </button>
                    ) : (
                      <button onClick={() => setFeedbackExpanded(true)} className="text-gray-400 hover:text-gray-600">
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {feedbackExpanded && (
                    <div className="mt-4 flex items-center gap-4">
                      <button onClick={() => submitFeedback(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 font-medium">
                        <ThumbsUp className="w-5 h-5" /> Yes, it helped
                      </button>
                      <button onClick={() => submitFeedback(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700 font-medium">
                        <ThumbsDown className="w-5 h-5" /> No, it didn&apos;t
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </article>

          {/* Sidebar: Related articles */}
          <aside className="lg:sticky lg:top-20 self-start">
            {related.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Related Articles</h3>
                <div className="space-y-2">
                  {related.map((r) => (
                    <Link key={r.id} href={`/help/${r.slug}`} className="block p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                      <p className="text-sm font-medium text-gray-900 hover:text-teal-600 transition-colors">{r.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 p-5 rounded-xl" style={{ backgroundColor: "#e6faf9" }}>
              <h3 className="font-semibold text-gray-900 mb-2">Need more help?</h3>
              <p className="text-sm text-gray-600 mb-3">Can&apos;t find what you&apos;re looking for?</p>
              <Link href="/support" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#239999" }}>
                Contact Support <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">© 2026 DocFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
