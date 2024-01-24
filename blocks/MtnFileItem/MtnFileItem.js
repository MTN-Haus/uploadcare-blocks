// @ts-check
import { Block } from '../../abstract/Block.js';

export class MtnFileItem extends Block {
  constructor() {
    super();

    this.init$ = {
      ...this.init$,
    };
  }
}

MtnFileItem.template = /*html*/ `
  <div class="mtn-files-item"><img src="{{cdnURL}}" /></div>
`;
