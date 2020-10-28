![](https://badgen.net/badge/Editor.js/v2.0/blue)

# Gallery Tool

Gallery Block for the [Editor.js](https://editorjs.io).

![](./img/prelaod.png)

## Features

- Uploading file from the device
- Preload image

**Note** This Tool requires server-side implementation for file uploading. See [backend response format](#server-format) for more details.

## Installation

### Manual downloading and connecting

1. Upload folder `dist` from repository
2. Add `dist/bundle.js` file to your page.

## Usage

Add a new Tool to the `tools` property of the Editor.js initial config.

```javascript
import Gallery from 'Gallery';

// or if you inject GalleryTool via standalone script
const Gallery = window.Gallery;
 
var editor = EditorJS({
  ...

  tools: {
    ...
    gallery: {
      class: Gallery,
      config: {
        endpoints: {
          byUrl: 'http://localhost:8008/fetchUrl', // Your endpoint that provides uploading by Url
        }
      }
    }
  }

  ...
});
```
