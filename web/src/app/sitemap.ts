import type { MetadataRoute } from "next";
import { cities } from "@/lib/cities";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://map2minecraft.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const cityPages = cities.map((city) => ({
    url: `${APP_URL}/cities/${city.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: APP_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/create`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/cities`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...cityPages,
  ];
}
