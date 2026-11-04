import type { StrapiApp } from '@strapi/strapi/admin';
import AuthLogo from './extensions/logo.png';
import MenuLogo from './extensions/menu-logo.png';
import favicon from './extensions/favicon.png';
import ActiveSwitchPanel from './extensions/ActiveSwitchPanel';
import { FONT_LINKS, GLOBAL_CSS, theme } from './extensions/theme';

const CMS_NAME = 'Unimrkt Research CMS';

const copy = {
  'app.components.LeftMenu.navbrand.title': CMS_NAME,
  'app.components.LeftMenu.navbrand.workplace': 'Content workspace',
  'Auth.form.welcome.title': 'Welcome to Unimrkt Research',
  'Auth.form.welcome.subtitle': 'Sign in to manage the Unimrkt website content',
  'Auth.form.button.login.strapi': 'Sign in',
  'HomePage.head.title': 'Dashboard',
  'HomePage.header.title': 'Hello {name}',
  'HomePage.header.subtitle': 'Your Unimrkt content workspace — pages, industries, blogs and applications in one place.',
  'app.components.HomePage.welcome': 'Welcome back',
  'app.components.HomePage.welcome.again': 'Welcome back',
  'app.components.HomePage.welcomeBlock.content': 'Everything you publish here goes live on the Unimrkt Research website.',
  'app.components.HomePage.welcomeBlock.content.again': 'Everything you publish here goes live on the Unimrkt Research website.',
};

export default {
  config: {
    locales: ['en'],
    auth: { logo: AuthLogo },
    menu: { logo: MenuLogo },
    head: { favicon },
    theme,
    translations: { en: copy },
    tutorials: false,
    notifications: { releases: false },
  },

  register(app: StrapiApp) {
    // "Page visibility" ON/OFF switch in the Content Manager's right-hand panel.
    (app.getPlugin('content-manager').apis as { addEditViewSidePanel: (panels: unknown[]) => void }).addEditViewSidePanel([ActiveSwitchPanel]);
  },

  bootstrap(_app: StrapiApp) {
    if (typeof document === 'undefined') return;

    // Fonts + global stylesheet.
    FONT_LINKS.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
    if (!document.getElementById('unimrkt-admin-css')) {
      const style = document.createElement('style');
      style.id = 'unimrkt-admin-css';
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }

    // Document title: every "… | Strapi" / "Strapi Dashboard" becomes "… | Unimrkt Research CMS".
    const retitle = () => {
      const next = document.title.replace(/Strapi( Dashboard)?/g, CMS_NAME);
      if (next !== document.title) document.title = next;
    };
    retitle();
    const titleEl = document.querySelector('title');
    if (titleEl) new MutationObserver(retitle).observe(titleEl, { childList: true, characterData: true, subtree: true });

    // Status pills: the Design System's status chips have no stable class, so tag them by their (translated) text.
    const KIND: Record<string, string> = { published: 'published', draft: 'draft', modified: 'modified' };
    const tagBadges = () => {
      document.querySelectorAll<HTMLElement>('main table tbody td span, main table tbody td p').forEach((el) => {
        if (el.children.length > 0 && el.querySelector('span, p')) return;
        const kind = KIND[(el.textContent ?? '').trim().toLowerCase()];
        if (!kind) return;
        const chip = el.closest<HTMLElement>('[class*="Status"], [class*="Badge"]') ?? el;
        if (!chip.classList.contains('um-badge')) chip.classList.add('um-badge', `um-badge--${kind}`);
      });
    };
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        tagBadges();
      });
    }).observe(document.body, { childList: true, subtree: true });
    tagBadges();
  },
};
