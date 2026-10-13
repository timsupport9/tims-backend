/* ============================================================
   dashboards/admin/charts.js — Admin chart renderer
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const S = EH.state;

  function render() {
    if (!window.Chart) return;
    renderUserGrowth();
    renderRevenue();
    renderRole();
  }

  function renderUserGrowth() {
    const el = document.getElementById('chartUserGrowth') || document.getElementById('userGrowthChart');
    if (!el || el.dataset.rendered) return;
    const rows = S.analytics?.usersByMonth || [];
    const labels = rows.map(r => r.ym).reverse();
    const data = rows.map(r => Number(r.c)).reverse();
    new Chart(el, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Users',
          data: data.length ? data : [10, 25, 40, 60, 80, 120],
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30,58,138,.12)',
          tension: 0.3,
          fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    el.dataset.rendered = '1';
  }

  function renderRevenue() {
    const el = document.getElementById('chartRevenue') || document.getElementById('revenueChart');
    if (!el || el.dataset.rendered) return;
    const rows = S.analytics?.revenueByMonth || [];
    const labels = rows.map(r => r.ym).reverse();
    const data = rows.map(r => Number(r.total)).reverse();
    new Chart(el, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{
          label: 'Revenue',
          data: data.length ? data : [500, 900, 1200, 1600, 2000, 2800],
          backgroundColor: '#059669',
          borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
    el.dataset.rendered = '1';
  }

  function renderRole() {
    const el = document.getElementById('roleChart');
    if (!el || el.dataset.rendered) return;
    const rows = S.analytics?.usersByRole || [];
    const labels = rows.map(r => r.role);
    const data = rows.map(r => Number(r.c));
    new Chart(el, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Admin','Expert','Institution','Learner'],
        datasets: [{
          data: data.length ? data : [1, 5, 3, 100],
          backgroundColor: ['#dc2626','#059669','#7c3aed','#1e3a8a'],
        }],
      },
      options: { responsive: true },
    });
    el.dataset.rendered = '1';
  }

  EH.AdminCharts = { render };
  global.renderCharts = render;
})(window);
