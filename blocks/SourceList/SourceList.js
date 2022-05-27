import { Block } from '../../abstract/Block.js';

export class SourceList extends Block {
  initCallback() {
    super.initCallback();
    this.bindCssData('--cfg-source-list');
    this.sub('*--cfg-source-list', (val) => {
      if (!val) {
        return;
      }
      let list = val.split(',').map((srcName) => {
        return srcName.trim();
      });
      let html = '';
      list.forEach((srcName) => {
        html += /*html*/ `<lr-source-btn type="${srcName}"></lr-source-btn>`;
      });
      if (this.getCssData('--cfg-source-list-wrap')) {
        this.innerHTML = html;
      } else {
        this.outerHTML = html;
      }
    });
  }
}
