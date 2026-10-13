/* ============================================================
   public/data/fallback-content.js — Offline-safe sample content
   ============================================================ */
(function (global) {
  'use strict';

  const EH = (global.EH = global.EH || {});

  const FallbackContent = {
    courses: [
      {
        id: 'fc-1', title: 'Full-Stack Web Development Bootcamp',
        description: 'Master HTML, CSS, JavaScript, Node.js and React in 12 intensive weeks.',
        course_type: 'bootcamp', level: 'beginner', price: 899, duration_weeks: 12,
        expert_name: 'Jane Mwangi',
      },
      {
        id: 'fc-2', title: 'Data Science with Python',
        description: 'From pandas to machine learning — build real projects.',
        course_type: 'short_course', level: 'intermediate', price: 349, duration_hours: 40,
        expert_name: 'Dr. Sarah K.',
      },
      {
        id: 'fc-3', title: 'IELTS Exam Prep Intensive',
        description: 'Focused preparation for IELTS Academic and General.',
        course_type: 'exam_prep', level: 'intermediate', price: 199, duration_hours: 24,
        expert_name: 'Mr. Peter O.',
      },
    ],
    experts: [
      {
        id: 'fe-1', name: 'Jane Mwangi', specialization: 'Web Development',
        hourly_rate: 45, average_rating: 4.9, bio: 'Senior engineer and bootcamp instructor.',
      },
      {
        id: 'fe-2', name: 'Dr. Sarah K.', specialization: 'Data Science',
        hourly_rate: 60, average_rating: 4.8, bio: 'PhD in Statistics, former lecturer.',
      },
      {
        id: 'fe-3', name: 'Mr. Peter O.', specialization: 'Languages and Exams',
        hourly_rate: 35, average_rating: 4.7, bio: 'Certified IELTS examiner.',
      },
    ],
    events: [
      {
        id: 'ev-1', title: 'Career Fair — Tech and Data',
        description: 'Meet recruiters from 20 companies across tech and data.',
        category: 'career', capacity: 200, registered_count: 87, price: 0,
        date: new Date(Date.now() + 14 * 86400000).toISOString(),
      },
      {
        id: 'ev-2', title: 'AI Ethics Workshop',
        description: 'Hands-on workshop on responsible AI.',
        category: 'workshop', capacity: 60, registered_count: 34, price: 25,
        date: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    ],
    resources: [
      { id: 'r-1', title: 'Career Change Playbook', category: 'Guide' },
      { id: 'r-2', title: 'Study Smarter: 10 Techniques', category: 'Article' },
      { id: 'r-3', title: 'Interview Preparation Checklist', category: 'Checklist' },
    ],
  };

  EH.FallbackContent = FallbackContent;
})(window);
