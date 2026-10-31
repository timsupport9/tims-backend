const required = [
  'openInstitutionModal',
  'openChat', 'closeChat', 'sendMessage',
  'openCourseDetailModal', 'openCoursePlayer',
  'saveAvailability', 'requestTimeOff', 'requestWithdrawal', 'updateExpertProfile',
];
required.forEach(fn =>
  console.log(`${typeof window[fn] === 'function' ? '✅' : '❌'} ${fn}`)
);
