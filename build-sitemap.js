import fs from 'fs';
import path from 'path';

async function generateSitemap() {
  console.log('[Sitemap] Starting sitemap generation...');

  try {
    // 1. Load Firebase configuration
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at ${configPath}`);
    }

    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

    console.log(`[Sitemap] Using Project ID: ${projectId}, Database ID: ${databaseId}`);

    // 2. Fetch properties from Firestore securely and rules-compliantly
    let documents = [];
    const fetchQuery = async (fieldName) => {
      const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;
      const body = {
        structuredQuery: {
          from: [{ collectionId: 'imoveis' }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          }
        }
      };
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error(`runQuery for ${fieldName} returned status ${response.status}`);
      }
      const results = await response.json();
      return results
        .filter(r => r && r.document)
        .map(r => r.document);
    };

    console.log('[Sitemap] Fetching published properties via Firestore structured query...');
    try {
      const [docs1, docs2] = await Promise.all([
        fetchQuery('publicado').catch(e => { console.log('[Sitemap] Query "publicado" info:', e.message); return []; }),
        fetchQuery('publicadoNoSite').catch(e => { console.log('[Sitemap] Query "publicadoNoSite" info:', e.message); return []; })
      ]);

      const map = new Map();
      [...docs1, ...docs2].forEach(doc => {
        if (doc && doc.name) {
          const id = doc.name.split('/').pop();
          map.set(id, doc);
        }
      });
      documents = Array.from(map.values());
      console.log(`[Sitemap] Successfully retrieved ${documents.length} public properties`);
    } catch (queryErr) {
      console.log(`[Sitemap] Structured query search yielded: ${queryErr.message}`);
    }

    // 3. Helper to parse Firestore REST format dynamically
    const parseValue = (valueObj) => {
      if (!valueObj) return undefined;
      if ('stringValue' in valueObj) return valueObj.stringValue;
      if ('booleanValue' in valueObj) return valueObj.booleanValue;
      if ('integerValue' in valueObj) return parseInt(valueObj.integerValue, 10);
      if ('doubleValue' in valueObj) return parseFloat(valueObj.doubleValue);
      if ('mapValue' in valueObj) {
        const map = {};
        const fields = valueObj.mapValue.fields || {};
        for (const [k, v] of Object.entries(fields)) {
          map[k] = parseValue(v);
        }
        return map;
      }
      if ('arrayValue' in valueObj) {
        const arr = valueObj.arrayValue.values || [];
        return arr.map(v => parseValue(v));
      }
      return undefined;
    };

    // 4. Decode all documents to friendly JS objects
    const list = documents.map(doc => {
      const id = doc.name.split('/').pop();
      const fields = {};
      if (doc.fields) {
        for (const [key, valueObj] of Object.entries(doc.fields)) {
          fields[key] = parseValue(valueObj);
        }
      }
      return { id, ...fields };
    });

    // 5. Filter only public/active properties (as requested)
    const isImovelPublico = (p) => {
      return (
        p &&
        (
          p.publicadoNoSite === true ||
          p.publicado === true
        )
      );
    };

    const publicProperties = list.filter(isImovelPublico);
    console.log(`[Sitemap] Found ${publicProperties.length} public properties out of ${list.length}`);

    // 6. Assemble the sitemap xml
    const baseUrl = 'https://mentaimoveis.com';
    const staticPages = [
      { loc: '', changefreq: 'daily', priority: '1.0' },
      { loc: '/imoveis', changefreq: 'daily', priority: '0.9' },
      { loc: '/sobre', changefreq: 'weekly', priority: '0.7' },
      { loc: '/corretores', changefreq: 'weekly', priority: '0.7' },
      { loc: '/contato', changefreq: 'monthly', priority: '0.6' }
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static URLs
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Dynamic Property URLs
    publicProperties.forEach(p => {
      const codigoPublico = p.codigoImovel || p.codigo || p.codImovel || p.referencia || p.id;
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/imovel/${codigoPublico}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    // 7. Write to public/sitemap.xml
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`[Sitemap] Successfully wrote ${publicProperties.length + staticPages.length} urls to ${sitemapPath}`);

  } catch (error) {
    console.error('[Sitemap] Failed to generate sitemap:', error);
    // Write an empty/basic sitemap with only static pages as a safe fallback
    try {
      const basicXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mentaimoveis.com</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mentaimoveis.com/imoveis</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mentaimoveis.com/sobre</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mentaimoveis.com/corretores</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://mentaimoveis.com/contato</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;
      fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), basicXml, 'utf8');
      console.log('[Sitemap] Fallback basic sitemap generated instead.');
    } catch (fallbackError) {
      console.error('[Sitemap] Even fallback sitemap failed:', fallbackError);
    }
  }
}

generateSitemap();
