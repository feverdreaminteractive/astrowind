#!/usr/bin/env node

// Script to fetch Figma design data
// Usage: FIGMA_TOKEN=your-token node fetch-figma.js

import https from 'https';
import fs from 'fs';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_ID = 'qyAOmi17rZVOZsZCxDFrtE';  // Positivus Landing Page

if (!FIGMA_TOKEN) {
  console.error('Please set FIGMA_TOKEN environment variable');
  console.error('Get your token from: https://www.figma.com/settings');
  process.exit(1);
}

const options = {
  hostname: 'api.figma.com',
  path: `/v1/files/${FILE_ID}`,
  method: 'GET',
  headers: {
    'X-Figma-Token': FIGMA_TOKEN
  }
};

console.log('Fetching Figma file...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);

      if (json.err) {
        console.error('Figma API Error:', json.err);
        return;
      }

      // Save full JSON
      fs.writeFileSync('figma-design.json', JSON.stringify(json, null, 2));
      console.log('✅ Saved full design to figma-design.json');

      // Extract and save simplified structure
      const simplified = extractSimplifiedData(json);
      fs.writeFileSync('figma-simplified.json', JSON.stringify(simplified, null, 2));
      console.log('✅ Saved simplified structure to figma-simplified.json');

      // Display summary
      console.log('\n📊 Design Summary:');
      console.log('Name:', json.name);
      console.log('Last Modified:', json.lastModified);
      console.log('Version:', json.version);
      console.log('Pages:', json.document?.children?.length || 0);

    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();

function extractSimplifiedData(figmaData) {
  const layouts = [];
  const colors = new Set();
  const typography = [];

  function extractNode(node, parentX = 0, parentY = 0) {
    // Extract position and size
    if (node.absoluteBoundingBox) {
      const bounds = node.absoluteBoundingBox;
      layouts.push({
        id: node.id,
        name: node.name,
        type: node.type,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        visible: node.visible !== false
      });
    }

    // Extract colors
    if (node.fills) {
      node.fills.forEach(fill => {
        if (fill.color) {
          const { r, g, b, a } = fill.color;
          colors.add(`rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`);
        }
      });
    }

    // Extract typography
    if (node.type === 'TEXT' && node.style) {
      typography.push({
        name: node.name,
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        letterSpacing: node.style.letterSpacing,
        lineHeight: node.style.lineHeightPx,
        text: node.characters?.substring(0, 100)
      });
    }

    // Recurse through children
    if (node.children) {
      node.children.forEach(child => extractNode(child));
    }
  }

  // Process all pages
  figmaData.document?.children?.forEach(page => {
    extractNode(page);
  });

  return {
    name: figmaData.name,
    layouts: layouts.slice(0, 100), // Limit for readability
    colors: Array.from(colors),
    typography: typography.slice(0, 20),
    dimensions: {
      width: figmaData.document?.children?.[0]?.absoluteBoundingBox?.width,
      height: figmaData.document?.children?.[0]?.absoluteBoundingBox?.height
    }
  };
}