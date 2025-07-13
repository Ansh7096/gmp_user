import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Loader from "./components/Loader";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar"; // Student/Faculty/Staff Navbar
import Home from "./components/Home";
import LandingHome from "./components/LandingHome";
import TrackGrievance from "./components/TrackGrievance";
import SubmitGrievance from "./components/SubmitGrievance";
import About from "./components/About";
import Faq from "./components/Faq";
import OfficeBearer from "./components/OfficeBearer";
import OfficeBearerLogin from "./components/OfficeBearerLogin";
import ApprovingAuthority from "./components/ApprovingAuthority";
import ApprovingAuthorityLogin from "./components/ApprovingAuthorityLogin";
import Admin from "./components/Admin";
import AdminLogin from "./components/AdminLogin";
import Register from "./components/Register";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";

export const FlashContext = createContext({ showFlash: () => {} });

function AppContent() {
  const location = useLocation();
  const hideNavbar = ["/", "/login", "/register", "/forgot-password", "/office-bearer-login", "/approving-authority-login", "/admin-login"].includes(
    location.pathname
  );

  return (
    <>
      {!hideNavbar && <Navbar />} {/* Render Navbar conditionally */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/track-grievance" element={<TrackGrievance />} />
        <Route path="/submit-grievance" element={<SubmitGrievance />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/office-bearer" element={<OfficeBearer />} />
        <Route path="/office-bearer-login" element={<OfficeBearerLogin />} />
        <Route path="/approving-authority" element={<ApprovingAuthority />} />
        <Route path="/approving-authority-login" element={<ApprovingAuthorityLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  // Provide a showFlash function using react-toastify
  const showFlash = (message, type = "info") => {
    toast[type](message, {
      position: "top-center",
      autoClose: 7500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored"
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <FlashContext.Provider value={{ showFlash }}>
      <ToastContainer
  toastClassName="bg-[#FFFDEB] text-[#6B4F27] border border-[#F5E9C9] shadow-md min-w-[360px] max-w-[600px] w-fit"
  bodyClassName="text-base font-medium text-center"
  position="top-center"
  autoClose={3500}
  hideProgressBar={false}
  closeOnClick
  pauseOnHover
  draggable
  theme="light"
/>
      <Router>
        <AppContent />
      </Router>
    </FlashContext.Provider>
  );
}
