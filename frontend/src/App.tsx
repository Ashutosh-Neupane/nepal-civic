import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import type { Role } from './types';

// Auth Screens
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from './screens/auth/ForgotPasswordScreen';

// Citizen Screens
import { CitizenHomeScreen } from './screens/citizen/CitizenHomeScreen';
import { ReportComplaintWizard } from './screens/citizen/ReportComplaintWizard';
import { SubmissionSuccessScreen } from './screens/citizen/SubmissionSuccessScreen';
import { MyComplaintsScreen } from './screens/citizen/MyComplaintsScreen';
import { ComplaintDetailScreen } from './screens/citizen/ComplaintDetailScreen';
import { CitizenNotificationsScreen } from './screens/citizen/CitizenNotificationsScreen';
import { CitizenProfileScreen } from './screens/citizen/CitizenProfileScreen';
import { CitizenMapViewScreen } from './screens/citizen/CitizenMapViewScreen';

// Ward and Palika (local level) Officer Screens

// District Officer Screens

// Province Officer and National Administrator Screens

// Shared Officer Screens
import { OfficerDashboardScreen } from './screens/officer/OfficerDashboardScreen';
import { OfficerComplaintsScreen } from './screens/officer/OfficerComplaintsScreen';
import { OfficerMapScreen } from './screens/officer/OfficerMapScreen';
import { OfficerAnalyticsScreen } from './screens/officer/OfficerAnalyticsScreen';
import { OfficerUsersScreen } from './screens/officer/OfficerUsersScreen';
import { OfficerProfileScreen } from './screens/officer/OfficerProfileScreen';
import { OfficerAlertsScreen } from './screens/officer/OfficerAlertsScreen';

const CITIZEN: Role[] = ['citizen'];
const LOCAL: Role[] = ['ward_officer', 'palika_officer'];
const DISTRICT: Role[] = ['district_officer'];
const PROVINCE: Role[] = ['province_officer', 'super_admin'];

const OFFICER_PORTALS: { base: string; roles: Role[]; managers: Role[]; escalations: boolean }[] = [
  { base: '/palika', roles: LOCAL, managers: ['palika_officer'], escalations: false },
  { base: '/district', roles: DISTRICT, managers: DISTRICT, escalations: true },
  { base: '/province', roles: PROVINCE, managers: PROVINCE, escalations: true },
];

function guard(roles: Role[], element: ReactNode) {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/auth/login" element={<LoginScreen />} />
            <Route path="/auth/register" element={<RegisterScreen />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordScreen />} />

            {/* Citizen Routes */}
            <Route path="/citizen" element={guard(CITIZEN, <CitizenHomeScreen />)} />
            <Route path="/citizen/report" element={guard(CITIZEN, <ReportComplaintWizard />)} />
            <Route path="/citizen/submission-success" element={guard(CITIZEN, <SubmissionSuccessScreen />)} />
            <Route path="/citizen/my-complaints" element={guard(CITIZEN, <MyComplaintsScreen />)} />
            <Route path="/citizen/complaints" element={guard(CITIZEN, <MyComplaintsScreen />)} />
            <Route path="/citizen/complaint/:id" element={guard(CITIZEN, <ComplaintDetailScreen />)} />
            <Route path="/citizen/complaints/:id" element={guard(CITIZEN, <ComplaintDetailScreen />)} />
            <Route path="/citizen/notifications" element={guard(CITIZEN, <CitizenNotificationsScreen />)} />
            <Route path="/citizen/profile" element={guard(CITIZEN, <CitizenProfileScreen />)} />
            <Route path="/citizen/map" element={guard(CITIZEN, <CitizenMapViewScreen />)} />

            {/* Officer portals: the same screens at every level; the backend limits each officer to their own area */}
            {OFFICER_PORTALS.map(({ base, roles, managers, escalations }) => [
              <Route key={base} path={base} element={guard(roles, <OfficerDashboardScreen />)} />,
              <Route key={`${base}/complaints`} path={`${base}/complaints`} element={guard(roles, <OfficerComplaintsScreen />)} />,
              escalations && (
                <Route key={`${base}/escalations`} path={`${base}/escalations`} element={guard(roles, <OfficerComplaintsScreen escalationsOnly />)} />
              ),
              <Route key={`${base}/map`} path={`${base}/map`} element={guard(roles, <OfficerMapScreen />)} />,
              <Route key={`${base}/analytics`} path={`${base}/analytics`} element={guard(roles, <OfficerAnalyticsScreen />)} />,
              <Route key={`${base}/users`} path={`${base}/users`} element={guard(managers, <OfficerUsersScreen />)} />,
              <Route key={`${base}/notifications`} path={`${base}/notifications`} element={guard(roles, <OfficerAlertsScreen />)} />,
              <Route key={`${base}/profile`} path={`${base}/profile`} element={guard(roles, <OfficerProfileScreen />)} />,
            ])}

            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
