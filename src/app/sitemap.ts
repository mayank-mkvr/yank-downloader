import { MetadataRoute } from 'next';

const siteUrl = 'https://savex.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date()
    },
    {
      url: `${siteUrl}/app`,
      lastModified: new Date()
    },
    {
      url: `${siteUrl}/audio`,
      lastModified: new Date()
    }
  ];
}
