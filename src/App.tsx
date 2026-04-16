import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app-layout";
import LoginPage from "@/pages/LoginPage";
import BillsPage from "@/pages/BillsPage";
import BillFormPage from "@/pages/BillFormPage";
import BillViewPage from "@/pages/BillViewPage";
import ProductsPage from "@/pages/ProductsPage";
import CustomersPage from "@/pages/CustomersPage";
import SettingsPage from "@/pages/SettingsPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const SupabaseConfigError = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted p-4">
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Supabase configuration missing</CardTitle>
        <CardDescription>
          Add your Supabase environment variables in Vercel so the app can load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>`VITE_SUPABASE_URL`</p>
        <p>`VITE_SUPABASE_PUBLISHABLE_KEY`</p>
      </CardContent>
    </Card>
  </div>
);

const AuthRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center">...</div>;
  if (user) return <Navigate to="/bills" replace />;

  return <LoginPage />;
};

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center">...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return <Outlet />;
};

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <SupabaseConfigError />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route element={<ProtectedRoutes />}>
                <Route element={<AppLayout />}>
                  <Route path="/bills" element={<BillsPage />} />
                  <Route path="/bills/new" element={<BillFormPage />} />
                  <Route path="/bills/:id/edit" element={<BillFormPage />} />
                  <Route path="/bills/:id" element={<BillViewPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>)
}

export default App
