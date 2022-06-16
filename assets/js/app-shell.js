// @ts-ignore
import {} from 'https://unpkg.com/@re4ma/re4ma@0.1.7/build/re4ma.js';

import { BaseComponent } from '../../submodules/symbiote/core/BaseComponent.js';
import { initStyles, SHELL_CSS } from './styles.js';

import { LiveHtml } from '../../blocks/LiveHtml/LiveHtml.js';
LiveHtml.reg('lr-live-html');

initStyles(() => {
  document.body.removeAttribute('unresolved');
});

class AppShell extends BaseComponent {
  init$ = {
    base: './',
    heading: '🟡 Uploadcare | blocks',
    copy: '© 2022 🦆',
  };

  initCallback() {
    this.sub('base', (base) => {
      if (!base) {
        return;
      }
      [...this.ref.links.querySelectorAll('a')].forEach((a) => {
        let href = a.getAttribute('href');
        if (!href.includes('//')) {
          a.href = base + href;
        }
      });
    });
  }
}

AppShell.shadowStyles = SHELL_CSS;

AppShell.template = /*html*/ `
<header>{{heading}}</header>
<nav>
  <div ref="links">
    <a href="">Home</a>
    <a href="blocks/">Blocks</a>
    <a href="solutions/">Solutions</a>
    <a href="toc.html">TOC</a>
    <a href="//github.com/uploadcare/uc-blocks/discussions">Discussions</a>
  </div>
</nav>
<main>
  <col-css>
    <slot></slot>
  </col-css>
</main>
<footer>{{copy}}</footer>
`;
AppShell.bindAttributes({
  base: 'base',
});
AppShell.reg('app-shell');
