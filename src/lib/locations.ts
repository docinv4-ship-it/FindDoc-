// lib/locations.ts

export interface Zone {
  name: string;
}

export interface Province {
  name: string;
  zones: string[];
}

export interface CountryConfig {
  name: string;
  currency: string;
  currencySymbol: string;
  defaultLat: number;
  defaultLng: number;
  provinces: Province[];
}

export const LOCATION_DATA: Record<string, CountryConfig> = {
  Pakistan: {
    name: "Pakistan",
    currency: "PKR",
    currencySymbol: "Rs.",
    defaultLat: 33.6844,
    defaultLng: 73.0479,
    provinces: [
      {
        name: "Khyber Pakhtunkhwa (KPK)",
        zones: ["Kohat", "Peshawar", "Mardan", "Abbottabad", "Bannu", "Swat", "Nowshera"],
      },
      {
        name: "Punjab",
        zones: ["Lahore", "Rawalpindi", "Faisalabad", "Multan", "Gujranwala", "Sargodha", "Sialkot"],
      },
      {
        name: "Sindh",
        zones: ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Mirpur Khas", "Nawabshah"],
      },
      {
        name: "Balochistan",
        zones: ["Quetta", "Gwadar", "Khuzdar", "Sibi", "Turbat", "Chaman"],
      },
      {
        name: "Islamabad Capital",
        zones: ["Islamabad Sector Area", "Rawal Town", "Tarlai", "Sohan"],
      }
    ]
  },
  "United States": {
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    defaultLat: 37.0902,
    defaultLng: -95.7129,
    provinces: [
      {
        name: "California",
        zones: ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"],
      },
      {
        name: "New York",
        zones: ["New York City", "Buffalo", "Rochester", "Syracuse", "Albany"],
      },
      {
        name: "Texas",
        zones: ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth"],
      }
    ]
  },
  "Saudi Arabia": {
    name: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "SR",
    defaultLat: 23.8859,
    defaultLng: 45.0792,
    provinces: [
      {
        name: "Riyadh Region",
        zones: ["Riyadh", "Al-Kharj", "Al Majma'ah", "Wadi ad-Dawasir"],
      },
      {
        name: "Makkah Region",
        zones: ["Jeddah", "Makkah", "Ta'if", "Rabigh"],
      },
      {
        name: "Eastern Province",
        zones: ["Dammam", "Khobar", "Jubail", "Al-Ahsa"],
      }
    ]
  },
  "United Arab Emirates": {
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "AED",
    defaultLat: 23.4241,
    defaultLng: 53.8478,
    provinces: [
      {
        name: "Abu Dhabi",
        zones: ["Abu Dhabi City", "Al Ain", "Al Dhafra"],
      },
      {
        name: "Dubai",
        zones: ["Dubai Marina", "Deira", "Downtown Dubai", "Jumeirah"],
      },
      {
        name: "Sharjah",
        zones: ["Sharjah City", "Khor Fakkan", "Kalba"],
      }
    ]
  }
};

export const CURRENCIES = [
  { code: "PKR", symbol: "Rs.", label: "Pakistani Rupee (PKR)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "SAR", symbol: "SR", label: "Saudi Riyal (SAR)" },
  { code: "AED", symbol: "AED", label: "UAE Dirham (AED)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" }
];
