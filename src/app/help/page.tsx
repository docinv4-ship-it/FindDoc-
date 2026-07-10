"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search, BookOpen, ChevronRight, Loader2, Stethoscope, ArrowLeft
} from "lucide-react";

interface HelpCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  display_order: number;
}

interface HelpArticleSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category_id: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket: BookOpen,
  LogIn: BookOpen,
  Stethoscope: Stethoscope,
  User: BookOpen,
  Calendar: BookOpen,
  MessageCircle: BookOpen,
  CreditCard: BookOpen,
  Star: BookOpen,
  FileCheck: BookOpen,
  Wrench: BookOpen,
  Bell: BookOpen,
  Shield: BookOpen,
  Headphones: BookOpen,
  BookOpen: BookOpen,
};

export default function HelpCenterPage() {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cats }, { data: arts }] = await Promise.all([
        supabase.from("help_categories").select("*").order("display_order", { ascending: true }),
        supabase.from("help_articles").select("id, slug, title, summary, category_id").eq("is_published", true).order("display_order", { ascending: true }),
      ]);
      setCategories(cats || []);
      setArticles(arts || []);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const searchResults = search.trim()
    ? articles.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.summary || "").toLowerCase().includes(search.toLowerCase()) ||
        a.slug.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
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
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16" style={{ background: "linear-gradient(135deg, #f0fffe 0%, #ffffff 100%)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
            <BookOpen className="w-4 h-4" /> Help Center
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">How can we help you?</h1>
          <p className="text-gray-600 mt-3">Browse our guides, tutorials, and troubleshooting articles</p>
          <div className="mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden text-left">
              {searchResults.map((r) => (
                <Link key={r.id} href={`/help/${r.slug}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{r.title}</p>
                    {r.summary && <p className="text-sm text-gray-500 mt-0.5">{r.summary}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No articles found for &ldquo;{search}&rdquo;</p>
              <Link href="/support" className="inline-flex items-center gap-2 mt-4 text-sm font-medium" style={{ color: "#36d1cf" }}>
                Contact Support <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || BookOpen;
              const catArticles = articles.filter(a => a.category_id === cat.id);
              return (
                <Link
                  key={cat.id}
                  href={`/help/category/${cat.slug}`}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                      <Icon className="w-6 h-6" style={{ color: "#36d1cf" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">{cat.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{catArticles.length} article{catArticles.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">Still need help?</h2>
          <p className="text-gray-600 mt-2">Our support team is here to assist you</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/support" className="px-6 py-3 rounded-lg text-white font-medium transition-all" style={{ backgroundColor: "#36d1cf" }}>Contact Support</Link>
            <Link href="/contact" className="px-6 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium transition-all hover:bg-gray-50">Send a Message</Link>
          </div>
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
