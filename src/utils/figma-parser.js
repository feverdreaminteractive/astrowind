// Advanced Figma to HTML Parser
// Extracts maximum design information for accurate HTML/CSS generation

class FigmaParser {
  constructor(figmaData) {
    this.data = figmaData;
    this.styles = {};
    this.components = {};
    this.assets = {};
    this.designTokens = {
      colors: {},
      typography: {},
      spacing: {},
      borderRadius: {},
      shadows: {}
    };
  }

  // Main parsing function
  parse() {
    // Extract styles first
    this.extractStyles();

    // Parse document structure
    const document = this.data.document;
    const pages = document.children || [];

    const parsedData = {
      name: this.data.name,
      lastModified: this.data.lastModified,
      version: this.data.version,
      styles: this.styles,
      components: this.components,
      designTokens: this.designTokens,
      pages: pages.map(page => this.parsePage(page))
    };

    return parsedData;
  }

  // Extract global styles
  extractStyles() {
    if (this.data.styles) {
      Object.entries(this.data.styles).forEach(([id, style]) => {
        this.styles[id] = style;

        // Extract design tokens from styles
        if (style.styleType === 'FILL' && style.name) {
          this.designTokens.colors[this.cssVarName(style.name)] =
            this.extractColor(style);
        } else if (style.styleType === 'TEXT' && style.name) {
          this.designTokens.typography[this.cssVarName(style.name)] =
            this.extractTextStyle(style);
        }
      });
    }
  }

  // Parse a page
  parsePage(page) {
    return {
      id: page.id,
      name: page.name,
      type: page.type,
      children: page.children.map(child => this.parseNode(child))
    };
  }

  // Recursively parse nodes
  parseNode(node) {
    const parsed = {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible !== false,
      locked: node.locked || false,

      // Layout properties
      layout: this.extractLayout(node),

      // Style properties
      styles: this.extractNodeStyles(node),

      // Content
      content: this.extractContent(node),

      // Children
      children: node.children ?
        node.children.map(child => this.parseNode(child)) : []
    };

    // Check if it's a component instance
    if (node.type === 'INSTANCE') {
      parsed.componentId = node.componentId;
      this.components[node.componentId] = true;
    }

    return parsed;
  }

  // Extract layout information
  extractLayout(node) {
    const layout = {
      // Position and size
      x: node.absoluteBoundingBox?.x || 0,
      y: node.absoluteBoundingBox?.y || 0,
      width: node.absoluteBoundingBox?.width || 0,
      height: node.absoluteBoundingBox?.height || 0,

      // Constraints for responsive behavior
      constraints: node.constraints || {},

      // Auto-layout (Flexbox properties)
      layoutMode: node.layoutMode, // HORIZONTAL or VERTICAL
      layoutAlign: node.layoutAlign, // Alignment
      layoutGrow: node.layoutGrow, // Flex grow
      itemSpacing: node.itemSpacing, // Gap between items
      paddingLeft: node.paddingLeft || 0,
      paddingRight: node.paddingRight || 0,
      paddingTop: node.paddingTop || 0,
      paddingBottom: node.paddingBottom || 0,

      // Positioning
      layoutPositioning: node.layoutPositioning, // AUTO or ABSOLUTE
    };

    // Extract spacing tokens
    if (node.itemSpacing) {
      this.designTokens.spacing[`gap-${node.id}`] = `${node.itemSpacing}px`;
    }

    return layout;
  }

  // Extract node styles
  extractNodeStyles(node) {
    const styles = {
      // Background
      fills: this.extractFills(node.fills),

      // Border
      strokes: this.extractStrokes(node.strokes),
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,

      // Corner radius
      cornerRadius: node.cornerRadius,

      // Effects (shadows, blur)
      effects: this.extractEffects(node.effects),

      // Opacity
      opacity: node.opacity !== undefined ? node.opacity : 1,

      // Blend mode
      blendMode: node.blendMode || 'NORMAL',

      // Clipping
      clipsContent: node.clipsContent || false
    };

    // Extract border radius token
    if (node.cornerRadius) {
      this.designTokens.borderRadius[`radius-${node.id}`] = `${node.cornerRadius}px`;
    }

    return styles;
  }

  // Extract fills (backgrounds)
  extractFills(fills) {
    if (!fills || fills.length === 0) return null;

    return fills.map(fill => {
      if (fill.type === 'SOLID') {
        return {
          type: 'solid',
          color: this.rgbaToHex(fill.color),
          opacity: fill.opacity !== undefined ? fill.opacity : 1
        };
      } else if (fill.type === 'GRADIENT_LINEAR') {
        return {
          type: 'gradient',
          gradient: this.extractGradient(fill.gradientStops)
        };
      } else if (fill.type === 'IMAGE') {
        return {
          type: 'image',
          imageRef: fill.imageRef,
          scaleMode: fill.scaleMode
        };
      }
      return fill;
    });
  }

  // Extract strokes (borders)
  extractStrokes(strokes) {
    if (!strokes || strokes.length === 0) return null;

    return strokes.map(stroke => ({
      type: stroke.type,
      color: this.rgbaToHex(stroke.color),
      opacity: stroke.opacity !== undefined ? stroke.opacity : 1
    }));
  }

  // Extract effects (shadows, blur)
  extractEffects(effects) {
    if (!effects || effects.length === 0) return null;

    return effects.map(effect => {
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const shadow = {
          type: effect.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow',
          color: this.rgbaToHex(effect.color),
          offset: { x: effect.offset.x, y: effect.offset.y },
          radius: effect.radius,
          spread: effect.spread || 0
        };

        // Add to design tokens
        const shadowValue = `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${shadow.spread}px ${shadow.color}`;
        this.designTokens.shadows[`shadow-${effect.type}`] = shadowValue;

        return shadow;
      } else if (effect.type === 'BLUR') {
        return {
          type: 'blur',
          radius: effect.radius
        };
      }
      return effect;
    });
  }

  // Extract content (text, vectors, etc.)
  extractContent(node) {
    const content = {};

    if (node.type === 'TEXT') {
      content.text = node.characters;
      content.textStyle = {
        fontFamily: node.style?.fontFamily,
        fontSize: node.style?.fontSize,
        fontWeight: node.style?.fontWeight,
        lineHeight: node.style?.lineHeightPx
          ? { value: node.style.lineHeightPx, unit: 'px' }
          : node.style?.lineHeightPercentFontSize
            ? { value: node.style.lineHeightPercentFontSize, unit: '%' }
            : 'normal',
        letterSpacing: node.style?.letterSpacing,
        textAlign: node.style?.textAlignHorizontal?.toLowerCase(),
        textDecoration: node.style?.textDecoration,
        textTransform: node.style?.textCase === 'UPPER' ? 'uppercase'
          : node.style?.textCase === 'LOWER' ? 'lowercase'
          : node.style?.textCase === 'TITLE' ? 'capitalize' : 'none'
      };

      // Add to typography tokens
      if (node.name && node.style) {
        this.designTokens.typography[this.cssVarName(node.name)] = content.textStyle;
      }
    } else if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION') {
      content.vectorData = node.vectorPaths;
      content.fillGeometry = node.fillGeometry;
    } else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      content.shape = node.type.toLowerCase();
    }

    return content;
  }

  // Extract gradient
  extractGradient(stops) {
    const gradientStops = stops.map(stop => ({
      color: this.rgbaToHex(stop.color),
      position: stop.position
    }));

    return gradientStops.map(stop =>
      `${stop.color} ${Math.round(stop.position * 100)}%`
    ).join(', ');
  }

  // Convert RGBA to hex
  rgbaToHex(color) {
    if (!color) return '#000000';

    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a !== undefined ? color.a : 1;

    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    return `#${[r, g, b].map(x =>
      x.toString(16).padStart(2, '0')
    ).join('')}`;
  }

  // Convert name to CSS variable name
  cssVarName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Extract color from style
  extractColor(style) {
    // Implementation depends on style structure
    return '#000000'; // Placeholder
  }

  // Extract text style
  extractTextStyle(style) {
    // Implementation depends on style structure
    return {}; // Placeholder
  }

  // Generate CSS from parsed data
  generateCSS(parsedData) {
    let css = ':root {\n';

    // Add design tokens as CSS variables
    Object.entries(parsedData.designTokens.colors).forEach(([name, value]) => {
      css += `  --color-${name}: ${value};\n`;
    });

    Object.entries(parsedData.designTokens.spacing).forEach(([name, value]) => {
      css += `  --${name}: ${value};\n`;
    });

    Object.entries(parsedData.designTokens.borderRadius).forEach(([name, value]) => {
      css += `  --${name}: ${value};\n`;
    });

    Object.entries(parsedData.designTokens.shadows).forEach(([name, value]) => {
      css += `  --${name}: ${value};\n`;
    });

    css += '}\n\n';

    return css;
  }

  // Generate semantic HTML structure
  generateHTML(node, level = 0) {
    const indent = '  '.repeat(level);
    let html = '';

    // Determine semantic HTML element based on node name and type
    const element = this.getSemanticElement(node);
    const className = this.generateClassName(node.name);
    const styles = this.generateInlineStyles(node);

    if (node.type === 'TEXT') {
      html += `${indent}<${element} class="${className}"${styles}>${node.content.text}</${element}>\n`;
    } else if (node.children && node.children.length > 0) {
      html += `${indent}<${element} class="${className}"${styles}>\n`;
      node.children.forEach(child => {
        html += this.generateHTML(child, level + 1);
      });
      html += `${indent}</${element}>\n`;
    } else {
      html += `${indent}<${element} class="${className}"${styles}></${element}>\n`;
    }

    return html;
  }

  // Determine semantic HTML element
  getSemanticElement(node) {
    const name = node.name.toLowerCase();

    // Check for semantic patterns
    if (name.includes('header')) return 'header';
    if (name.includes('nav')) return 'nav';
    if (name.includes('footer')) return 'footer';
    if (name.includes('section')) return 'section';
    if (name.includes('article')) return 'article';
    if (name.includes('aside')) return 'aside';
    if (name.includes('button')) return 'button';
    if (name.includes('link')) return 'a';
    if (name.includes('list')) return 'ul';
    if (name.includes('item') && node.parent?.includes('list')) return 'li';
    if (name.includes('heading') || name.includes('h1')) return 'h1';
    if (name.includes('h2')) return 'h2';
    if (name.includes('h3')) return 'h3';
    if (name.includes('paragraph') || node.type === 'TEXT') return 'p';
    if (name.includes('image') || name.includes('img')) return 'img';
    if (name.includes('input')) return 'input';
    if (name.includes('form')) return 'form';
    if (name.includes('card')) return 'article';
    if (name.includes('container')) return 'div';

    // Check for auto-layout (flexbox)
    if (node.layout?.layoutMode) return 'div';

    // Default
    return 'div';
  }

  // Generate class name from node name
  generateClassName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Generate inline styles
  generateInlineStyles(node) {
    const styles = [];

    // Layout styles
    if (node.layout?.layoutMode === 'HORIZONTAL') {
      styles.push('display: flex', 'flex-direction: row');
    } else if (node.layout?.layoutMode === 'VERTICAL') {
      styles.push('display: flex', 'flex-direction: column');
    }

    if (node.layout?.itemSpacing) {
      styles.push(`gap: ${node.layout.itemSpacing}px`);
    }

    // Padding
    if (node.layout?.paddingTop) {
      styles.push(`padding: ${node.layout.paddingTop}px ${node.layout.paddingRight}px ${node.layout.paddingBottom}px ${node.layout.paddingLeft}px`);
    }

    // Background
    if (node.styles?.fills?.[0]) {
      const fill = node.styles.fills[0];
      if (fill.type === 'solid') {
        styles.push(`background-color: ${fill.color}`);
      }
    }

    // Border radius
    if (node.styles?.cornerRadius) {
      styles.push(`border-radius: ${node.styles.cornerRadius}px`);
    }

    return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FigmaParser;
}