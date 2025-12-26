# Adding a New Streaming Site

This guide explains how to add support for a new streaming platform to the Screen Reader Description browser extension.

## Overview

The extension works by injecting content scripts into streaming sites to:
1. Detect when a video is playing
2. Extract the video ID and metadata
3. Load corresponding audio description transcripts
4. Display descriptions using screen reader technology
5. Provide editing capabilities for creating new descriptions

## Getting up and running

1. Create a new TypeScript file in `extension/src/` named after your platform (e.g., `hulu.ts`, `disney.ts`).

2. Update the rollup.config.mjs file to include the file name it the `files` array. (e.g., `"hulu"`, `"disney"`).

3. Update the `public/manifest.json`'s `content_script` property to have an item for your rolledup file (e.g.:
```json
{
    "js": ["hulu.js"],
    "matches": ["https://*.hulu.com/*"]
},
```
). If you see issues with running the content script, confirm that the hulu.js file is *actually* being created by the rollup script (It should appear in `dist`, including after running `npm run clean`). Also confirm that the URL where you want the content script to run *actually* matches the `matches` property.

4. Update the top-level file `types.d.ts` to include your new platform in the `SupportedSourceDomains` type.

## Building the content script

Use this template as your starting point:

```typescript
import { defaultStyle } from "./constants";
import { SRDManager } from "./SRDManager";

new SRDManager({
    style: defaultStyle,                    // Use defaultStyle or create custom styles
    videoSelector: "video",                 // CSS selector for the video element
    platformId: "yourplatform",            // Unique identifier for your platform
    ccContainerSelector: ".your-container", // Where to inject description text
    editorListenerContainerSelector: "body", // Container for keyboard event listeners
    indicatorContainerSelector: ".player",  // Where to show editing indicators (optional)
    main: ({ setup, teardown, updateMetadata }) => {
        // Your platform-specific logic here
    }
});
```

### 3. Configure Required Parameters

#### `videoSelector`
- CSS selector to find the video element on the page
- Examples: `"video"`, `"#player video"`, `".video-player video"`

#### `platformId`
- Unique identifier for your platform
- Must match the domain name in your transcript files
- Examples: `"hulu"`, `"disney"`, `"amazon"`

#### `ccContainerSelector`
- Container where description text will be injected
- Should be visible and accessible to screen readers
- Examples: `"#below"`, `".subtitles-container"`, `"#player-controls"`

#### `editorListenerContainerSelector`
- Element that will receive keyboard shortcuts for editing
- Usually `"body"` unless the site has specific requirements

#### `indicatorContainerSelector` (optional)
- Where to show visual indicators when in edit mode
- Should be near the video player

### 4. Implement Platform-Specific Logic

The `main` function receives three callbacks:

#### `setup(id: string, errorCallback?: () => void)`
- Call this when you've detected a video and extracted its ID
- The ID should be unique and stable for the same video
- Example: YouTube video ID, Netflix movie ID, etc.

#### `teardown()`
- Call this when navigating away from a video
- Cleans up event listeners and stops description playback

#### `updateMetadata(metadata: Partial<EditableMetadata>)`
- Call this to provide video metadata for editing features
- Include: `url`, `type`, `title`, `seriesTitle`, `episode`, etc.

### 5. Handle Video Detection

Different platforms require different approaches:

#### URL-Based Detection (Simple)
```typescript
main: ({ setup }) => {
    // Extract ID from URL
    const urlParts = location.pathname.split("/");
    const id = urlParts[2]; // Adjust based on URL structure
    if (id) {
        setup(id);
    }
}
```

#### Event-Based Detection (Complex)
```typescript
main: ({ setup, teardown }) => {
    // Listen for navigation events
    document.addEventListener("navigation-event", (e) => {
        teardown();
        const videoId = extractVideoId(e);
        if (videoId) {
            setup(videoId);
        }
    });
}
```

#### Message-Based Detection (Iframes)
```typescript
main: ({ setup, updateMetadata }) => {
    window.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "video-loaded") {
            setup(data.videoId);
            updateMetadata({
                url: data.url,
                title: data.title,
                type: data.type
            });
        }
    });
}
```

## Testing Checklist

- [ ] Video detection works on initial page load
- [ ] Video detection works when navigating between videos (Single Page App only)
- [ ] Video indicators appear correctly (confirm that you've enabled indicators on the Options page)
- [ ] Description text appears and is accessible to screen readers
- [ ] Editing mode can be toggled (press 'r')
- [ ] Keyboard shortcuts work for editing
- [ ] Metadata is properly extracted and displayed
- [ ] Extension works in both normal and incognito modes
- [ ] No console errors or warnings

