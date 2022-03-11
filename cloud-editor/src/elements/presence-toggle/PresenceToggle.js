import { BlockComponent } from '@uploadcare/upload-blocks';
import { applyClassNames } from '../../lib/classNames.js';

const DEFAULT_STYLE = {
  transition: 'transition',
  visible: 'visible',
  hidden: 'hidden',
};

export class PresenceToggle extends BlockComponent {
  constructor() {
    super();

    this._visible = false;
    this._visibleStyle = DEFAULT_STYLE.visible;
    this._hiddenStyle = DEFAULT_STYLE.hidden;
    this._externalTransitions = false;

    this.defineAccessor('visible', (visible) => {
      if (typeof visible !== 'boolean') {
        return;
      }

      this._visible = visible;
      this._handleVisible();
    });

    this.defineAccessor('styles', (styles) => {
      if (!styles) {
        return;
      }
      this._externalTransitions = true;
      this._visibleStyle = styles.visible;
      this._hiddenStyle = styles.hidden;
    });
  }

  _handleVisible() {
    this.style.visibility = this._visible ? 'inherit' : 'hidden';
    applyClassNames(this, {
      [DEFAULT_STYLE.transition]: !this._externalTransitions,
      [this._visibleStyle]: this._visible,
      [this._hiddenStyle]: !this._visible,
    });
    this.setAttribute('aria-hidden', this._visible ? 'true' : 'false');
  }

  initCallback() {
    super.initCallback();

    if (!this._externalTransitions) {
      this.classList.add(DEFAULT_STYLE.transition);
    }

    this._handleVisible();
  }
}
PresenceToggle.template = /*html*/ `
<slot></slot>
`;
