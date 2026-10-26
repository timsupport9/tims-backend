function renderAdminDashboard() {
  const pending = S.users.filter(u => u.status === 'pending').length;
  const activeCons = S.consultations.filter(c => ['pending','assigned','in_progress'].includes(c.status)).length;
  const openDisputes = (S.consultationDisputes || []).filter(d => ['open','investigating'].includes(d.status)).length;
  const pendingRefunds = (S.userRefunds || []).filter(r => r.status === 'requested').length;

  // Register admin nav from AdminDash registry (if modules loaded)
  if (window.AdminDash && Object.keys(AdminDash.modules).length) {
    // Order is defined by module load order — align with desired sidebar
    const badges = { users: pending, consultations: activeCons, disputes: openDisputes, refunds: pendingRefunds };
    const nav = AdminDash.sidebarItems(badges);
    shell({
      roleClass: 'role-admin',
      brandIcon: 'fa-graduation-cap',
      brandTitle: 'ExpertHub',
      brandSubtitle: 'Admin Panel',
      nav,
      roleLabel: 'Admin Panel',
      content: AdminDash.render(activeTab),
    });
    attachRoleEvents();
    renderCharts();
    return;
  }

  // Fallback (original single-file behavior)
  // ...keep original code...
}

function renderAdminContent() {
  if (window.AdminDash && Object.keys(AdminDash.modules).length) {
    return AdminDash.render(activeTab);
  }
  // Fallback switch (existing)
  switch (activeTab) { /* ... */ }
}
