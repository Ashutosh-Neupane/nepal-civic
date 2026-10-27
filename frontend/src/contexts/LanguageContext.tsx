import { createContext, useContext, useState, type ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'ne';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languageName: string;
  t: (key: string) => string;
  /** Picks the English or Nepali value, for data that carries both (e.g. place names). */
  pick: (en: string, ne?: string | null) => string;
}

const EN: Record<string, string> = {
  // Navigation & General
  appName: 'Nepal Civic',
  appTagline: 'Grievance service of your local government',
  home: 'Home',
  myCases: 'My Cases',
  report: 'Report',
  explore: 'Explore',
  profile: 'Profile',
  dashboard: 'Dashboard',
  complaints: 'Grievances',
  escalations: 'Escalations',
  analytics: 'Analytics',
  alerts: 'Alerts',
  userDirectory: 'Officers',
  mapView: 'Map View',
  logout: 'Log out',
  signIn: 'Sign In',
  saveChanges: 'Save Changes',
  loading: 'Loading...',
  continue: 'Continue',
  back: 'Back',
  viewAll: 'View All',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: 'days ago',
  hoursAgo: 'h ago',
  reported: 'Reported',
  verifiedCitizen: 'Verified Citizen',
  cancel: 'Cancel',
  retry: 'Try again',

  // Roles
  citizen: 'Citizen',
  ward_officer: 'Ward Officer',
  palika_officer: 'Municipal Officer',
  district_officer: 'District Officer',
  province_officer: 'Province Officer',
  super_admin: 'National Administrator',

  // Government levels
  level_ward: 'Ward Office',
  level_palika: 'Municipality',
  level_district: 'District Coordination Committee',
  level_province: 'Province',
  province: 'Province',
  ward: 'Ward',
  palika: 'Municipality / Rural Municipality',

  // Statuses
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  blocked: 'On Hold',
  resolved: 'Resolved',
  escalated: 'Escalated',
  reopened: 'Reopened',
  rejected: 'Rejected',
  closed: 'Closed',

  // Priorities
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',

  // Categories
  roads: 'Roads & Bridges',
  water: 'Drinking Water',
  drainage: 'Drainage',
  sanitation: 'Waste & Sanitation',
  electricity: 'Electricity & Street Lights',
  parks: 'Parks & Public Spaces',
  public_safety: 'Public Safety',
  disaster_mgmt: 'Disaster',
  health: 'Health Services',
  education: 'Schools & Education',
  other: 'Other',

  // Auth
  citizenLogin: 'Citizen',
  officerLogin: 'Government Officer',
  mobileOrEmail: 'Mobile number or email',
  officialEmail: 'Official email',
  password: 'Password',
  forgotPassword: 'Forgot password?',
  noAccount: 'New here?',
  createAccount: 'Create an account',
  haveAccount: 'Already registered?',
  fullName: 'Full name',
  mobileNumber: 'Mobile number',
  sendCode: 'Send code',
  resendCode: 'Send again',
  verificationCode: '6 digit code from SMS',
  codeSent: 'We sent a code to',
  emailOptional: 'Email (optional)',
  passwordRule: 'At least 8 characters, with letters and numbers',
  yourAddress: 'Your address',
  selectProvince: 'Select province',
  selectPalika: 'Select municipality',
  selectWard: 'Select ward',
  resetPassword: 'Reset password',
  newPassword: 'New password',
  officersCreatedByAdmin: 'Officer accounts are created by your Palika, district or province administrator.',

  // Citizen Home Screen
  goodMorning: 'Namaste,',
  officialCitizenRedressal: 'Citizen Grievance Service',
  spottedCivicProblem: 'Seen a problem in your ward?',
  reportPotholesDesc: 'Report broken roads, water supply, waste, street lights or other problems directly to your ward office.',
  fileNewGrievance: 'Register a Grievance',
  activeGrievanceTracking: 'Your Open Grievances',
  viewTimeline: 'View Timeline',
  popularCategories: 'Categories',
  recentGrievances: 'Recent Grievances',

  // My Complaints Screen
  myGrievances: 'My Grievances',
  searchPlaceholder: 'Search by reference, title or category...',
  allCases: 'All',
  inProgressTab: 'In Progress',
  resolvedTab: 'Resolved',
  escalatedTab: 'Escalated',
  noGrievancesFound: 'No grievances found',
  noGrievancesDesc: 'You have not registered any grievances in this category yet.',
  noSearchMatch: 'No grievances match your search.',
  fileAGrievance: 'Register a Grievance',

  // Report Wizard
  step: 'Step',
  of: 'of',
  selectCategory: 'Choose a Category',
  selectCategoryDesc: 'What kind of problem are you reporting?',
  grievanceDetails: 'Grievance Details',
  grievanceDetailsDesc: 'Describe the problem clearly.',
  complaintTitle: 'Title *',
  titlePlaceholder: 'e.g. Drinking water pipe leaking near the chowk',
  detailedDescription: 'Description *',
  descPlaceholder: 'What is the problem, since when, and who is affected?',
  urgencyPriority: 'Urgency',
  grievanceLocation: 'Location',
  locationDesc: 'Choose the ward and mark the exact place on the map.',
  detectGPS: 'Use my location',
  detecting: 'Finding location...',
  state: 'Province',
  district: 'District *',
  selectDistrict: 'Select district',
  wardNo: 'Ward No. *',
  areaStreet: 'Tole / Street',
  areaPlaceholder: 'e.g. Baneshwor, near the bus stop',
  landmark: 'Landmark',
  landmarkPlaceholder: 'e.g. Opposite the ward office',
  uploadPhotos: 'Photos',
  uploadPhotosDesc: 'Photos help the office understand and fix the problem faster.',
  addPhoto: 'Take or upload a photo',
  reviewSubmit: 'Review & Submit',
  reviewDesc: 'Check the details before you submit.',
  submitGrievance: 'Submit Grievance',
  submitting: 'Submitting...',
  photosAdded: 'Photos added',
  locationSummary: 'Location',
  categorySummary: 'Category',
  prioritySummary: 'Urgency',
  targetSla: 'Response deadline',

  // Case Detail & Timeline
  liveCaseTracker: 'Grievance Tracker',
  grievanceTimeline: 'Timeline',
  reopenCase: 'Reopen Grievance',
  rateResolution: 'Rate the Service',
  submitFeedback: 'Submit Feedback',
  reopenReasonPlaceholder: 'Explain why the problem is not fixed...',
  caseNotFound: 'Grievance Not Found',
  caseNotFoundDesc: 'This grievance could not be found, or you do not have access to it.',
  addComment: 'Add a message',
  commentPlaceholder: 'Write a message to the office...',
  send: 'Send',

  // Detail enhancements
  liveComplaintJourney: 'Progress',
  realtimeAuditTrail: 'Every status change and message from the office',
  currentStage: 'Current Stage',
  resolutionEvidence: 'Before and After',
  beforeReportedEvidence: 'BEFORE — Photos from the citizen',
  afterResolutionEvidence: 'AFTER — Photos from the office',
  evidenceComparisonDesc: 'Photos of the reported problem and of the completed work.',
  governmentActionChain: 'Responsible Offices',
  participatingAuthorities: 'The levels of government that have handled this grievance',
  resolvedAwaitingConfirmation: 'Resolved — please confirm',
  officerMarkedResolvedDesc: 'The office reports this problem is fixed. Please check and confirm, or reopen it if the problem remains.',
  hasThisIssueBeenResolved: 'Has the problem been fixed?',
  confirmationImpactNote: 'Confirming closes the grievance. If you do not respond within 7 days it closes automatically.',
  yesIssueResolved: 'Yes, it is fixed',
  noIssueStillExists: 'No, the problem remains',
  actionRequired: 'Action Required',
  noResolutionEvidenceUploaded: 'The office has not added photos yet.',
  noBeforeEvidence: 'No photos were added when the grievance was registered.',

  // Submission Success
  grievanceRegistered: 'Grievance Registered',
  successSubtitle: 'Your grievance has been sent to your ward office. You will get an SMS when it is updated.',
  trackingId: 'Reference No.',
  assignedAuthority: 'Sent to',
  trackGrievanceLive: 'Track Grievance',
  backToHome: 'Back to Home',

  // Profile Screen
  profileTitle: 'Officer Profile',
  citizenProfile: 'My Profile',
  registeredJurisdiction: 'Registered Address',
  officialDetails: 'Official Details',
  jurisdictionScope: 'Area of Responsibility',
  systemPrivileges: 'Access',
  preferencesSettings: 'Preferences',
  portalPreferences: 'Language',
  portalLanguage: 'Display language',
  selectLanguage: 'Display language',
  smsNotifications: 'SMS notifications',
  helpFaqs: 'Help & FAQs',
  activeStatus: 'Active',
  stateGovernance: 'Government of Nepal',
  helplineText: 'Hello Sarkar: 1111',
  changePassword: 'Change password',
  currentPassword: 'Current password',
  faq1Q: 'How long does the office have to respond?',
  faq1A: 'It depends on urgency: Critical 24 hours, High 48 hours, Medium 72 hours, Low 120 hours. If the deadline passes, the grievance moves up automatically: Ward → Municipality → District → Province.',
  faq2Q: 'How will I know about progress?',
  faq2A: 'You get an SMS and a notification here whenever the office updates your grievance.',
  faq3Q: 'What if the problem is not really fixed?',
  faq3A: 'When a grievance is marked resolved, you can confirm it or reopen it with a reason. If you do nothing for 7 days, it closes automatically.',

  // Notifications & Map
  alertsUpdates: 'Notifications',
  allAlerts: 'All',
  unread: 'Unread',
  markAllRead: 'Mark all read',
  noNotifications: 'No notifications yet',
  noNotificationsDesc: 'You will see updates here when your grievances are reviewed and resolved.',
  localGrievanceMap: 'Grievances near you',
};

const NE: Record<string, string> = {
  // Navigation & General
  appName: 'नेपाल सिभिक',
  appTagline: 'तपाईंको स्थानीय सरकारको गुनासो सेवा',
  home: 'गृहपृष्ठ',
  myCases: 'मेरा गुनासा',
  report: 'गुनासो दर्ता',
  explore: 'नक्सा',
  profile: 'प्रोफाइल',
  dashboard: 'ड्यासबोर्ड',
  complaints: 'गुनासाहरू',
  escalations: 'माथि पठाइएका',
  analytics: 'विश्लेषण',
  alerts: 'सूचना',
  userDirectory: 'कर्मचारीहरू',
  mapView: 'नक्सा',
  logout: 'लग आउट',
  signIn: 'लग इन',
  saveChanges: 'सुरक्षित गर्नुहोस्',
  loading: 'लोड हुँदैछ...',
  continue: 'अगाडि बढ्नुहोस्',
  back: 'पछाडि',
  viewAll: 'सबै हेर्नुहोस्',
  today: 'आज',
  yesterday: 'हिजो',
  daysAgo: 'दिन अघि',
  hoursAgo: 'घण्टा अघि',
  reported: 'दर्ता',
  verifiedCitizen: 'प्रमाणित नागरिक',
  cancel: 'रद्द गर्नुहोस्',
  retry: 'फेरि प्रयास गर्नुहोस्',

  // Roles
  citizen: 'नागरिक',
  ward_officer: 'वडा अधिकृत',
  palika_officer: 'पालिका अधिकृत',
  district_officer: 'जिल्ला अधिकृत',
  province_officer: 'प्रदेश अधिकृत',
  super_admin: 'राष्ट्रिय प्रशासक',

  // Government levels
  level_ward: 'वडा कार्यालय',
  level_palika: 'पालिका',
  level_district: 'जिल्ला समन्वय समिति',
  level_province: 'प्रदेश',
  province: 'प्रदेश',
  ward: 'वडा',
  palika: 'नगरपालिका / गाउँपालिका',

  // Statuses
  pending: 'विचाराधीन',
  assigned: 'जिम्मा दिइएको',
  in_progress: 'काम हुँदै',
  blocked: 'रोकिएको',
  resolved: 'समाधान भएको',
  escalated: 'माथि पठाइएको',
  reopened: 'पुनः खोलिएको',
  rejected: 'अस्वीकृत',
  closed: 'बन्द',

  // Priorities
  low: 'न्यून',
  medium: 'मध्यम',
  high: 'उच्च',
  critical: 'अति जरुरी',

  // Categories
  roads: 'सडक तथा पुल',
  water: 'खानेपानी',
  drainage: 'ढल तथा निकास',
  sanitation: 'फोहोरमैला तथा सरसफाइ',
  electricity: 'बिजुली तथा सडक बत्ती',
  parks: 'पार्क तथा सार्वजनिक स्थल',
  public_safety: 'सार्वजनिक सुरक्षा',
  disaster_mgmt: 'विपद्',
  health: 'स्वास्थ्य सेवा',
  education: 'विद्यालय तथा शिक्षा',
  other: 'अन्य',

  // Auth
  citizenLogin: 'नागरिक',
  officerLogin: 'सरकारी कर्मचारी',
  mobileOrEmail: 'मोबाइल नम्बर वा इमेल',
  officialEmail: 'कार्यालयको इमेल',
  password: 'पासवर्ड',
  forgotPassword: 'पासवर्ड बिर्सनुभयो?',
  noAccount: 'नयाँ प्रयोगकर्ता?',
  createAccount: 'खाता बनाउनुहोस्',
  haveAccount: 'पहिले नै दर्ता हुनुहुन्छ?',
  fullName: 'पूरा नाम',
  mobileNumber: 'मोबाइल नम्बर',
  sendCode: 'कोड पठाउनुहोस्',
  resendCode: 'फेरि पठाउनुहोस्',
  verificationCode: 'SMS मा आएको ६ अंकको कोड',
  codeSent: 'कोड पठाइयो:',
  emailOptional: 'इमेल (ऐच्छिक)',
  passwordRule: 'कम्तीमा ८ अक्षर, अक्षर र अंक दुवै',
  yourAddress: 'तपाईंको ठेगाना',
  selectProvince: 'प्रदेश छान्नुहोस्',
  selectPalika: 'पालिका छान्नुहोस्',
  selectWard: 'वडा छान्नुहोस्',
  resetPassword: 'पासवर्ड रिसेट',
  newPassword: 'नयाँ पासवर्ड',
  officersCreatedByAdmin: 'कर्मचारीको खाता पालिका, जिल्ला वा प्रदेशका प्रशासकले बनाउनुहुन्छ।',

  // Citizen Home Screen
  goodMorning: 'नमस्ते,',
  officialCitizenRedressal: 'नागरिक गुनासो सेवा',
  spottedCivicProblem: 'तपाईंको वडामा कुनै समस्या देख्नुभयो?',
  reportPotholesDesc: 'बिग्रिएको सडक, खानेपानी, फोहोर, सडक बत्ती वा अन्य समस्या सिधै वडा कार्यालयमा पठाउनुहोस्।',
  fileNewGrievance: 'गुनासो दर्ता गर्नुहोस्',
  activeGrievanceTracking: 'तपाईंका खुला गुनासाहरू',
  viewTimeline: 'विवरण हेर्नुहोस्',
  popularCategories: 'विषयहरू',
  recentGrievances: 'हालका गुनासाहरू',

  // My Complaints Screen
  myGrievances: 'मेरा गुनासाहरू',
  searchPlaceholder: 'सन्दर्भ नम्बर, शीर्षक वा विषयबाट खोज्नुहोस्...',
  allCases: 'सबै',
  inProgressTab: 'काम हुँदै',
  resolvedTab: 'समाधान भएका',
  escalatedTab: 'माथि पठाइएका',
  noGrievancesFound: 'कुनै गुनासो भेटिएन',
  noGrievancesDesc: 'तपाईंले यस विषयमा अहिलेसम्म गुनासो दर्ता गर्नुभएको छैन।',
  noSearchMatch: 'तपाईंको खोजसँग मिल्ने गुनासो भेटिएन।',
  fileAGrievance: 'गुनासो दर्ता गर्नुहोस्',

  // Report Wizard
  step: 'चरण',
  of: 'मध्ये',
  selectCategory: 'विषय छान्नुहोस्',
  selectCategoryDesc: 'तपाईं कस्तो समस्याको गुनासो गर्दै हुनुहुन्छ?',
  grievanceDetails: 'गुनासोको विवरण',
  grievanceDetailsDesc: 'समस्या स्पष्टसँग लेख्नुहोस्।',
  complaintTitle: 'शीर्षक *',
  titlePlaceholder: 'जस्तै: चोक नजिक खानेपानीको पाइप चुहिरहेको',
  detailedDescription: 'विवरण *',
  descPlaceholder: 'समस्या के हो, कहिलेदेखि छ, र कसलाई असर परेको छ?',
  urgencyPriority: 'जरुरीपन',
  grievanceLocation: 'स्थान',
  locationDesc: 'वडा छान्नुहोस् र नक्सामा ठ्याक्कै स्थान देखाउनुहोस्।',
  detectGPS: 'मेरो स्थान प्रयोग गर्नुहोस्',
  detecting: 'स्थान खोज्दै...',
  state: 'प्रदेश',
  district: 'जिल्ला *',
  selectDistrict: 'जिल्ला छान्नुहोस्',
  wardNo: 'वडा नं. *',
  areaStreet: 'टोल / सडक',
  areaPlaceholder: 'जस्तै: बानेश्वर, बस बिसौनी नजिक',
  landmark: 'चिनिने स्थान',
  landmarkPlaceholder: 'जस्तै: वडा कार्यालयको अगाडि',
  uploadPhotos: 'फोटोहरू',
  uploadPhotosDesc: 'फोटोले कार्यालयलाई समस्या छिटो बुझ्न र समाधान गर्न मद्दत गर्छ।',
  addPhoto: 'फोटो खिच्नुहोस् वा अपलोड गर्नुहोस्',
  reviewSubmit: 'जाँच र पेश',
  reviewDesc: 'पेश गर्नुअघि विवरण जाँच गर्नुहोस्।',
  submitGrievance: 'गुनासो पेश गर्नुहोस्',
  submitting: 'पेश हुँदैछ...',
  photosAdded: 'थपिएका फोटो',
  locationSummary: 'स्थान',
  categorySummary: 'विषय',
  prioritySummary: 'जरुरीपन',
  targetSla: 'जवाफ दिनुपर्ने समयसीमा',

  // Case Detail & Timeline
  liveCaseTracker: 'गुनासो ट्र्याकर',
  grievanceTimeline: 'समयरेखा',
  reopenCase: 'गुनासो पुनः खोल्नुहोस्',
  rateResolution: 'सेवाको मूल्याङ्कन गर्नुहोस्',
  submitFeedback: 'प्रतिक्रिया पठाउनुहोस्',
  reopenReasonPlaceholder: 'समस्या किन समाधान भएन, लेख्नुहोस्...',
  caseNotFound: 'गुनासो भेटिएन',
  caseNotFoundDesc: 'यो गुनासो भेटिएन, वा तपाईंलाई यसको पहुँच छैन।',
  addComment: 'सन्देश थप्नुहोस्',
  commentPlaceholder: 'कार्यालयलाई सन्देश लेख्नुहोस्...',
  send: 'पठाउनुहोस्',

  // Detail enhancements
  liveComplaintJourney: 'प्रगति',
  realtimeAuditTrail: 'कार्यालयका सबै अवस्था परिवर्तन र सन्देशहरू',
  currentStage: 'हालको अवस्था',
  resolutionEvidence: 'पहिले र पछि',
  beforeReportedEvidence: 'पहिले — नागरिकले पठाएका फोटो',
  afterResolutionEvidence: 'पछि — कार्यालयले पठाएका फोटो',
  evidenceComparisonDesc: 'गुनासो गरिएको समस्या र सम्पन्न कामका फोटोहरू।',
  governmentActionChain: 'जिम्मेवार कार्यालयहरू',
  participatingAuthorities: 'यो गुनासो हेरेका सरकारका तहहरू',
  resolvedAwaitingConfirmation: 'समाधान भयो — कृपया पुष्टि गर्नुहोस्',
  officerMarkedResolvedDesc: 'कार्यालयले यो समस्या समाधान भएको जनाएको छ। कृपया जाँचेर पुष्टि गर्नुहोस्, वा समस्या बाँकी भए पुनः खोल्नुहोस्।',
  hasThisIssueBeenResolved: 'के समस्या समाधान भयो?',
  confirmationImpactNote: 'पुष्टि गरेपछि गुनासो बन्द हुन्छ। ७ दिनभित्र जवाफ नदिए यो आफैं बन्द हुन्छ।',
  yesIssueResolved: 'हो, समाधान भयो',
  noIssueStillExists: 'होइन, समस्या बाँकी छ',
  actionRequired: 'तपाईंको जवाफ चाहिन्छ',
  noResolutionEvidenceUploaded: 'कार्यालयले अहिलेसम्म फोटो थपेको छैन।',
  noBeforeEvidence: 'गुनासो दर्ता गर्दा फोटो थपिएको थिएन।',

  // Submission Success
  grievanceRegistered: 'गुनासो दर्ता भयो',
  successSubtitle: 'तपाईंको गुनासो वडा कार्यालयमा पठाइयो। अद्यावधिक हुँदा SMS आउनेछ।',
  trackingId: 'सन्दर्भ नम्बर',
  assignedAuthority: 'पठाइएको कार्यालय',
  trackGrievanceLive: 'गुनासो ट्र्याक गर्नुहोस्',
  backToHome: 'गृहपृष्ठमा फर्कनुहोस्',

  // Profile Screen
  profileTitle: 'कर्मचारी प्रोफाइल',
  citizenProfile: 'मेरो प्रोफाइल',
  registeredJurisdiction: 'दर्ता गरिएको ठेगाना',
  officialDetails: 'कार्यालय विवरण',
  jurisdictionScope: 'जिम्मेवारीको क्षेत्र',
  systemPrivileges: 'पहुँच',
  preferencesSettings: 'सेटिङ',
  portalPreferences: 'भाषा',
  portalLanguage: 'प्रदर्शन भाषा',
  selectLanguage: 'प्रदर्शन भाषा',
  smsNotifications: 'SMS सूचना',
  helpFaqs: 'सहायता तथा प्रश्नोत्तर',
  activeStatus: 'सक्रिय',
  stateGovernance: 'नेपाल सरकार',
  helplineText: 'हेलो सरकार: ११११',
  changePassword: 'पासवर्ड परिवर्तन',
  currentPassword: 'हालको पासवर्ड',
  faq1Q: 'कार्यालयले कति समयभित्र जवाफ दिनुपर्छ?',
  faq1A: 'जरुरीपन अनुसार: अति जरुरी २४ घण्टा, उच्च ४८ घण्टा, मध्यम ७२ घण्टा, न्यून १२० घण्टा। समयसीमा नाघेमा गुनासो आफैं माथिल्लो तहमा जान्छ: वडा → पालिका → जिल्ला → प्रदेश।',
  faq2Q: 'प्रगतिबारे मलाई कसरी थाहा हुन्छ?',
  faq2A: 'कार्यालयले गुनासो अद्यावधिक गर्दा तपाईंलाई SMS र यहाँ सूचना आउँछ।',
  faq3Q: 'समस्या साँच्चै समाधान नभए के गर्ने?',
  faq3A: 'गुनासो समाधान भएको जनाएपछि तपाईं पुष्टि गर्न वा कारणसहित पुनः खोल्न सक्नुहुन्छ। ७ दिनसम्म केही नगरे यो आफैं बन्द हुन्छ।',

  // Notifications & Map
  alertsUpdates: 'सूचनाहरू',
  allAlerts: 'सबै',
  unread: 'नपढिएका',
  markAllRead: 'सबै पढिएको चिनो लगाउनुहोस्',
  noNotifications: 'अहिलेसम्म कुनै सूचना छैन',
  noNotificationsDesc: 'तपाईंका गुनासा हेरिँदा र समाधान हुँदा यहाँ सूचना देखिनेछ।',
  localGrievanceMap: 'नजिकका गुनासाहरू',
};

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = { en: EN, ne: NE };

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  ne: 'नेपाली',
};

const STORAGE_KEY = 'nepal-civic.lang';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'ne') return saved;
    } catch {
      // Storage can be unavailable; fall back to Nepali.
    }
    return 'ne';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  };

  const t = (key: string): string => TRANSLATIONS[language]?.[key] || EN[key] || key;
  const pick = (en: string, ne?: string | null): string => (language === 'ne' && ne ? ne : en);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languageName: LANGUAGE_NAMES[language], t, pick }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string }[] = [
  { code: 'ne', name: LANGUAGE_NAMES.ne },
  { code: 'en', name: LANGUAGE_NAMES.en },
];
