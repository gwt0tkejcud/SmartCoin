import Header from "@/components/Header";
import AdminPanel from "@/components/AdminPanel";

const AdminPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-20">
        <AdminPanel />
      </main>
    </div>
  );
};

export default AdminPage;
