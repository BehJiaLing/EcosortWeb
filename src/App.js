import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import Award from './pages/Award';
import Access from './pages/Access';
import WasteLog from './pages/WasteLog';
import WasteLogDetails from "./pages/WasteLogDetails";
import Summary from './pages/Summary';
import Profile from './pages/Profile';
import ErrorPage from './pages/ErrorPage';
import ResetPassword from './pages/ResetPassword';
import NewPassword from './pages/NewPassword';
import UserAward from './pages/UserAward';
import Redeem from './pages/Redeem';
import Tracking from './pages/Tracking';

function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/new-password" element={<NewPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wastelog" element={<WasteLog />} />
            <Route path="/waste-details/:date" element={<WasteLogDetails />} />
            <Route path="/access" element={<Access />} />
            <Route path="/award" element={<Award />} />
            <Route path="/useraward" element={<UserAward />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/redeem" element={<Redeem />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/error" element={<ErrorPage />} />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default App;
