const CART_KEY = "lokcerto-orcamento-v2";
const WHATSAPP_NUMBER = "558299998692";

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const getProduct = (id) => produtosLokcerto.find((p) => p.id === id);
const getVariation = (product, id) => product?.variacoes?.find((v) => v.id === id);

function readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function renderProducts() {
  const grid = $("#lista-equipamentos");
  if (!grid) return;

  grid.innerHTML = produtosLokcerto.map((p, index) => `
    <article class="product-card ${p.destaque ? "is-featured" : ""}" data-product-open="${p.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(p.nome)}" style="--delay:${index * 45}ms">
      ${p.selo ? `<div class="product-special"><i class="bi bi-stars"></i>${escapeHtml(p.selo)}</div>` : ""}
      <div class="product-image"><img src="${p.imagem}" alt="${escapeHtml(p.nome)}" loading="lazy" /></div>
      <div class="product-card-copy">
        <p class="product-category">${escapeHtml(p.categoria)}</p>
        <h3>${escapeHtml(p.nome)}</h3>
        <p>${escapeHtml(p.descricao)}</p>
        <span class="product-link">Ver detalhes <i class="bi bi-arrow-up-right"></i></span>
      </div>
    </article>
  `).join("");
}

const overlay = $("[data-overlay]");
const modal = $("[data-product-modal]");
const drawer = $("[data-cart-drawer]");
let activeProduct = null;
let activeVariation = "";
let lastFocused = null;

function setOverlay(open) {
  overlay.hidden = !open;
  document.body.classList.toggle("no-scroll", open);
}

function closeAll() {
  modal.classList.remove("is-open");
  drawer.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-hidden", "true");
  setOverlay(false);
  if (lastFocused) lastFocused.focus({ preventScroll: true });
}

function openProduct(id, trigger = null) {
  const product = getProduct(id);
  if (!product) return;
  lastFocused = trigger || document.activeElement;
  activeProduct = product;
  activeVariation = product.variacoes?.[0]?.id || "";
  modal.dataset.productId = product.id;

  $("[data-modal-title]").textContent = product.nome;
  $("[data-modal-category]").textContent = product.categoria;
  $("[data-modal-short]").textContent = product.descricao;
  $("[data-modal-description]").textContent = product.descricaoDetalhada;
  $("[data-qty-input]").value = 1;
  $("[data-modal-feedback]").textContent = "";

  const image = $("[data-modal-image]");
  image.src = product.imagem;
  image.alt = product.nome;
  image.dataset.variationId = activeVariation;

  const badge = $("[data-modal-badge]");
  badge.hidden = !product.selo;
  badge.innerHTML = product.selo ? `<i class="bi bi-stars"></i> ${escapeHtml(product.selo)}` : "";

  const highlight = $("[data-modal-highlight]");
  highlight.hidden = !product.destaque;
  highlight.innerHTML = product.destaque ? `<i class="bi bi-check-circle-fill"></i><span>${escapeHtml(product.destaque)}</span>` : "";

  const variationBlock = $("[data-variation-block]");
  const options = $("[data-variation-options]");
  variationBlock.hidden = !product.variacoes?.length;
  options.innerHTML = (product.variacoes || []).map((v, index) => `
    <button class="variation-chip ${index === 0 ? "is-active" : ""}" type="button" data-variation="${v.id}">${escapeHtml(v.nome)}</button>
  `).join("");

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  setOverlay(true);
  history.replaceState(null, "", `#${product.id}`);
  setTimeout(() => $("[data-close-product]").focus(), 60);
}

function closeProduct() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!drawer.classList.contains("is-open")) setOverlay(false);
  if (location.hash && getProduct(location.hash.slice(1))) history.replaceState(null, "", `${location.pathname}${location.search}#equipamentos`);
}

function openCart() {
  lastFocused = document.activeElement;
  closeProduct();
  renderCart();
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  setOverlay(true);
  setTimeout(() => $("[data-close-cart]", drawer)?.focus(), 60);
}

function showToast(message) {
  const toast = $("[data-toast]");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function addToCart() {
  if (!activeProduct) return;
  const quantity = Math.max(1, parseInt($("[data-qty-input]").value, 10) || 1);
  const cart = readCart();
  const existing = cart.find((item) => item.productId === activeProduct.id && item.variationId === activeVariation);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId: activeProduct.id, variationId: activeVariation, quantity });
  saveCart(cart);
  $("[data-modal-feedback]").textContent = "Adicionado à solicitação de orçamento.";
  showToast(`${activeProduct.nome} adicionado ao orçamento`);
}

function renderCart() {
  const cart = readCart().filter((item) => getProduct(item.productId));
  const list = $("[data-cart-list]");
  const empty = $("[data-cart-empty]");
  const footer = $("[data-cart-footer]");
  const totalQty = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  $$('[data-cart-count]').forEach((el) => {
    el.textContent = totalQty;
    el.hidden = totalQty === 0;
  });

  if (!list) return;
  empty.hidden = cart.length > 0;
  footer.hidden = cart.length === 0;
  $("[data-cart-summary]").textContent = `${totalQty} ${totalQty === 1 ? "item" : "itens"}`;

  list.innerHTML = cart.map((item, index) => {
    const p = getProduct(item.productId);
    const v = getVariation(p, item.variationId);
    const image = v?.imagem || p.imagem;
    return `
      <article class="cart-item">
        <img src="${image}" alt="${escapeHtml(p.nome)}" />
        <div class="cart-item-copy">
          <h3>${escapeHtml(p.nome)}</h3>
          ${v ? `<p>${escapeHtml(v.nome)}</p>` : `<p>${escapeHtml(p.categoria)}</p>`}
          <div class="cart-item-controls">
            <button type="button" data-cart-minus="${index}" aria-label="Diminuir quantidade">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-plus="${index}" aria-label="Aumentar quantidade">+</button>
          </div>
        </div>
        <button class="cart-remove" type="button" data-cart-remove="${index}" aria-label="Remover ${escapeHtml(p.nome)}"><i class="bi bi-trash3"></i></button>
      </article>`;
  }).join("");
}

function updateCartItem(index, delta) {
  const cart = readCart();
  if (!cart[index]) return;
  cart[index].quantity = Math.max(1, Number(cart[index].quantity) + delta);
  saveCart(cart);
}

function sendWhatsapp() {
  const cart = readCart().filter((item) => getProduct(item.productId));
  if (!cart.length) return;
  const lines = [
    "Olá! Gostaria de solicitar um orçamento para locação dos seguintes equipamentos:",
    ""
  ];
  cart.forEach((item) => {
    const p = getProduct(item.productId);
    const v = getVariation(p, item.variationId);
    lines.push(`• ${p.nome}${v ? ` — ${v.nome}` : ""} | Quantidade: ${item.quantity}`);
  });
  lines.push("", "Podem me informar a disponibilidade e condições de locação?");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const productTrigger = event.target.closest("[data-product-open]");
    if (productTrigger) {
      event.preventDefault();
      openProduct(productTrigger.dataset.productOpen, productTrigger);
      return;
    }

    if (event.target.closest("[data-close-product]")) closeProduct();
    if (event.target.closest("[data-open-cart]")) openCart();
    if (event.target.closest("[data-close-cart]")) closeAll();
    if (event.target === overlay) closeAll();
    if (event.target.closest("[data-add-quote]")) addToCart();
    if (event.target.closest("[data-qty-minus]")) $("[data-qty-input]").value = Math.max(1, Number($("[data-qty-input]").value) - 1);
    if (event.target.closest("[data-qty-plus]")) $("[data-qty-input]").value = Math.max(1, Number($("[data-qty-input]").value) + 1);

    const variation = event.target.closest("[data-variation]");
    if (variation && activeProduct) {
      activeVariation = variation.dataset.variation;
      $$("[data-variation]", modal).forEach((el) => el.classList.toggle("is-active", el === variation));
      const selected = getVariation(activeProduct, activeVariation);
      if (selected?.imagem) {
        const image = $("[data-modal-image]");
        image.src = selected.imagem;
        image.alt = `${activeProduct.nome} ${selected.nome}`;
        image.dataset.variationId = activeVariation;
      }
    }

    const minus = event.target.closest("[data-cart-minus]");
    if (minus) updateCartItem(Number(minus.dataset.cartMinus), -1);
    const plus = event.target.closest("[data-cart-plus]");
    if (plus) updateCartItem(Number(plus.dataset.cartPlus), 1);
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
      const cart = readCart();
      cart.splice(Number(remove.dataset.cartRemove), 1);
      saveCart(cart);
    }
    if (event.target.closest("[data-clear-cart]")) saveCart([]);
    if (event.target.closest("[data-send-whatsapp]")) sendWhatsapp();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAll();
    if ((event.key === "Enter" || event.key === " ") && document.activeElement?.matches(".product-card")) {
      event.preventDefault();
      openProduct(document.activeElement.dataset.productOpen, document.activeElement);
    }
  });

  $("[data-qty-input]")?.addEventListener("change", (event) => {
    event.target.value = Math.max(1, Number(event.target.value) || 1);
  });
}

function revealOnScroll() {
  const targets = $$(".product-card, .difference-card, .steps article");
  if (!("IntersectionObserver" in window)) return targets.forEach((el) => el.classList.add("revealed"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach((el) => observer.observe(el));
}

function setupAutoHideHeader() {
  const header = $(".topbar");
  if (!header) return;

  const revealAt = 90;
  const directionThreshold = 6;
  let lastScrollY = Math.max(window.scrollY, 0);
  let ticking = false;

  function updateHeader() {
    const currentScrollY = Math.max(window.scrollY, 0);
    const scrollDelta = currentScrollY - lastScrollY;

    if (currentScrollY <= revealAt) {
      header.classList.remove("is-hidden");
      lastScrollY = currentScrollY;
    } else if (scrollDelta >= directionThreshold) {
      header.classList.add("is-hidden");
      lastScrollY = currentScrollY;
    } else if (scrollDelta <= -directionThreshold) {
      header.classList.remove("is-hidden");
      lastScrollY = currentScrollY;
    }

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });

  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
}

renderProducts();
renderCart();
bindEvents();
revealOnScroll();
setupAutoHideHeader();
$("#ano-atual").textContent = new Date().getFullYear();

if (location.hash && getProduct(location.hash.slice(1))) {
  setTimeout(() => openProduct(location.hash.slice(1)), 250);
}
