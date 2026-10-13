/* ============================================================
   actions/institution-actions.js — Institution-specific actions
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const Actions = {
    async saveBranding() {
      const fd = new FormData();
      const logo = document.getElementById('brandLogo');
      if (logo && logo.files[0]) fd.append('logo', logo.files[0]);
      fd.append('primary_color',  document.getElementById('brandPrimary').value || '');
      fd.append('accent_color',   document.getElementById('brandAccent').value || '');
      fd.append('subdomain',      document.getElementById('brandSubdomain').value || '');
      fd.append('email_sender_name',    document.getElementById('brandEmailName').value || '');
      fd.append('email_sender_address', document.getElementById('brandEmailAddr').value || '');
      fd.append('welcome_message',      document.getElementById('brandWelcome').value || '');
      try {
        EH.Loading.show();
        await EH.API.upload('/api/institution/branding', fd);
        await EH.Data.loadAll();
        const primary = document.getElementById('brandPrimary').value;
        const accent  = document.getElementById('brandAccent').value;
        if (primary) document.documentElement.style.setProperty('--brand', primary);
        if (accent)  document.documentElement.style.setProperty('--accent', accent);
        EH.NavigationActions.switchTab('branding');
        EH.Toast.success('Branding saved');
      } catch (e) { EH.Toast.error(e.message); }
      finally { EH.Loading.hide(); }
    },

    async saveSettings() {
      try {
        await EH.API.put('/api/institution/settings', {
          name:             document.getElementById('instSetName').value,
          contact_email:    document.getElementById('instSetEmail').value,
          default_capacity: Number(document.getElementById('instSetCap').value),
          pass_mark:        Number(document.getElementById('instSetPass').value),
          seat_allocation:  Number((document.getElementById('instSetSeats') || {}).value || 0),
          billing_cycle:    (document.getElementById('instSetBilling') || {}).value || 'monthly',
          contract_start:   (document.getElementById('instSetContractStart') || {}).value || null,
          contract_end:     (document.getElementById('instSetContractEnd') || {}).value || null,
        });
        EH.Toast.success('Settings saved');
      } catch (e) { EH.Toast.error(e.message); }
    },
  };

  EH.BrandingActions = Actions;
})(window);
