# WebXR

## Installation

Use the package manager [npm](https://nodejs.org/en/download/) to install WebXR.

```bash
npm install @doku276/vrweb
```

## Usage

```html
<body>
  <header>WebXR Demo</header>
  <div id="ar_button"></div>
  <script type="module">
    import webvr from "./node_module_fix/@doku276/vrweb/index.js";

    const flower = "media/gltf/sunflower/sunflower.gltf";
    const reticle = "media/gltf/reticle/reticle.gltf";
    const data = { OBJECT_URL: flower, RETICLE_URL: reticle };

    const button = webvr(data);

    document.getElementById("ar_button").appendChild(button);
  </script>
</body>
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
