/** Lazy, locally hosted Blender model with motion and rendering lifecycle controls. */
const viewerModule = new URL("./vendor/model-viewer.min.js", import.meta.url)
  .href;
let registration;
export function mountMaterialLoop(host) {
  if (!host) return () => {};
  const viewer = host.querySelector("model-viewer");
  const button = host.querySelector("[data-loop-toggle]");
  const status = host.querySelector("[data-loop-status]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let disposed = false,
    visible = true,
    userPaused = motion.matches,
    ready = false,
    failure = false;
  const update = () => {
    if (disposed || failure) return;
    const playing = ready && visible && !document.hidden && !userPaused;
    if (playing) viewer.play?.();
    else viewer.pause?.();
    button.textContent = userPaused ? "Play loop" : "Pause loop";
    button.setAttribute("aria-pressed", String(userPaused));
    status.textContent = ready
      ? userPaused
        ? "Loop paused · drag to explore"
        : "Materials in motion · drag to explore"
      : "Loading the material loop";
  };
  const loaded = () => {
    if (disposed) return;
    ready = true;
    failure = false;
    button.hidden = false;
    host.classList.remove("is-fallback");
    host.classList.add("is-ready");
    button.disabled = false;
    update();
  };
  const failed = () => {
    if (disposed) return;
    failure = true;
    viewer.pause?.();
    host.classList.remove("is-ready");
    host.classList.add("is-fallback");
    button.hidden = true;
    status.textContent = "The material loop · static view";
  };
  const toggle = () => {
    userPaused = !userPaused;
    update();
  };
  const reducedMotion = () => {
    userPaused = motion.matches;
    update();
  };
  viewer.addEventListener("load", loaded);
  viewer.addEventListener("error", failed);
  button.addEventListener("click", toggle);
  motion.addEventListener("change", reducedMotion);
  document.addEventListener("visibilitychange", update);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      update();
    },
    { threshold: 0.05 },
  );
  observer.observe(host);
  // Register only on the overview. The application and its data do not wait for WebGL.
  registration ??= import(viewerModule).then((module) => {
    module.ModelViewerElement.minimumRenderScale = 0.75;
    return module;
  });
  registration
    .then(() => {
      if (!disposed && viewer.loaded) loaded();
    })
    .catch(() => {
      registration = undefined;
      failed();
    });
  update();
  return () => {
    disposed = true;
    observer.disconnect();
    viewer.pause?.();
    viewer.removeEventListener("load", loaded);
    viewer.removeEventListener("error", failed);
    button.removeEventListener("click", toggle);
    motion.removeEventListener("change", reducedMotion);
    document.removeEventListener("visibilitychange", update);
  };
}
