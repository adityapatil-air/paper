import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Footer from './components/Footer';
import BackToTop from './components/BackToTop';

// Pages

import Landing from './pages/Landing';
import BrowsePapers from './pages/BrowsePapers';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthorDashboard from './pages/AuthorDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ReviewPaper from './pages/ReviewPaper';
import AuthorGuidelines from './pages/AuthorGuidelines';
import CallForPapers from './pages/CallForPapers';
import Indexing from './pages/Indexing';
import JournalIssues from './pages/JournelIssue';
import JoinEditorialTeam from './pages/joinusedito';
import SubmitForm from './pages/SubmitForm';
import ContactUs from './pages/ContactUs';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import EditorialBoard from './pages/EditorialBoard';
import PaperRedirect from './pages/PaperRedirect';



function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <Header />
          <main className="flex-1" id="main-content" tabIndex={-1}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/papers" element={<BrowsePapers />} />
              <Route path="/author-guidelines" element={<AuthorGuidelines />} />
              <Route path="/indexing" element={<Indexing />} />
              <Route path="/p/:id" element={<PaperRedirect />} />
              <Route path="/paper/:slug" element={<PaperRedirect />} />
                <Route path="/callforpapers" element={<CallForPapers />} />
                <Route path="/journal-issues" element={<JournalIssues />} />
                <Route path="/joinusedito" element={<JoinEditorialTeam />} />
                <Route path="/submitform" element={<SubmitForm />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/editorial-board" element={<EditorialBoard />} />
              {/*  Routes */}
              <Route
                path="/author-dashboard"
                element={
                  <ProtectedRoute requiredRole="author">
                    <AuthorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviewer-dashboard"
                element={
                  <ProtectedRoute requiredRole="reviewer">
                    <ReviewerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review/paper/:id"
                element={
                  <ProtectedRoute allowedRoles={["reviewer", "admin"]}>
                    <ReviewPaper />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <BackToTop />
        </div>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
