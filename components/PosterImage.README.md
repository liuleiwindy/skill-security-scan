# PosterImage Component

A React component that implements LQIP (Low Quality Image Placeholder) strategy for loading poster images with smooth transitions and no layout shift.

## Features

- ✅ **LQIP Loading Strategy**: Shows low-quality placeholder immediately
- ✅ **No Layout Shift**: Uses absolute positioning and opacity transitions
- ✅ **Smooth Transitions**: Fade-in/out animations with CSS transitions
- ✅ **Configurable Timeout**: Built-in 8s timeout with customizable duration
- ✅ **Error Handling**: Comprehensive error handling with error type detection
- ✅ **Accessibility**: ARIA labels, live regions, and keyboard support
- ✅ **Responsive**: Mobile-first design with responsive styles
- ✅ **TypeScript**: Full TypeScript type safety
- ✅ **Performance Optimized**: Uses useCallback and useRef to prevent unnecessary re-renders

## Installation

The component is located in `components/PosterImage.tsx` and `components/PosterImage.module.css`.

```bash
# No installation needed - component is already in the project
```

## Basic Usage

```tsx
import { PosterImage } from './components/PosterImage';

export default function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scanId } = await params;
  
  return (
    <div>
      <PosterImage scanId={scanId} />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `scanId` | `string` | Yes | - | The scan ID used to fetch the poster image |
| `src` | `string` | No | `/api/scan/:scanId/poster/image` | Custom image source URL |
| `placeholderSrc` | `string` | No | Generated SVG placeholder | Custom placeholder source (base64 or URL) |
| `timeoutMs` | `number` | No | `8000` | Timeout duration in milliseconds |
| `onLoad` | `() => void` | No | - | Callback invoked when image loads successfully |
| `onError` | `(type: ErrorType) => void` | No | - | Callback invoked when image fails to load |
| `className` | `string` | No | - | Custom CSS class name |
| `alt` | `string` | No | `"Security Scan Poster - {scanId}"` | Custom alt text for accessibility |

## Error Types

```typescript
type PosterImageErrorType = "timeout" | "http" | "network";
```

- `timeout`: Image loading exceeded the timeout duration
- `http`: HTTP error occurred during image fetch
- `network`: Network connectivity issue

## Load States

```typescript
type LoadState = 'loading' | 'loaded' | 'error' | 'timeout';
```

- `loading`: Image is currently being loaded
- `loaded`: Image loaded successfully
- `error`: Image failed to load
- `timeout`: Image loading timed out

## Examples

### Example 1: Basic Usage

```tsx
<PosterImage scanId="abc123" />
```

### Example 2: With Callbacks

```tsx
<PosterImage
  scanId="abc123"
  onLoad={() => console.log('Image loaded')}
  onError={(type) => console.error('Error:', type)}
/>
```

### Example 3: Custom Timeout

```tsx
<PosterImage
  scanId="abc123"
  timeoutMs={15000} // 15 seconds
/>
```

### Example 4: Custom Placeholder

```tsx
<PosterImage
  scanId="abc123"
  placeholderSrc="/custom-placeholder.png"
/>
```

### Example 5: Full Configuration

```tsx
<PosterImage
  scanId="abc123"
  src="/api/custom/poster/abc123"
  placeholderSrc={`data:image/svg+xml;base64,${btoa('...')}`}
  timeoutMs={12000}
  onLoad={() => console.log('Loaded')}
  onError={(type) => console.error(type)}
  className="w-full max-w-2xl"
  alt="Custom Alt Text"
/>
```

## Integration Example

Here's how to integrate `PosterImage` into the poster page:

```tsx
// app/scan/poster/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PosterImage } from "@/components/PosterImage";
import styles from "./poster.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Security Scan Poster - ${id}`,
    description: "View and save your security scan poster",
  };
}

export default async function PosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: scanId } = await params;
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/scan" className={styles.backLink}>
          ← Back to Scan
        </Link>
      </header>
      
      <main className={styles.main}>
        <PosterImage
          scanId={scanId}
          onLoad={() => console.log(`Poster ${scanId} loaded`)}
          onError={(type) => console.error(`Poster ${scanId} failed: ${type}`)}
        />
      </main>
      
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Skill Security Scan</p>
      </footer>
    </div>
  );
}
```

## No Layout Shift Verification

The component is designed to have zero layout shift. Here's how to verify:

### Method 1: Chrome DevTools Performance

1. Open DevTools → Performance tab
2. Click "Record"
3. Refresh the page
4. Click "Stop"
5. Check for "Layout Shift" events (should be 0)

### Method 2: Chrome DevTools Lighthouse

1. Open DevTools → Lighthouse tab
2. Run an audit
3. Check "Cumulative Layout Shift" (should be 0)

### Method 3: Visual Inspection

1. Open DevTools → Rendering
2. Check "Layout shift regions"
3. Refresh the page
4. Observe no red/yellow regions appear

See [POSTER-IMAGE-LAYOUT-SHIFT-VERIFICATION.md](../docs/POSTER-IMAGE-LAYOUT-SHIFT-VERIFICATION.md) for detailed verification steps.

## How It Works

### 1. Fixed Container Dimensions

```tsx
<div style={{ aspectRatio: '687 / 1024' }}>
```

The container has a fixed aspect ratio, so the height is calculated immediately from the width.

### 2. Absolute Positioning

Both the placeholder and full image use absolute positioning:

```tsx
{/* Placeholder */}
<div style={{ position: 'absolute', inset: 0 }}>

{/* Full Image */}
<img style={{ position: 'absolute', inset: 0 }}>
```

They occupy the same space, so there's no layout shift when swapping.

### 3. Opacity Transitions

```tsx
style={{
  opacity: isLoaded ? 0 : 1,
  transition: 'opacity 0.3s ease',
}}
```

Instead of adding/removing elements, we just change opacity, which doesn't affect layout.

### 4. Preloading

```tsx
const img = new Image();
img.onload = () => {
  setImageUrl(src);
  setState('loaded');
};
img.src = src;
```

The image is preloaded in memory, so when it's ready, it appears instantly.

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

The component uses modern CSS features:
- `aspectRatio`: Supported in all modern browsers (Chrome 88+, Firefox 89+, Safari 15+)
- `position: absolute; inset: 0`: Universal support
- `opacity` with `transition`: Universal support

## Accessibility

- ✅ `role="img"` for screen readers
- ✅ `aria-label` for descriptive text
- ✅ `aria-busy` during loading
- ✅ `aria-live` for error states
- ✅ Keyboard navigable
- ✅ Reduced motion support (`prefers-reduced-motion`)

## Performance

- ✅ No layout shift (CLS = 0)
- ✅ Minimal re-renders (uses useCallback and useRef)
- ✅ Efficient image preloading
- ✅ CSS transitions (hardware accelerated)

## Styling

The component uses CSS Modules (`PosterImage.module.css`) for scoped styling. You can customize the appearance by:

1. Using the `className` prop for custom classes
2. Modifying the CSS module directly
3. Overriding CSS variables (if any)

## Testing

See `PosterImage.example.tsx` for comprehensive usage examples and testing scenarios.

## Troubleshooting

### Image never loads

- Check if the API endpoint is correct
- Verify the scan ID is valid
- Check browser console for network errors
- Try increasing `timeoutMs`

### Placeholder appears blurry

- This is expected due to the 8px blur filter
- Remove the blur effect in the CSS if needed

### Layout shift still occurs

- Ensure the container has a fixed width or max-width
- Check that no parent elements are changing dimensions
- Verify that `aspectRatio` CSS property is supported in your browser
- Use DevTools Performance tab to identify the source of the shift

## Future Enhancements

Planned for future tasks:

- [ ] Retry functionality (Task 1.3)
- [ ] Enhanced error messages (Task 1.3)
- [ ] Progressive image loading
- [ ] Animated skeleton screen
- [ ] Shimmer effect on placeholder

## Related Files

- `components/PosterImage.tsx` - Main component
- `components/PosterImage.module.css` - Component styles
- `components/PosterImage.example.tsx` - Usage examples
- `docs/POSTER-IMAGE-LAYOUT-SHIFT-VERIFICATION.md` - Layout shift verification guide

## License

Copyright © 2026 Skill Security Scan
