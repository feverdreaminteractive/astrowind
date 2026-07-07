// Figma proxy endpoint - allows users to fetch Figma designs without authentication
export default async (req, context) => {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Get Figma URL or file ID from request
    const url = new URL(req.url);
    const figmaUrl = url.searchParams.get('url');
    const fileId = url.searchParams.get('fileId');

    let figmaFileId = fileId;

    // Extract file ID from URL if provided
    if (figmaUrl && !fileId) {
      const match = figmaUrl.match(/\/file\/([a-zA-Z0-9]+)\//) ||
                   figmaUrl.match(/\/design\/([a-zA-Z0-9]+)\//);
      if (match) {
        figmaFileId = match[1];
      }
    }

    if (!figmaFileId) {
      return new Response(JSON.stringify({
        error: 'Please provide a Figma file ID or URL'
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // Get Figma token from environment variable
    const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

    if (!FIGMA_TOKEN) {
      console.error('FIGMA_TOKEN not configured in environment variables');
      return new Response(JSON.stringify({
        error: 'Figma integration not configured. Please contact support.'
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching Figma file:', figmaFileId);

    // Fetch from Figma API
    const figmaResponse = await fetch(`https://api.figma.com/v1/files/${figmaFileId}`, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    });

    if (!figmaResponse.ok) {
      console.error('Figma API error:', figmaResponse.status);
      return new Response(JSON.stringify({
        error: `Figma API error: ${figmaResponse.status}`
      }), {
        status: figmaResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const figmaData = await figmaResponse.json();

    // Extract simplified data for the AI builder
    const simplified = extractSimplifiedData(figmaData);

    return new Response(JSON.stringify(simplified), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching Figma data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch Figma data',
      details: error.message
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
};

function extractSimplifiedData(figmaData) {
  const layouts = [];
  const colors = new Set();
  const typography = [];
  const components = [];
  const styles = {};

  function extractNode(node, parentX = 0, parentY = 0, depth = 0) {
    // Skip if too deep to avoid huge payloads
    if (depth > 10) return;

    // Extract position and size
    if (node.absoluteBoundingBox || node.absoluteBounds) {
      const bounds = node.absoluteBoundingBox || node.absoluteBounds;
      const layout = {
        id: node.id,
        name: node.name,
        type: node.type,
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        visible: node.visible !== false,
        opacity: node.opacity || 1,
        rotation: node.rotation || 0
      };

      // Add layout properties if present (Auto Layout)
      if (node.layoutMode) {
        layout.layoutMode = node.layoutMode;
        layout.primaryAxisSizingMode = node.primaryAxisSizingMode;
        layout.counterAxisSizingMode = node.counterAxisSizingMode;
        layout.primaryAxisAlignItems = node.primaryAxisAlignItems;
        layout.counterAxisAlignItems = node.counterAxisAlignItems;
        layout.paddingLeft = node.paddingLeft || 0;
        layout.paddingRight = node.paddingRight || 0;
        layout.paddingTop = node.paddingTop || 0;
        layout.paddingBottom = node.paddingBottom || 0;
        layout.itemSpacing = node.itemSpacing || 0;
        layout.layoutAlign = node.layoutAlign;
        layout.layoutGrow = node.layoutGrow;
      }

      // Extract fills with full detail
      if (node.fills && Array.isArray(node.fills)) {
        layout.fills = node.fills.map(fill => ({
          type: fill.type,
          visible: fill.visible !== false,
          opacity: fill.opacity || 1,
          color: fill.color ? {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b,
            a: fill.color.a || 1
          } : null,
          gradientStops: fill.gradientStops,
          gradientTransform: fill.gradientTransform,
          scaleMode: fill.scaleMode,
          imageRef: fill.imageRef
        }));
      }

      // Extract strokes with full detail
      if (node.strokes && Array.isArray(node.strokes)) {
        layout.strokes = node.strokes.map(stroke => ({
          type: stroke.type,
          visible: stroke.visible !== false,
          opacity: stroke.opacity || 1,
          color: stroke.color ? {
            r: stroke.color.r,
            g: stroke.color.g,
            b: stroke.color.b,
            a: stroke.color.a || 1
          } : null
        }));
        layout.strokeWeight = node.strokeWeight;
        layout.strokeAlign = node.strokeAlign;
        layout.strokeDashes = node.strokeDashes;
      }

      // Extract effects (shadows, blurs)
      if (node.effects && Array.isArray(node.effects)) {
        layout.effects = node.effects.map(effect => ({
          type: effect.type,
          visible: effect.visible !== false,
          radius: effect.radius,
          color: effect.color,
          offset: effect.offset,
          spread: effect.spread,
          blendMode: effect.blendMode
        }));
      }

      // Add corner radius if present
      if (node.cornerRadius) {
        layout.cornerRadius = node.cornerRadius;
      }
      if (node.rectangleCornerRadii) {
        layout.rectangleCornerRadii = node.rectangleCornerRadii;
      }

      // Extract constraints for responsive behavior
      if (node.constraints) {
        layout.constraints = node.constraints;
      }

      // Extract blend mode
      if (node.blendMode && node.blendMode !== 'PASS_THROUGH') {
        layout.blendMode = node.blendMode;
      }

      // Extract text-specific properties
      if (node.type === 'TEXT') {
        layout.characters = node.characters;
        layout.style = node.style;
        layout.textAutoResize = node.textAutoResize;
        layout.textAlignHorizontal = node.textAlignHorizontal;
        layout.textAlignVertical = node.textAlignVertical;
        layout.paragraphIndent = node.paragraphIndent;
        layout.paragraphSpacing = node.paragraphSpacing;
      }

      layouts.push(layout);
    }

    // Extract colors from fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b, a = 1 } = fill.color;
          colors.add(JSON.stringify({
            rgba: `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`,
            hex: rgbToHex(r, g, b)
          }));
        } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
          fill.gradientStops.forEach(stop => {
            if (stop.color) {
              const { r, g, b, a = 1 } = stop.color;
              colors.add(JSON.stringify({
                rgba: `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`,
                hex: rgbToHex(r, g, b)
              }));
            }
          });
        }
      });
    }

    // Extract colors from strokes
    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach(stroke => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const { r, g, b, a = 1 } = stroke.color;
          colors.add(JSON.stringify({
            rgba: `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`,
            hex: rgbToHex(r, g, b)
          }));
        }
      });
    }

    // Extract typography
    if (node.type === 'TEXT') {
      const typo = {
        name: node.name,
        text: node.characters?.substring(0, 200)
      };

      if (node.style) {
        typo.fontFamily = node.style.fontFamily;
        typo.fontSize = node.style.fontSize;
        typo.fontWeight = node.style.fontWeight;
        typo.letterSpacing = node.style.letterSpacing;
        typo.lineHeight = node.style.lineHeightPx || node.style.lineHeightPercentFontSize;
        typo.textAlign = node.style.textAlignHorizontal;
      }

      typography.push(typo);
    }

    // Extract components
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        componentId: node.componentId
      });
    }

    // Recurse through children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNode(child, 0, 0, depth + 1));
    }
  }

  // Process document
  if (figmaData.document) {
    extractNode(figmaData.document, 0, 0, 0);
  }

  // Parse color strings back to objects
  const colorArray = Array.from(colors).map(c => JSON.parse(c));

  // Extract styles from figmaData.styles if available
  if (figmaData.styles) {
    Object.entries(figmaData.styles).forEach(([id, style]) => {
      styles[id] = {
        name: style.name,
        type: style.type,
        description: style.description
      };
    });
  }

  return {
    name: figmaData.name,
    lastModified: figmaData.lastModified,
    version: figmaData.version,
    layouts: layouts.slice(0, 500), // Increased limit for more complete designs
    colors: colorArray.slice(0, 100),
    typography: typography.slice(0, 100),
    components: components.slice(0, 100),
    styles: styles,
    dimensions: {
      width: layouts[0]?.width || 1920,
      height: layouts[0]?.height || 1080
    },
    structure: generateStructurePreview(layouts),
    // Include raw document for complete access if needed
    document: figmaData.document
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateStructurePreview(layouts) {
  // Group layouts by vertical position to identify sections
  const sections = [];
  const threshold = 50; // Group elements within 50px vertically

  layouts.forEach(layout => {
    if (!layout.visible) return;

    let section = sections.find(s =>
      Math.abs(s.y - layout.y) < threshold
    );

    if (!section) {
      section = { y: layout.y, elements: [] };
      sections.push(section);
    }

    section.elements.push(layout);
  });

  // Sort sections by Y position
  sections.sort((a, b) => a.y - b.y);

  // Generate preview text
  return sections.slice(0, 10).map((section, idx) =>
    `Section ${idx + 1} (Y: ${section.y}): ${section.elements.slice(0, 5).map(e => e.name).join(', ')}`
  ).join('\n');
}