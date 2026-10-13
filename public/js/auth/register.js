/* ============================================================
   auth/register.js — Registration screen
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});
  const CONFIG = EH.CONFIG || {};

  function render() {
    EH.state.appPhase = 'register';
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <main class="auth-page">
        <section class="auth-card auth-card-wide">
          <header class="auth-header">
            <div class="auth-logo"><i class="fas fa-user-plus"></i></div>
            <h1 class="auth-title">Create your <span class="auth-title-accent">account</span></h1>
            <p class="auth-subtitle">Learners are auto-approved. Experts and institutions need admin approval.</p>
          </header>

          <form id="registerForm" class="auth-form" novalidate>
            <div class="role-picker" role="tablist">
              <button type="button" data-role="learner" class="role-pick role-pick-active" role="tab">Learner</button>
              <button type="button" data-role="expert" class="role-pick" role="tab">Expert</button>
              <button type="button" data-role="institution" class="role-pick" role="tab">Institution</button>
            </div>

            <label class="form-group"><span class="form-label">Full name *</span>
              <input id="regName" name="name" required class="form-input" placeholder="Jane Doe" /></label>
            <label class="form-group"><span class="form-label">Email *</span>
              <input id="regEmail" name="email" type="email" required class="form-input" placeholder="you@example.com" /></label>
            <label class="form-group"><span class="form-label">Phone (optional)</span>
              <input id="regPhone" name="phone" class="form-input" placeholder="+254..." /></label>
            <label class="form-group">
              <span class="form-label">Password *</span>
              <input id="regPassword" name="password" type="password" required class="form-input"
                     placeholder="Minimum 8 characters" autocomplete="new-password" />
              <div class="progress-bar"><span id="pwdBar"></span></div>
              <p id="pwdHint" class="form-hint"></p>
            </label>
            <label class="form-group">
              <span class="form-label">Confirm password *</span>
              <input id="regPassword2" type="password" required class="form-input" autocomplete="new-password" /></label>

            <div id="expertExtra" class="hidden form-grid-full">
              <label class="form-group"><span class="form-label">Specialization</span>
                <input id="regSpec" class="form-input" placeholder="e.g. Data Science" /></label>
              <label class="form-group"><span class="form-label">Hourly rate ($)</span>
                <input id="regRate" type="number" class="form-input" placeholder="50" min="0" /></label>
              <label class="form-group form-group-full"><span class="form-label">Short bio</span>
                <textarea id="regBio" class="form-textarea" rows="3"></textarea></label>
            </div>

            <div id="institutionExtra" class="hidden form-grid-full">
              <label class="form-group"><span class="form-label">Institution name</span>
                <input id="regInstName" class="form-input" placeholder="Acme Corp Academy" /></label>
              <label class="form-group">
                <span class="form-label">Institution type</span>
                <select id="regInstType" class="form-select">
                  ${(CONFIG.INSTITUTION_TYPES || []).map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
              </label>
              <label class="form-group"><span class="form-label">Industry / Sector</span>
                <input id="regInstIndustry" class="form-input" placeholder="e.g. Banking, Healthcare" /></label>
              <label class="form-group"><span class="form-label">Operations manager email</span>
                <input id="regInstOpsEmail" type="email" class="form-input" placeholder="ops@acme.com" /></label>
            </div>

            <label class="checkbox-row">
              <input type="checkbox" id="regTerms" /> I agree to the Terms and Privacy Policy
            </label>

            <button type="submit" class="btn btn-primary btn-block" id="regSubmit">Create account</button>
          </form>

          <p class="auth-footer">Already have an account? <a href="#/login" class="link">Sign in</a></p>
          <p class="auth-footer" style="margin-top:6px">
            <a href="#/" class="link"><i class="fas fa-arrow-left"></i> Back to home</a></p>
        </section>
      </main>`;

    bindEvents();
  }

  function bindEvents() {
    let activeRole = 'learner';

    document.querySelectorAll('.role-pick').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('.role-pick').forEach(x => x.classList.remove('role-pick-active'));
        b.classList.add('role-pick-active');
        activeRole = b.dataset.role;
        document.getElementById('expertExtra').classList.toggle('hidden', activeRole !== 'expert');
        document.getElementById('institutionExtra').classList.toggle('hidden', activeRole !== 'institution');
      };
    });

    const pwd = document.getElementById('regPassword');
    pwd.addEventListener('input', (e) => {
      const score = EH.Validation.passwordScore(e.target.value);
      document.getElementById('pwdBar').style.width = (score * 25) + '%';
      document.getElementById('pwdHint').textContent = EH.Validation.passwordLabel(score);
    });

    const form = document.getElementById('registerForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submit = document.getElementById('regSubmit');

      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const password2 = document.getElementById('regPassword2').value;
      const terms = document.getElementById('regTerms').checked;

      if (!name || !email || !password) return EH.Toast.error('Fill required fields');
      if (!EH.Validation.isEmail(email)) return EH.Toast.error('Enter a valid email');
      if (password.length < 8) return EH.Toast.error('Password must be at least 8 characters');
      if (password !== password2) return EH.Toast.error('Passwords do not match');
      if (!terms) return EH.Toast.error('Accept the terms to continue');

      const extra = activeRole === 'expert'
        ? {
            specialization: document.getElementById('regSpec').value,
            hourly_rate: Number(document.getElementById('regRate').value || 0),
            bio: document.getElementById('regBio').value,
          }
        : activeRole === 'institution'
        ? {
            institution_name: document.getElementById('regInstName').value,
            institution_type: document.getElementById('regInstType').value,
            industry: document.getElementById('regInstIndustry').value,
            ops_manager_email: document.getElementById('regInstOpsEmail').value,
          }
        : {};

      try {
        EH.Loading.button(submit, true);
        EH.Loading.show();
        await EH.Auth.register({ name, email, password, phone, role: activeRole, extra });
        if (activeRole === 'learner') {
          EH.Toast.success('Account created! Please sign in.');
          location.hash = '#/login';
        } else if (activeRole === 'institution') {
          EH.Toast.info('Institution registered. Awaiting admin verification.', 6000);
        } else {
          EH.Toast.info('Awaiting admin approval before you can log in.', 6000);
        }
      } catch (ex) {
        EH.Toast.error(EH.Errors.friendlyMessage(ex));
      } finally {
        EH.Loading.hide();
        EH.Loading.button(submit, false);
      }
    };
  }

  EH.RegisterView = { render };
  global.renderRegister = render;
})(window);
