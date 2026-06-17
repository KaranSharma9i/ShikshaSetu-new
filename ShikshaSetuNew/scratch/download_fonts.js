const fs = require('fs');
const path = require('path');
const https = require('https');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Poppins:wght@400;500;700';
const OUTPUT_DIR = path.resolve(__dirname, '../server/assets/fonts');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
      }
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Fetching Google Fonts CSS...');
    const cssBuffer = await fetchUrl(CSS_URL, { 'User-Agent': USER_AGENT });
    const cssText = cssBuffer.toString('utf-8');
    fs.writeFileSync(path.join(__dirname, 'fonts.css'), cssText);

    const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
    let match;
    const fontsToDownload = [];

    while ((match = fontFaceRegex.exec(cssText)) !== null) {
      const block = match[1];
      const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      const srcMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
      
      const blockStartIndex = match.index;
      const precedingText = cssText.substring(Math.max(0, blockStartIndex - 100), blockStartIndex);
      const subsetMatch = precedingText.match(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*$/);
      const subset = subsetMatch ? subsetMatch[1] : 'unknown';

      if (familyMatch && weightMatch && srcMatch) {
        const family = familyMatch[1];
        const weight = weightMatch[1];
        const url = srcMatch[1];
        
        fontsToDownload.push({ family, weight, subset, url });
      }
    }

    const targets = [
      { family: 'Noto Sans Devanagari', weight: '400', subset: 'devanagari' },
      { family: 'Noto Sans Devanagari', weight: '700', subset: 'devanagari' },
      { family: 'Poppins', weight: '400', subset: 'latin' },
      { family: 'Poppins', weight: '400', subset: 'devanagari' },
      { family: 'Poppins', weight: '500', subset: 'latin' },
      { family: 'Poppins', weight: '500', subset: 'devanagari' },
      { family: 'Poppins', weight: '700', subset: 'latin' },
      { family: 'Poppins', weight: '700', subset: 'devanagari' },
    ];

    const selectedFonts = [];
    for (const target of targets) {
      const match = fontsToDownload.find(f => 
        f.family.toLowerCase() === target.family.toLowerCase() && 
        f.weight === target.weight && 
        f.subset === target.subset
      );
      if (match) {
        selectedFonts.push(match);
      }
    }

    console.log('Selected fonts to download:');
    console.log(selectedFonts);

    for (const font of selectedFonts) {
      const filename = `${font.family.replace(/\s+/g, '')}-${font.weight}-${font.subset}.woff2`;
      const destPath = path.join(OUTPUT_DIR, filename);
      console.log(`Downloading ${font.family} (${font.weight}, ${font.subset}) from ${font.url}...`);
      const data = await fetchUrl(font.url);
      fs.writeFileSync(destPath, data);
      const stats = fs.statSync(destPath);
      console.log(`Saved to ${destPath} (${(stats.size / 1024).toFixed(2)} KB)`);
    }

    console.log('All targeted fonts downloaded successfully!');
  } catch (err) {
    console.error('Error during font downloading:', err);
  }
}

run();
