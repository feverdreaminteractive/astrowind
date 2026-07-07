export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { fileKey, accessToken } = await req.json();

    // Figma API requires an access token
    // Users would need to provide their own token or we'd need to use OAuth
    const figmaToken = accessToken || process.env.FIGMA_ACCESS_TOKEN;

    if (!figmaToken) {
      return new Response(JSON.stringify({
        error: 'Figma access token required. Please provide an access token or set up OAuth.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch Figma file data
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': figmaToken
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    const figmaData = await response.json();

    // Extract design tokens from Figma data
    const designTokens = extractDesignTokens(figmaData);

    return new Response(JSON.stringify(designTokens), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Figma function error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch Figma design',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function extractDesignTokens(figmaData) {
  const tokens = {
    colors: {},
    typography: {},
    spacing: [],
    components: [],
    layout: {}
  };

  // Extract colors from styles
  if (figmaData.styles) {
    Object.entries(figmaData.styles).forEach(([key, style]) => {
      if (style.styleType === 'FILL') {
        tokens.colors[style.name] = style.description || '';
      } else if (style.styleType === 'TEXT') {
        tokens.typography[style.name] = style.description || '';
      }
    });
  }

  // Extract components and frames
  const extractNodes = (node, depth = 0) => {
    if (!node) return;

    // Extract component information
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      tokens.components.push({
        name: node.name,
        type: node.type,
        width: node.absoluteBoundingBox?.width,
        height: node.absoluteBoundingBox?.height
      });
    }

    // Extract text styles
    if (node.type === 'TEXT' && node.style) {
      const textStyle = {
        fontFamily: node.style.fontFamily,
        fontSize: node.style.fontSize,
        fontWeight: node.style.fontWeight,
        lineHeight: node.style.lineHeightPx,
        letterSpacing: node.style.letterSpacing,
        textAlign: node.style.textAlignHorizontal
      };

      const styleName = `${node.style.fontFamily}-${node.style.fontSize}`;
      tokens.typography[styleName] = textStyle;
    }

    // Extract colors from fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b, a = 1 } = fill.color;
          const rgb = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
          const colorName = `color-${Object.keys(tokens.colors).length + 1}`;
          tokens.colors[colorName] = rgb;
        }
      });
    }

    // Extract spacing from auto-layout
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      tokens.layout = {
        ...tokens.layout,
        [node.name]: {
          mode: node.layoutMode,
          padding: node.paddingLeft || 0,
          spacing: node.itemSpacing || 0,
          alignment: node.primaryAxisAlignItems,
          justify: node.counterAxisAlignItems
        }
      };

      if (node.paddingLeft && !tokens.spacing.includes(node.paddingLeft)) {
        tokens.spacing.push(node.paddingLeft);
      }
      if (node.itemSpacing && !tokens.spacing.includes(node.itemSpacing)) {
        tokens.spacing.push(node.itemSpacing);
      }
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNodes(child, depth + 1));
    }
  };

  // Start extraction from document
  if (figmaData.document) {
    extractNodes(figmaData.document);
  }

  // Sort and deduplicate spacing values
  tokens.spacing = [...new Set(tokens.spacing)].sort((a, b) => a - b);

  return tokens;
}

export const config = {
  path: '/.netlify/functions/figma'
};