import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://docfind.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/doctor/dashboard/",
          "/doctor/appointments/",
          "/doctor/inbox/",
          "/doctor/availability/",
          "/doctor/settings/",
          "/doctor/patients/",
          "/doctor/analytics/",
          "/doctor/billing/",
          "/doctor/password/",
          "/patient/appointments/",
          "/patient/chats/",
          "/patient/favorites/",
          "/patient/notifications/",
          "/patient/reviews/",
          "/patient/support/",
          "/booking/new/",
          "/booking/pending/",
          "/booking/success/",
          "/api/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
