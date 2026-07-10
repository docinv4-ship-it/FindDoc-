"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, ChevronRight, Loader2, Stethoscope, ArrowLeft, Search } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  display_order: number;
}

export default function HelpCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [slug, setSlug] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      const { data: cat } = await supabase
        .from("help_categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cat) {
        setCategory(cat);
        const { data: arts } = await supabase
          .from("help_articles")
          .select("id, slug, title, summary, display_order")
          .eq("category_id", cat.id)
          .eq("is_published", true)
          .order("display_order", { ascending: true });
        setArticles(arts || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, slug]);

  const filtered = search.trim()
    ? articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || (a.summary || "").toLowerCase().includes(search.toLowerCase()))
    : articles;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
    </div>
  );

  if (!category) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg">Category not found</p>
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
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/help" className="text-gray-600 hover:text-gray-900 transition-colors">Help Center</Link>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{category.name}</span>
            </nav>
          </div>
        </div>
      </header>

      <section className="py-12" style={{ background: "linear-gradient(135deg, #f0fffe 0%, #ffffff 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
            <BookOpen className="w-4 h-4" /> {category.name}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
          {category.description && <p className="text-gray-600 mt-2">{category.description}</p>}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search in ${category.name}...`}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
            />
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No articles found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((article) => (
                <Link
                  key={article.id}
                  href={`/help/${article.slug}`}
                  className="flex items-center justify-between p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">{article.title}</h3>
                    {article.summary && <p className="text-sm text-gray-500 mt-1">{article.summary}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">© 2026 DocFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
