/* ============================================================
   public/data/categories.js — Course / event categories
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Categories = [
    { id: 'technology',   name: 'Technology',    icon: 'fa-laptop-code', color: '#1e3a8a' },
    { id: 'business',     name: 'Business',      icon: 'fa-briefcase',   color: '#7c3aed' },
    { id: 'design',       name: 'Design',        icon: 'fa-palette',     color: '#ec4899' },
    { id: 'marketing',    name: 'Marketing',     icon: 'fa-bullhorn',    color: '#f59e0b' },
    { id: 'data',         name: 'Data Science',  icon: 'fa-chart-line',  color: '#059669' },
    { id: 'languages',    name: 'Languages',     icon: 'fa-language',    color: '#0891b2' },
    { id: 'health',       name: 'Health',        icon: 'fa-heart-pulse', color: '#dc2626' },
    { id: 'engineering',  name: 'Engineering',   icon: 'fa-gears',       color: '#475569' },
  ];

  EH.PublicCategories = Categories;
})(window);
