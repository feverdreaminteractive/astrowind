// Figma Design Processor Web Worker
// Processes Figma JSON data to generate accurate HTML/CSS

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'PROCESS_FIGMA') {
    try {
      const result = processFigmaDesign(data);
      self.postMessage({ type: 'SUCCESS', result });
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: error.message });
    }
  }
});

function processFigmaDesign(figmaData) {
  const layouts = [];
  const cssVariables = new Map();
  const cssClasses = new Map();
  const componentStyles = new Map();

  // Extract all nodes recursively
  function extractNode(node, parentContext = {}) {
    if (!node) return;

    const context = {
      ...parentContext,
      parentId: node.id,
      depth: (parentContext.depth || 0) + 1
    };

    // Skip deep nesting to avoid performance issues
    if (context.depth > 15) return;

    // Process node based on type
    const processedNode = processNode(node, context);
    if (processedNode) {
      layouts.push(processedNode);
    }

    // Process children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => extractNode(child, context));
    }
  }

  function processNode(node, context) {
    if (!node.absoluteBoundingBox && !node.absoluteBounds) return null;

    const bounds = node.absoluteBoundingBox || node.absoluteBounds;
    const styles = new Map();

    // Position and dimensions
    styles.set('position', 'absolute');
    styles.set('left', `${Math.round(bounds.x)}px`);
    styles.set('top', `${Math.round(bounds.y)}px`);
    styles.set('width', `${Math.round(bounds.width)}px`);
    styles.set('height', `${Math.round(bounds.height)}px`);

    // Visibility and opacity
    if (node.visible === false) {
      styles.set('display', 'none');
    }
    if (node.opacity !== undefined && node.opacity !== 1) {
      styles.set('opacity', node.opacity.toString());
    }

    // Rotation
    if (node.rotation && node.rotation !== 0) {
      const transform = `rotate(${node.rotation}deg)`;
      styles.set('transform', transform);
      styles.set('transform-origin', 'center');
    }

    // Process fills (backgrounds)
    if (node.fills && Array.isArray(node.fills)) {
      const background = processFills(node.fills);
      if (background) {
        styles.set('background', background);
      }
    }

    // Process strokes (borders)
    if (node.strokes && Array.isArray(node.strokes)) {
      const border = processStrokes(node.strokes, node.strokeWeight, node.strokeAlign);
      if (border) {
        Object.entries(border).forEach(([key, value]) => {
          styles.set(key, value);
        });
      }
    }

    // Process effects (shadows, blurs)
    if (node.effects && Array.isArray(node.effects)) {
      const effects = processEffects(node.effects);
      if (effects.boxShadow) {
        styles.set('box-shadow', effects.boxShadow);
      }
      if (effects.filter) {
        styles.set('filter', effects.filter);
      }
    }

    // Corner radius
    if (node.cornerRadius) {
      styles.set('border-radius', `${node.cornerRadius}px`);
    } else if (node.rectangleCornerRadii) {
      const [tl, tr, br, bl] = node.rectangleCornerRadii;
      styles.set('border-radius', `${tl}px ${tr}px ${br}px ${bl}px`);
    }

    // Auto Layout (Flexbox)
    if (node.layoutMode) {
      processAutoLayout(node, styles);
    }

    // Text-specific properties
    if (node.type === 'TEXT') {
      processTextNode(node, styles);
    }

    // Blend mode
    if (node.blendMode && node.blendMode !== 'PASS_THROUGH' && node.blendMode !== 'NORMAL') {
      styles.set('mix-blend-mode', node.blendMode.toLowerCase().replace('_', '-'));
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      styles: Array.from(styles.entries()),
      content: node.type === 'TEXT' ? node.characters : null,
      componentId: node.componentId,
      parentId: context.parentId
    };
  }

  function processFills(fills) {
    const visibleFills = fills.filter(f => f.visible !== false);
    if (visibleFills.length === 0) return null;

    const backgrounds = visibleFills.map(fill => {
      if (fill.type === 'SOLID' && fill.color) {
        const c = fill.color;
        const opacity = (fill.opacity || 1) * (c.a || 1);
        return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${opacity})`;
      }

      if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
        // Calculate gradient angle from transform
        let angle = 90; // Default to top-bottom
        if (fill.gradientTransform) {
          // Simplified angle calculation from transform matrix
          const [[a, b], [c, d]] = fill.gradientTransform;
          angle = Math.atan2(b, a) * (180 / Math.PI);
        }

        const stops = fill.gradientStops.map(stop => {
          const c = stop.color;
          return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1}) ${(stop.position * 100).toFixed(1)}%`;
        }).join(', ');

        return `linear-gradient(${angle}deg, ${stops})`;
      }

      if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops) {
        const stops = fill.gradientStops.map(stop => {
          const c = stop.color;
          return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1}) ${(stop.position * 100).toFixed(1)}%`;
        }).join(', ');

        return `radial-gradient(circle, ${stops})`;
      }

      if (fill.type === 'IMAGE') {
        // For images, we'll need to handle this separately
        return '#f0f0f0'; // Placeholder
      }

      return null;
    }).filter(Boolean);

    return backgrounds.length > 0 ? backgrounds.join(', ') : null;
  }

  function processStrokes(strokes, weight = 1, align = 'INSIDE') {
    const visibleStrokes = strokes.filter(s => s.visible !== false);
    if (visibleStrokes.length === 0) return null;

    const stroke = visibleStrokes[0]; // Use first visible stroke
    if (!stroke.color) return null;

    const c = stroke.color;
    const opacity = (stroke.opacity || 1) * (c.a || 1);
    const color = `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${opacity})`;

    // Handle stroke alignment
    const result = {};
    if (align === 'OUTSIDE') {
      result['outline'] = `${weight}px solid ${color}`;
      result['outline-offset'] = '0';
    } else if (align === 'CENTER') {
      result['border'] = `${weight}px solid ${color}`;
      result['box-sizing'] = 'border-box';
    } else { // INSIDE
      result['border'] = `${weight}px solid ${color}`;
      result['box-sizing'] = 'border-box';
    }

    return result;
  }

  function processEffects(effects) {
    const result = { boxShadow: null, filter: null };

    const shadows = [];
    const filters = [];

    effects.forEach(effect => {
      if (effect.visible === false) return;

      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const c = effect.color || { r: 0, g: 0, b: 0, a: 0.25 };
        const x = effect.offset?.x || 0;
        const y = effect.offset?.y || 0;
        const blur = effect.radius || 0;
        const spread = effect.spread || 0;
        const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';

        shadows.push(`${inset}${x}px ${y}px ${blur}px ${spread}px rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a || 1})`);
      }

      if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
        filters.push(`blur(${effect.radius || 0}px)`);
      }
    });

    if (shadows.length > 0) {
      result.boxShadow = shadows.join(', ');
    }

    if (filters.length > 0) {
      result.filter = filters.join(' ');
    }

    return result;
  }

  function processAutoLayout(node, styles) {
    styles.set('display', 'flex');

    // Direction
    if (node.layoutMode === 'HORIZONTAL') {
      styles.set('flex-direction', 'row');
    } else if (node.layoutMode === 'VERTICAL') {
      styles.set('flex-direction', 'column');
    }

    // Alignment mapping
    const alignMap = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between',
      'SPACE_AROUND': 'space-around',
      'SPACE_EVENLY': 'space-evenly'
    };

    // Primary axis (justify-content)
    if (node.primaryAxisAlignItems) {
      styles.set('justify-content', alignMap[node.primaryAxisAlignItems] || 'flex-start');
    }

    // Counter axis (align-items)
    if (node.counterAxisAlignItems) {
      styles.set('align-items', alignMap[node.counterAxisAlignItems] || 'flex-start');
    }

    // Padding
    const padding = [];
    if (node.paddingTop) padding[0] = `${node.paddingTop}px`;
    if (node.paddingRight) padding[1] = `${node.paddingRight}px`;
    if (node.paddingBottom) padding[2] = `${node.paddingBottom}px`;
    if (node.paddingLeft) padding[3] = `${node.paddingLeft}px`;

    if (padding.length > 0) {
      styles.set('padding', padding.join(' '));
    }

    // Item spacing (gap)
    if (node.itemSpacing) {
      styles.set('gap', `${node.itemSpacing}px`);
    }

    // Wrap
    if (node.layoutWrap === 'WRAP') {
      styles.set('flex-wrap', 'wrap');
    }
  }

  function processTextNode(node, styles) {
    if (node.style) {
      const s = node.style;

      // Font properties
      if (s.fontFamily) styles.set('font-family', `'${s.fontFamily}', sans-serif`);
      if (s.fontSize) styles.set('font-size', `${s.fontSize}px`);
      if (s.fontWeight) styles.set('font-weight', s.fontWeight.toString());
      if (s.italic) styles.set('font-style', 'italic');

      // Text properties
      if (s.letterSpacing) styles.set('letter-spacing', `${s.letterSpacing}px`);
      if (s.lineHeightPx) {
        styles.set('line-height', `${s.lineHeightPx}px`);
      } else if (s.lineHeightPercent) {
        styles.set('line-height', `${s.lineHeightPercent}%`);
      }

      // Text decoration
      if (s.textDecoration === 'UNDERLINE') styles.set('text-decoration', 'underline');
      if (s.textDecoration === 'STRIKETHROUGH') styles.set('text-decoration', 'line-through');

      // Text case
      if (s.textCase === 'UPPER') styles.set('text-transform', 'uppercase');
      if (s.textCase === 'LOWER') styles.set('text-transform', 'lowercase');
      if (s.textCase === 'TITLE') styles.set('text-transform', 'capitalize');
    }

    // Text alignment
    if (node.textAlignHorizontal) {
      const alignMap = {
        'LEFT': 'left',
        'CENTER': 'center',
        'RIGHT': 'right',
        'JUSTIFIED': 'justify'
      };
      styles.set('text-align', alignMap[node.textAlignHorizontal] || 'left');
    }

    if (node.textAlignVertical) {
      const vAlignMap = {
        'TOP': 'flex-start',
        'CENTER': 'center',
        'BOTTOM': 'flex-end'
      };
      styles.set('display', 'flex');
      styles.set('align-items', vAlignMap[node.textAlignVertical] || 'flex-start');
    }

    // Text fills (color)
    if (node.fills && Array.isArray(node.fills)) {
      const textFill = node.fills.find(f => f.visible !== false && f.type === 'SOLID');
      if (textFill && textFill.color) {
        const c = textFill.color;
        const opacity = (textFill.opacity || 1) * (c.a || 1);
        styles.set('color', `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${opacity})`);
      }
    }
  }

  // Process the document
  if (figmaData.document) {
    extractNode(figmaData.document);
  } else if (figmaData.layouts) {
    // Handle pre-processed layouts
    figmaData.layouts.forEach(layout => {
      layouts.push(processNode(layout, {}));
    });
  }

  // Generate HTML
  const html = generateHTML(layouts, cssVariables, figmaData.name);

  return {
    html,
    layoutCount: layouts.length,
    cssVariables: Array.from(cssVariables.entries()),
    componentStyles: Array.from(componentStyles.entries())
  };
}

function generateHTML(layouts, cssVariables, title = 'Figma Design') {
  // Start HTML document
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    .figma-container {
      position: relative;
      width: 100%;
      min-height: 100vh;
    }

    .figma-element {
      position: absolute;
    }

    /* Responsive images */
    .figma-element img {
      max-width: 100%;
      height: auto;
    }

    /* Text defaults */
    .figma-text {
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="figma-container">
`;

  // Generate elements
  layouts.forEach(layout => {
    if (!layout) return;

    const styleStr = layout.styles
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');

    const className = `figma-element figma-${layout.type.toLowerCase()}`;

    if (layout.type === 'TEXT' && layout.content) {
      html += `    <div id="${layout.id}" class="${className} figma-text" style="${styleStr}">${escapeHtml(layout.content)}</div>\n`;
    } else {
      const content = layout.content || '';
      html += `    <div id="${layout.id}" class="${className}" style="${styleStr}" data-name="${escapeHtml(layout.name)}">${content}</div>\n`;
    }
  });

  html += `  </div>
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = { innerHTML: '' };
  div.innerHTML = text;
  return div.innerHTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}