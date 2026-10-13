/* ============================================================
   public/data/navigation.js — Public site navigation structure
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Navigation = {
    primary: [
      { label: 'Courses',   href: '#/courses' },
      { label: 'Experts',   href: '#/experts' },
      { label: 'Events',    href: '#/events' },
      { label: 'Resources', href: '#/resources' },
      { label: 'Institutions', href: '#/institutions' },
      { label: 'About',     href: '#/about' },
      { label: 'Contact',   href: '#/contact' },
    ],
    footer: {
      Platform: [
        { label: 'Courses',   href: '#/courses' },
        { label: 'Experts',   href: '#/experts' },
        { label: 'Events',    href: '#/events' },
        { label: 'Resources', href: '#/resources' },
      ],
      Company: [
        { label: 'About',     href: '#/about' },
        { label: 'Contact',   href: '#/contact' },
        { label: 'Institutions', href: '#/institutions' },
      ],
      Account: [
        { label: 'Sign in',  href: '#/login' },
        { label: 'Register', href: '#/register' },
      ],
    },
  };

  EH.PublicNav = Navigation;
})(window);
