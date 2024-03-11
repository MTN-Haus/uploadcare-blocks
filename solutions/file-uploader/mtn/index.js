// {% comment %}
// ### use in cart:
//   {% if item.properties.__image_previews != blank %}
//     <div class="uploadcare-cart-previews" data-gal-previews='{{ item.properties.__image_previews }}'></div>
//   {% elsif item.image %}
// ### in js on cart update:
//   window.dispatchEvent(new Event('uploadcare:cart-update'));
// {% endcomment %}

import * as LR from '../../../index.js';

const URL = import.meta.url;
const PATH = URL.substring(0, URL.lastIndexOf('/'));
const CSS_PATH = URL.substring(0, URL.lastIndexOf('/')) + '/lr-file-uploader-mtn.min.css';

document.addEventListener('DOMContentLoaded', () => {
  const upload = new MTNUploadCare({
    uploader: 'pdp-uploadcare-uploader',
    imageboxPdp: 'pdp-uploadcare-imagebox',
    imageBoxCart: 'cart-uploadcare-imagebox',
  });
});

class MTNUploadCare {
  constructor(attrs) {
    this.body = document.body;

    this.config = { ...window.UploadCareLocalSettings };
    this.checkDefault();

    this.addCss();
    if (this.config.variant_id !== 0) {
      this.quantityWatcher();
      this.addUploaderBox();

      this.uploader = document.querySelector(`.${attrs.uploader}`);
      this.form = this.uploader.closest('form[action="/cart/add"]');
      this.quantityEl = this.uploader.closest('product-info').querySelector('.quantity__input');
      this.btnsContainer;
      this.imageBoxCarts = document.querySelectorAll(`.${attrs.imageBoxCart}`);

      this.state = {
        atcBtns: 'enabled',
      };
      this.addUploader();

      this.hideAtcBtns();
      this.onUpload();
      this.initUploadCare();
    }

    this.productFormWatcher();
    this.updateCartPreviews();
  }

  addCss() {
    document.head.insertAdjacentHTML('beforeend', `<link typs="text/css" rel="stylesheet" href="${CSS_PATH}">`);
  }

  watchCartDrawer() {
    const config = {
      subtree: true,
    };

    const cartDrawerBox = document.querySelector(this.config.cart_items_selector);

    const callback = (mutationList) => {
      for (const mutation of mutationList) {
        this.updateCartPreviews();
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(cartDrawerBox, config);
  }

  checkDefault() {
    const def = {
      pubkey: '',
      action: '',
      ctx_name: 'lr-wgt-common',
      multiple_min: 2,
      multiple_max: 2,
      accent_color: '#ff0000', // HEX only
      crop_preset: '1:1', // '100:230' ('width:height') or ''
      atc_form_btns_selector: '', // selector
      hide_atc_form_btns: true,
      btn_width: '100%',
      btn_padding: '20px 30px 20px 30px',
      btn_margin: '10px 0 1em 0',
      btn_background: '#ffffff',
      btn_hover_background: '#909090',
      btn_border: '1px solid #000',
      btn_hover_border: '1px solid #000',
      btn_border_radius: '0px',
      image_shape: 'square',
      upload_images_messsage: 'Please, upload images first',
      thumb_size: 800,
      cart_items_selector: '.cart-items',
      atc_btns_selectors: '', // will be disabled
      variant_id: 0,
      accept_message: `
        <h3>Click pictures to resize or crop</h3>
        <p class="accept-message__icon accept-message__icon--2">Area beyond the dotted lines will wrap around the edges of your magnets</p>
        <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
      `,
      providers: 'local, instagram, gphotos, instagram', // url, camera, dropbox, facebook, gdrive, gphotos, instagram
    };

    Object.keys(def).forEach((key) => {
      this.config[key] = this.config[key] || def[key];
    });

    window.UploadCareLocalSettings = { ...this.config };
  }

  addUploaderBox() {
    const atcBtnsBox = document.querySelector(this.config.atc_form_btns_selector);
    const uploaderBox = document.createElement('div');
    uploaderBox.classList.add('pdp-uploadcare-uploader');

    atcBtnsBox.parentElement.insertBefore(uploaderBox, atcBtnsBox);
  }

  hideAtcBtns() {
    if (this.config.hide_atc_form_btns && document.querySelector(this.config.atc_form_btns_selector)) {
      document.querySelector(this.config.atc_form_btns_selector).style.display = 'none';
    }
  }

  addUploader() {
    this.uploader.innerHTML = `
      <div class="uploadcare-wrapper">

        <div class="uploadcare-inner lr-wgt-common">
          <lr-config
            pubkey="${this.config.pubkey}"
            ctx-name="${this.config.ctx_name}"
            max-local-file-size-bytes="10000000"
            img-only="true"
            multiple-max="${this.config.multiple_max}"
            multiple-min="${this.config.multiple_min}" 
            useCloudImageEditor="true"
            cropPreset="${this.config.crop_preset}"
            thumbSize="${this.config.thumb_size}"
            removeCopyright="true"
            confirmUpload="false"
            debug="true"
            source-list="${this.config.providers}"
          ></lr-config>

          <lr-file-uploader-regular
            ctx-name="${this.config.ctx_name}"
            css-src="${CSS_PATH}"
            >
          </lr-file-uploader-regular>
          
          <lr-data-output 
            ctx-name="${this.config.ctx_name}"
            use-console use-input use-group use-event
          ></lr-data-output>

          <div class="uploadcare-line-items"></div>
        </div>
      </div>
    `;
  }

  quantityWatcher() {
    if (this.quantityEl) {
      this.quantityEl.addEventListener('change', () => {
        window.UploadCareLocalSettings.quantity = this.quantityEl.value;
      });
    }
  }

  onUpload() {
    const dataOutputs = document.querySelectorAll('lr-data-output');
    dataOutputs.forEach((dataOutput) => {
      const lineItemsBox = dataOutput.parentElement.querySelector('.uploadcare-line-items');

      dataOutput.addEventListener('lr-data-output', (e) => {
        const group = e.detail?.data?.groupData;
        const files = e.detail?.data?.files;

        let previews = [];
        let lineItems = '';
        let lineItemsJson = {};

        if (files)
          files.forEach((file) => {
            previews.push(file.cdnUrl);
          });

        if (group) {
          // lineitems (hidden)
          lineItems += `
            <p class="line-item-property__field">
              <input id="__image_group" type="hidden" name="properties[_image_group]" value="${group.cdnUrl}">
              <input id="__image_group_id" type="hidden" name="properties[_image_group_id]" value="${group.uuid}">
              <input id="__image_previews" type="hidden" name="properties[_image_previews]" value='${JSON.stringify(
                previews
              )}'>
            </p>
            `;
          lineItemsJson = {
            __image_group: group.cdnUrl,
            __image_group_id: group.uuid,
            __image_previews: JSON.stringify(previews),
          };

          lineItemsBox.innerHTML = lineItems;
        }

        window.UploadCareLocalSettings.lineItemsJson = lineItemsJson;

        if (group && +this.config.multiple_min <= +group.filesCount && +group.filesCount <= +this.config.multiple_max) {
          this.toggleATCBtns(true, dataOutput.closest('form[action="/cart/add"]'));
        } else {
          this.toggleATCBtns(false, dataOutput.closest('form[action="/cart/add"]'));
        }
      });
    });
  }

  toggleATCBtns(show, form) {
    if (this.config.hide_atc_form_btns) {
      form.querySelectorAll(this.config.atc_btns_selectors).forEach((btn) => {
        if (show) {
          this.state.atcBtns = 'enabled';
          btn.removeAttribute('disabled');
          this.btnsContainer.dispatchEvent(new Event('mouseover'));
        } else {
          this.state.atcBtns = 'disabled';
          btn.setAttribute('disabled', 'disabled');
          btn.style.display = 'none';
        }
      });
    }
  }

  productFormWatcher() {
    window.addEventListener('uploadcare:cart-update', (e) => {
      this.updateCartPreviews();
    });
  }

  updateCartPreviews() {
    const previewBoxes = document.querySelectorAll('.uploadcare-cart-previews');

    previewBoxes.forEach((previewBox) => {
      let markup = '';

      const imageUrls = JSON.parse(previewBox.dataset.galPreviews);
      imageUrls.forEach((imageUrl, i) => {
        markup += `<img src='${imageUrl}' alt='Preview image #${i + 1}' />`;
      });
      previewBox.innerHTML = markup;
    });
  }

  initUploadCare() {
    const imageShapeRadius = this.config.image_shape == 'circle' ? '50%' : '0';

    LR.FileUploaderRegular.shadowStyles = `
      :where(.lr-wgt-theme,.lr-wgt-common), :host {
        --darkmode: 0;
        --ctx-name: '${this.config.ctx_name}';
        --cfg-pubkey: '${this.config.pubkey}';
        --h-accent: ${hexToHSL(this.config.accent_color).h} !important;
        --s-accent: ${hexToHSL(this.config.accent_color).s}% !important;
        --l-accent: ${hexToHSL(this.config.accent_color).l}% !important;
        --image-shape-radius: ${imageShapeRadius};
        --accept-message: "${JSON.stringify(this.config.accept_message)}";
      }

      :host lr-simple-btn button {
        letter-spacing: .1rem;
        padding-right: 0;
        width: ${this.config.btn_width};
        background: ${this.config.btn_background};
        padding: ${this.config.btn_padding};
        margin: ${this.config.btn_margin};
        border: ${this.config.btn_border};
        border-radius: ${this.config.btn_border_radius};
      }

      :host lr-simple-btn button:hover {
        background: ${this.config.btn_hover_background};
        border: ${this.config.btn_hover_border};
      }

      lr-simple-btn {
        width: ${this.config.btn_width};
      }

      `;

    LR.registerBlocks(LR);
  }
}

function hexToHSL(H) {
  // Convert hex to RGB first
  let r = 0;
  let g = 0;
  let b = 0;
  if (H.length == 4) {
    r = `0x${H[1]}${H[1]}`;
    g = `0x${H[2]}${H[2]}`;
    b = `0x${H[3]}${H[3]}`;
  } else if (H.length == 7) {
    r = `0x${H[1]}${H[2]}`;
    g = `0x${H[3]}${H[4]}`;
    b = `0x${H[5]}${H[6]}`;
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;
  let l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

export * from '../../../index.js';
