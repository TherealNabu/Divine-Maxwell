document.addEventListener('DOMContentLoaded', function () {
  const overlay = document.getElementById('custom-popup-overlay');
  const popupContent = document.getElementById('custom-popup-content');
  const closeBtn = document.getElementById('custom-popup-close');
  const hotspots = document.querySelectorAll('.custom-grid__item');

  let currentProduct = null;
  let selectedOptions = {};

  hotspots.forEach(function (item) {
    const button = item.querySelector('.custom-grid__hotspot');
    button.addEventListener('click', function () {
      const handle = item.getAttribute('data-product-handle');
      openPopup(handle);
    });
  });

  closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closePopup();
  });

  function closePopup() {
    overlay.classList.remove('active');
    currentProduct = null;
    selectedOptions = {};
  }

  function openPopup(handle) {
    fetch('/products/' + handle + '.js')
      .then(function (res) { return res.json(); })
      .then(function (product) {
        currentProduct = product;
        selectedOptions = {};
        renderPopup(product);
        overlay.classList.add('active');
      })
      .catch(function (err) {
        console.error('Failed to load product:', err);
      });
  }

  function renderPopup(product) {
    let optionsHtml = '';

    product.options.forEach(function (optionName, index) {
      const optionKey = 'option' + (index + 1);
      const values = [];
      product.variants.forEach(function (variant) {
        const val = variant[optionKey];
        if (val && values.indexOf(val) === -1) values.push(val);
      });

      optionsHtml += '<div class="custom-popup__option">';
      optionsHtml += '<span class="custom-popup__option-label">' + optionName + '</span>';
      optionsHtml += '<div class="custom-popup__option-values" data-option-index="' + index + '">';
      values.forEach(function (val) {
        optionsHtml += '<div class="custom-popup__option-value" data-value="' + val + '">' + val + '</div>';
      });
      optionsHtml += '</div></div>';
    });

    popupContent.innerHTML =
      '<img class="custom-popup__image" src="' + (product.featured_image || '') + '" alt="' + product.title + '">' +
      '<div class="custom-popup__title">' + product.title + '</div>' +
      '<div class="custom-popup__price" id="custom-popup-price">' + formatMoney(product.price) + '</div>' +
      '<div class="custom-popup__description">' + stripHtml(product.description) + '</div>' +
      optionsHtml +
      '<button class="custom-popup__add-to-cart" id="custom-popup-add-btn" disabled>Add to Cart</button>';

    attachOptionListeners(product);
    document.getElementById('custom-popup-add-btn').addEventListener('click', handleAddToCart);
  }

  function attachOptionListeners(product) {
    const groups = popupContent.querySelectorAll('.custom-popup__option-values');
    groups.forEach(function (group) {
      const index = group.getAttribute('data-option-index');
      const values = group.querySelectorAll('.custom-popup__option-value');
      values.forEach(function (valEl) {
        valEl.addEventListener('click', function () {
          values.forEach(function (v) { v.classList.remove('selected'); });
          valEl.classList.add('selected');
          selectedOptions['option' + (parseInt(index) + 1)] = valEl.getAttribute('data-value');
          updateVariantState(product);
        });
      });
    });
  }

  function updateVariantState(product) {
    const matchedVariant = findMatchingVariant(product);
    const addBtn = document.getElementById('custom-popup-add-btn');
    const priceEl = document.getElementById('custom-popup-price');

    const allOptionsSelected = product.options.length === Object.keys(selectedOptions).length;

    if (matchedVariant && allOptionsSelected) {
      addBtn.disabled = !matchedVariant.available;
      addBtn.textContent = matchedVariant.available ? 'Add to Cart' : 'Sold Out';
      priceEl.textContent = formatMoney(matchedVariant.price);
    } else {
      addBtn.disabled = true;
      addBtn.textContent = 'Select options';
    }
  }

  function findMatchingVariant(product) {
    return product.variants.find(function (variant) {
      return Object.keys(selectedOptions).every(function (key) {
        return variant[key] === selectedOptions[key];
      });
    });
  }

  function handleAddToCart() {
    const variant = findMatchingVariant(currentProduct);
    if (!variant) return;

    const items = [{ id: variant.id, quantity: 1 }];

    const isBlackMedium = Object.values(selectedOptions).indexOf('Black') !== -1 &&
                           Object.values(selectedOptions).indexOf('Medium') !== -1;

    if (isBlackMedium) {
      fetch('/products/dark-winter-jacket.js')
        .then(function (res) { return res.json(); })
        .then(function (jacketProduct) {
          const defaultVariant = jacketProduct.variants[0];
          items.push({ id: defaultVariant.id, quantity: 1 });
          submitCart(items);
        })
        .catch(function () {
          submitCart(items);
        });
    } else {
      submitCart(items);
    }
  }

  function submitCart(items) {
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items })
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        closePopup();
        window.location.href = '/cart';
      })
      .catch(function (err) {
        console.error('Add to cart failed:', err);
      });
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
});
