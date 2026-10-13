/* ============================================================
   public/routing/public-routes.js — Public route table
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PublicRoutes = [
    { path: '#/',                handler: () => EH.Landing?.render() },
    { path: '#/courses',         handler: () => EH.CoursesPage?.render() },
    { path: '#/experts',         handler: () => EH.ExpertsPage?.render() },
    { path: '#/events',          handler: () => EH.EventsPage?.render() },
    { path: '#/resources',       handler: () => EH.ResourcesPage?.render() },
    { path: '#/institutions',    handler: () => EH.InstitutionsPage?.render() },
    { path: '#/about',           handler: () => EH.AboutPage?.render() },
    { path: '#/contact',         handler: () => EH.ContactPage?.render() },
  ];

  const DynamicRoutes = [
    { pattern: /^#\/course\/(.+)$/, handler: (m) => EH.CourseDetailPage?.render(m[1]) },
    { pattern: /^#\/expert\/(.+)$/, handler: (m) => EH.ExpertDetailPage?.render(m[1]) },
    { pattern: /^#\/event\/(.+)$/,  handler: (m) => EH.EventDetailPage?.render(m[1]) },
  ];

  EH.PublicRoutes = { PublicRoutes, DynamicRoutes };
})(window);
