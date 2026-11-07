(() => {
  const controls = document.querySelectorAll(".language-select, #language-select");
  const requested = new URLSearchParams(window.location.search).get("lang");
  const initialLanguage = requested === "en" ? "en" : "pt";

  function applyLanguage(language) {
    const selectedLanguage = language === "en" ? "en" : "pt";
    document.documentElement.lang = selectedLanguage === "en" ? "en" : "pt-BR";

    document.querySelectorAll("[data-pt][data-en]").forEach((element) => {
      const text = element.dataset[selectedLanguage];
      const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = text + (textNode.nodeValue.endsWith(" ") ? " " : "");
      else element.textContent = text;
    });

    document.querySelectorAll("[data-pt-label][data-en-label]").forEach((element) => {
      element.setAttribute("aria-label", element.dataset[`${selectedLanguage}Label`]);
    });

    document.querySelectorAll("[data-pt-title][data-en-title]").forEach((element) => {
      document.title = element.dataset[`${selectedLanguage}Title`];
    });

    controls.forEach((control) => {
      control.value = selectedLanguage;
      control.setAttribute("aria-label", selectedLanguage === "en" ? "Language" : "Idioma");
    });

    try {
      const currentUrl = new URL(window.location.href);
      if (selectedLanguage === "en") currentUrl.searchParams.set("lang", "en");
      else currentUrl.searchParams.delete("lang");
      window.history.replaceState(null, "", currentUrl.href);
    } catch {
      // File URL restrictions can block history updates; internal links keep the selection.
    }

    document.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(href)) return;
      const url = new URL(href, window.location.href);
      if (selectedLanguage === "en") url.searchParams.set("lang", "en");
      else url.searchParams.delete("lang");
      anchor.href = url.href;
    });
  }

  controls.forEach((control) => {
    control.addEventListener("change", () => applyLanguage(control.value));
  });

  applyLanguage(initialLanguage);
})();

