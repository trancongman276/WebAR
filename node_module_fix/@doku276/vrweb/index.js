import { WebXRButton } from "./lib/util/webxr-button.js";
import { Scene } from "./lib/render/scenes/scene.js";
import { Renderer, createWebGLContext } from "./lib/render/core/renderer.js";
import { Node } from "./lib/render/core/node.js";
import { Gltf2Node } from "./lib/render/nodes/gltf2.js";
import { DropShadowNode } from "./lib/render/nodes/drop-shadow.js";
import { vec3 } from "./lib/render/math/gl-matrix.js";

// Start the XR application.

function webvr(urls) {
  const { OBJECT_URL, RETICLE_URL } = urls;
  
  // XR globals.
  let xrButton = null;
  let xrRefSpace = null;
  let xrViewerSpace = null;
  let xrHitTestSource = null;

  // WebGL scene globals.
  let gl = null;
  let renderer = null;
  let scene = new Scene();
  scene.enableStats(false);

  let arObject = new Node();
  arObject.visible = false;
  scene.addNode(arObject);

  let object = new Gltf2Node({ url: OBJECT_URL });
  arObject.addNode(object);

  let reticle = new Gltf2Node({ url: RETICLE_URL });
  reticle.visible = false;
  scene.addNode(reticle);
  let reticleHitTestResult = null;

  // Having a really simple drop shadow underneath an object helps ground
  // it in the world without adding much complexity.
  let shadow = new DropShadowNode();
  vec3.set(shadow.scale, 0.15, 0.15, 0.15);
  arObject.addNode(shadow);

  // Ensure the background is transparent for AR.
  scene.clear = false;

  function initXR() {
    xrButton = new WebXRButton({
      onRequestSession: onRequestSession,
      onEndSession: onEndSession,
      textEnterXRTitle: "START AR",
      textXRNotFoundTitle: "AR NOT FOUND",
      textExitXRTitle: "EXIT  AR",
    });
    // document.querySelector("header").appendChild(xrButton.domElement);
    xrButton.domElement.click();
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        xrButton.enabled = supported;
      });
    }
  }

  function onRequestSession() {
    return navigator.xr
      .requestSession("immersive-ar", {
        requiredFeatures: ["local", "hit-test", "anchors"],
      })
      .then((session) => {
        // xrButton.setSession(session);
        onSessionStarted(session);
      })
  }

  function onSessionStarted(session) {
    session.addEventListener("end", onSessionEnded);
    session.addEventListener("select", onSelect);

    if (!gl) {
      gl = createWebGLContext({
        xrCompatible: true,
      });

      renderer = new Renderer(gl);

      scene.setRenderer(renderer);
    }

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    // In this sample we want to cast a ray straight out from the viewer's
    // position and render a reticle where it intersects with a real world
    // surface. To do this we first get the viewer space, then create a
    // hitTestSource that tracks it.
    session.requestReferenceSpace("viewer").then((refSpace) => {
      xrViewerSpace = refSpace;
      session
        .requestHitTestSource({ space: xrViewerSpace })
        .then((hitTestSource) => {
          xrHitTestSource = hitTestSource;
        });
    });

    session.requestReferenceSpace("local").then((refSpace) => {
      xrRefSpace = refSpace;

      session.requestAnimationFrame(onXRFrame);
    });
  }

  function onEndSession(session) {
    anchoredObjects.clear();
    xrHitTestSource.cancel();
    xrHitTestSource = null;
    session.end();
  }

  function onSessionEnded(event) {
    // xrButton.setSession(null);
  }

  const MAX_ANCHORED_OBJECTS = 30;
  let anchoredObjects = [];
  function addAnchoredObjectsToScene(anchor) {
    let object = new Gltf2Node({ url: OBJECT_URL });
    scene.addNode(object);
    anchoredObjects.push({
      anchoredObject: object,
      anchor: anchor,
    });

    // For performance reasons if we add too many objects start
    // removing the oldest ones to keep the scene complexity
    // from growing too much.
    if (anchoredObjects.length > MAX_ANCHORED_OBJECTS) {
      let objectToRemove = anchoredObjects.shift();
      scene.removeNode(objectToRemove.anchoredObject);
      objectToRemove.anchor.delete();
    }
  }

  function onSelect(event) {
    if (reticle.visible) {
      // Create an anchor.
      reticleHitTestResult.createAnchor().then(
        (anchor) => {
          addAnchoredObjectsToScene(anchor);
        },
        (error) => {
          console.error("Could not create anchor: " + error);
        }
      );
    }
  }

  // Called every time a XRSession requests that a new frame be drawn.
  function onXRFrame(t, frame) {
    let session = frame.session;
    let pose = frame.getViewerPose(xrRefSpace);

    reticle.visible = false;

    // If we have a hit test source, get its results for the frame
    // and use the pose to display a reticle in the scene.
    if (xrHitTestSource && pose) {
      let hitTestResults = frame.getHitTestResults(xrHitTestSource);
      if (hitTestResults.length > 0) {
        let pose = hitTestResults[0].getPose(xrRefSpace);
        reticle.visible = true;
        reticle.matrix = pose.transform.matrix;
        reticleHitTestResult = hitTestResults[0];
      }
    }

    for (const { anchoredObject, anchor } of anchoredObjects) {
      // only update the object's position if it's still in the list
      // of frame.trackedAnchors
      if (!frame.trackedAnchors.has(anchor)) {
        continue;
      }
      const anchorPose = frame.getPose(anchor.anchorSpace, xrRefSpace);
      anchoredObject.matrix = anchorPose.transform.matrix;
    }

    scene.startFrame();

    session.requestAnimationFrame(onXRFrame);

    scene.drawXRFrame(frame, pose);

    scene.endFrame();
  }

  // initXR();
  // let requestPromise = onRequestSession();
  // if (requestPromise) {
  //   requestPromise.catch((err) => {
  //     // Reaching this point indicates that the session request has failed
  //     // and we should communicate that to the user somehow.
  //     let errorMsg = `XRSession creation failed: ${err.message}`;
  //     alert("Cannot create AR session. Make sure your device support AR.")
  //     console.error(errorMsg);
  //   });
  // }
  initXR();
  return true;
};

export default webvr;