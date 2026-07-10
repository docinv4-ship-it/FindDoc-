"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Star, BadgeCheck, Loader2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ALL_SPECIALIZATIONS } from "@/lib/data/specializations";

interface SearchResult {
  doctor_id: string;
  full_name: string;
  specialization: string;
  profile_image_url: string | null;
  is_verified: boolean;
  is_onboarded: boolean;
  clinic_id: string;
  clinic_name: string;
  city: string;
  consultation_fee: number;
  slug: string;
  is_featured: boolean;
  rating_avg: number;
  review_count: number;
  rank: number;
}

interface AutocompleteSuggestion {
  type: "doctor" | "clinic" | "specialization" | "city";
  name: string;
  specialization?: string;
  city?: string;
}

const RESULTS_PER_PAGE = 10;

function SearchContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [specialization, setSpecialization] = useState(searchParams.get("specialization") || "");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) && searchInputRef.current !== e.target) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    const timeout = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      const offset = (currentPage - 1) * RESULTS_PER_PAGE;
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city) params.set("city", city);
      if (specialization) params.set("specialization", specialization);
      params.set("limit", String(RESULTS_PER_PAGE));
      params.set("offset", String(offset));
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotalResults(data.total || 0);
      setLoading(false);
    };
    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [query, city, specialization, currentPage]);

  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    if (suggestion.type === "specialization") {
      setSpecialization(suggestion.name);
    } else if (suggestion.type === "city") {
      setCity(suggestion.name);
    } else {
      setQuery(suggestion.name);
    }
    setShowSuggestions(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pb-24 md:pb-8">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Doctors</h1>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search by doctor name or specialization..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {loadingSuggestions && (
                  <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${i}`}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.specialization && <span className="text-gray-500">- {s.specialization}</span>}
                    {s.city && <span className="text-gray-500">- {s.city}</span>}
                    <span className="ml-auto text-xs text-gray-400 capitalize">{s.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Any city"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All specializations</option>
                {ALL_SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No doctors found. Try adjusting your search.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {totalResults} doctor{totalResults !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-3">
              {results.map((doc) => (
                <Link
                  key={doc.doctor_id}
                  href={`/doctor/${doc.doctor_id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {doc.profile_image_url ? (
                        <img src={doc.profile_image_url} alt={doc.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-primary-600">
                          {doc.full_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{doc.full_name}</h3>
                        {doc.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-primary-500" />
                        )}
                        {doc.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{doc.specialization}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {doc.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {doc.city}
                          </span>
                        )}
                        {doc.review_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            {doc.rating_avg.toFixed(1)} ({doc.review_count})
                          </span>
                        )}
                        <span className="text-gray-700 font-medium">
                          ${doc.consultation_fee}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? "text-white"
                            : "border border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                        style={currentPage === page ? { backgroundColor: "#36d1cf" } : {}}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
