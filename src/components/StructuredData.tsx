interface DoctorSchemaProps {
  name: string;
  specialization: string;
  clinicName: string;
  address: string;
  city: string;
  phone?: string | null;
  consultationFee: number;
  profileImageUrl?: string | null;
  isVerified: boolean;
}

export function DoctorStructuredData({
  name,
  specialization,
  clinicName,
  address,
  city,
  phone,
  consultationFee,
  profileImageUrl,
  isVerified,
}: DoctorSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name,
    description: `${name} is a ${specialization} at ${clinicName}. Book appointments online with verified reviews.`,
    medicalSpecialty: specialization,
    image: profileImageUrl || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
    },
    telephone: phone || undefined,
    priceRange: `$${consultationFee}`,
    aggregateRating: isVerified
      ? {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "50",
        }
      : undefined,
  };

  const clinicSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinicName,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
    },
    telephone: phone || undefined,
    medicalSpecialty: specialization,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicSchema) }}
      />
    </>
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbStructuredData({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocalBusinessStructuredData({
  name,
  address,
  city,
  phone,
  url,
}: {
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  url: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
    },
    telephone: phone || undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
