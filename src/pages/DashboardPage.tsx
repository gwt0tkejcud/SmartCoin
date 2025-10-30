import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";

const DashboardPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <Dashboard />
      </main>
    </div>
  );
};

export default DashboardPage;
