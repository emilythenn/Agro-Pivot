import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Login from "./Login";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Login />;
};

export default Index;
