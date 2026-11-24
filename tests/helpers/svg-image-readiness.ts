/** Install before navigation; SVG load events are not consistently captured on document in WebKit. */
export function trackSvgImageLoads(datasetKey: string) {
  const tracked = new WeakSet<SVGImageElement>();
  const loaded = (event: Event) => {
    if (event.target instanceof SVGImageElement) event.target.dataset[datasetKey] = event.target.getAttribute('href') ?? '';
  };
  const watch = (node: Node) => {
    const images = node instanceof SVGImageElement ? [node]
      : node instanceof Element || node instanceof Document ? Array.from(node.querySelectorAll('image')) : [];
    for (const image of images) {
      if (!(image instanceof SVGImageElement) || tracked.has(image)) continue;
      tracked.add(image);
      image.addEventListener('load', loaded);
    }
  };
  document.addEventListener('load', loaded, true);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(watch)))
    .observe(document, { childList: true, subtree: true });
  watch(document);
}
