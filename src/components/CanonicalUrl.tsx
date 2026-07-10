export function CanonicalUrl({ path }: { path: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docfind.com";
  const canonicalUrl = `${baseUrl}${path}`;

  return (
    <link rel="canonical" href={canonicalUrl} />
  );
}

export function generateCanonicalMetadata(path: string, title: string, description: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://docfind.com";
  const canonicalUrl = `${baseUrl}${path}`;

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      title,
      description,
      type: "website",
      siteName: "DocFind",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
