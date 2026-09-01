document.addEventListener("DOMContentLoaded", async () => {
  const images = [...document.querySelectorAll(".content img[src$='.svg']")];

  await Promise.all(images.map(async (image) => {
    try {
      const response = await fetch(image.src, { cache: "no-store" });
      if (!response.ok) return;

      const documentSvg = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      const svg = documentSvg.documentElement;
      const frame = document.createElement("figure");
      const caption = document.createElement("figcaption");
      const nodeRects = [...svg.querySelectorAll("rect")].filter((rect) => Number(rect.getAttribute("width")) > 120 && Number(rect.getAttribute("height")) > 70);

      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", image.alt);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.classList.add("field-diagram");
      nodeRects.forEach((rect, index) => rect.classList.add(`field-diagram__node--${index % 4}`));

      frame.className = "diagram-frame";
      caption.textContent = image.alt;
      frame.append(svg, caption);
      image.replaceWith(frame);
    } catch {
      // SVGの取得に失敗した場合は、元の画像をそのまま表示する。
    }
  }));
});
