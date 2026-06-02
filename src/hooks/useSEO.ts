import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  noIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  jsonLdData?: any;
  canonicalUrl?: string;
}

export function useSEO({
  title,
  description,
  noIndex = false,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  jsonLdData,
  canonicalUrl
}: SEOProps) {
  useEffect(() => {
    // 1. Set Title
    document.title = title;

    // Helper to standard name/property meta tags
    const setMetaTag = (attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to get or create elements (like link canonical)
    const getOrCreateElement = (tag: string, attrName: string, attrVal: string) => {
      let el = document.querySelector(`${tag}[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement(tag);
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      return el;
    };

    // 2. Set Description
    setMetaTag('name', 'description', description);

    // 3. Set Robots
    if (noIndex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow');
    }

    // 4. Canonical URL (Canonical domain without www redirect issues)
    const canonicalLink = getOrCreateElement('link', 'rel', 'canonical');
    const currentPath = window.location.pathname;
    const finalCanonical = canonicalUrl || `https://mentaimoveis.com${currentPath}`;
    canonicalLink.setAttribute('href', finalCanonical);

    // 5. Open Graph Meta Tags
    setMetaTag('property', 'og:title', ogTitle || title);
    setMetaTag('property', 'og:description', ogDescription || description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', finalCanonical);

    if (ogImage) {
      setMetaTag('property', 'og:image', ogImage);
    }

    // 6. JSON-LD Schema Script Integration
    const scriptId = 'json-ld-seo-script';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement;
    if (scriptEl) {
      scriptEl.remove();
    }

    if (jsonLdData) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      scriptEl.text = JSON.stringify(jsonLdData);
      document.head.appendChild(scriptEl);
    }

    // Return Cleanup - removes dynamic JSON-LD injection for next page context
    return () => {
      if (scriptEl) {
        scriptEl.remove();
      }
    };
  }, [title, description, noIndex, ogTitle, ogDescription, ogImage, ogType, JSON.stringify(jsonLdData)]);
}
export default useSEO;
