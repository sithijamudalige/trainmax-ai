import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import EditUser from "./pages/EditUser";
import AdminTable from "./pages/AdminTable";
import AdminEditRecord from "./pages/AdminEditRecord";
import Chatbot from "./pages/Chatbot";
import TrainingPlan from "./pages/TrainingPlan";
import TrackingDashboard from "./pages/TrackingDashboard";
import Notebook from "./pages/Notebook";
import CoachLogin  from "./pages/CoachLogin";
import CoachSignup from "./pages/CoachSignup";
import EditCurrentUser from "./pages/EditCurrentUser";
import CoachDashboard from './pages/CoachDashboard';
import CoachTeam from './pages/CoachTeam';
import CoachChatbot from './pages/CoachChatbot';
import CoachTrainingPlan from './pages/CoachTrainingPlan';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:id/edit" element={<EditUser />} />
        <Route path="/admin/crud/:tableName" element={<AdminTable />} />
        <Route path="/admin/crud/:tableName/new" element={<AdminEditRecord />} />
        <Route path="/admin/crud/:tableName/:id/edit" element={<AdminEditRecord />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/training-plan" element={<TrainingPlan />} />
        <Route path="/tracking" element={<TrackingDashboard />} />
        <Route path="/notebook" element={<Notebook />} />
        <Route path="/coach/login" element={<CoachLogin />} />
        <Route path="/coach/signup" element={<CoachSignup />} />
        <Route path="/:id/edit-profile" element={<EditCurrentUser />} />
        <Route path="/coach-login"  element={<CoachLogin />} />
        <Route path="/coach-signup" element={<CoachSignup />} />
        <Route path="/coach-dashboard"  element={<CoachDashboard />} />
        <Route path="/coach-team" element={<CoachTeam />} />
        <Route path="/coach-chatbot" element={<CoachChatbot />} />
        <Route path="/coach-training-plans" element={<CoachTrainingPlan />} />
      </Routes>
    </BrowserRouter>
  );
}