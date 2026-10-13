/* ============================================================
   public/data/public-config.js — Marketing site configuration
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const PublicConfig = {
    brand: {
      name: 'ExpertHub',
      tagline: 'Learn, consult and grow with real experts',
      description: 'E-School, 1-on-1 consultations and corporate training in one modern platform.',
      logo: '/assets/img/logo.svg',
      supportEmail: 'support@experthub.com',
      salesEmail: 'sales@experthub.com',
      phone: '+254 700 000 000',
    },

    stats: {
      learners: '2k+',
      experts: '150+',
      rating: '4.9 / 5',
      countries: '12',
    },

    pricing: {
      learner: {
        title: 'Free',
        price: '$0',
        period: '/mo',
        badge: 'Learner',
        features: [
          'Browse all courses',
          '1 free consultation per month',
          'Community access',
          'Progress tracking',
        ],
        cta: 'Get started',
        ctaAction: '#/register',
      },
      expert: {
        title: 'Pro',
        price: '20%',
        period: ' commission',
        badge: 'Expert',
        featured: true,
        features: [
          'Create unlimited courses',
          'Accept consultations',
          'Instant payouts (7-day hold)',
          'Priority support',
        ],
        cta: 'Become an expert',
        ctaAction: '#/register',
      },
      institution: {
        title: 'Institution',
        price: "Let's talk",
        period: '',
        badge: 'Enterprise',
        features: [
          'Team accounts and ops manager',
          'Programmes, cohorts and trainees',
          'Assessments and capstone projects',
          'Custom branding and SSO',
        ],
        cta: 'Register institution',
        ctaAction: '#/register',
      },
    },

    testimonials: [
      {
        text: 'ExpertHub helped me switch careers in 6 months. The bootcamp was intense but amazing.',
        name: 'Jane D.',
        role: 'Software Engineer',
        avatarBg: '1e3a8a',
      },
      {
        text: 'As an expert, I doubled my income in 3 months. The platform handles payments automatically.',
        name: 'Dr. Sarah K.',
        role: 'Data Science Expert',
        avatarBg: '059669',
      },
      {
        text: 'We run 12 cohorts a year through ExpertHub. Trainee tracking and assessments just work.',
        name: 'Acme Academy',
        role: 'Corporate Training',
        avatarBg: '6d28d9',
      },
    ],

    faq: [
      ['How does registration work?', 'Learners are approved instantly. Experts and institutions require admin approval.'],
      ['What is the platform commission?', 'We charge a flat 20% commission on all course sales and consultations.'],
      ['How long do payouts take?', 'Withdrawals have a 7-day holding period, then process within 3 to 5 business days.'],
      ['Can I switch from learner to expert?', 'Yes. Apply to become an expert from your dashboard. Our team reviews each application.'],
      ['Do you support corporate training?', 'Yes. Institutions get programmes, cohorts, assessments, projects, certifications and compliance tracking.'],
    ],

    features: [
      { icon: 'fa-graduation-cap', title: 'Learn anything',
        desc: 'Bootcamps, short courses, tuition and exam prep curated by experts.' },
      { icon: 'fa-user-tie', title: 'Teach and earn', color: '#10b981,#059669',
        desc: 'Experts get verified, manage consultations and withdraw earnings.' },
      { icon: 'fa-comments', title: 'Real-time chat', color: '#f59e0b,#d97706',
        desc: 'Live messaging, attachments, typing indicator and video calls.' },
      { icon: 'fa-building-columns', title: 'Corporate training', color: '#8b5cf6,#6d28d9',
        desc: 'Programmes, cohorts, assessments, certifications and compliance.' },
      { icon: 'fa-shield-halved', title: 'Admin controlled', color: '#ef4444,#b91c1c',
        desc: 'Approvals, moderation, payouts and full audit logging built in.' },
      { icon: 'fa-chart-line', title: 'Deep analytics', color: '#0ea5e9,#0369a1',
        desc: 'Track progress, scores and completion across all cohorts.' },
    ],
  };

  EH.PublicConfig = PublicConfig;
})(window);
