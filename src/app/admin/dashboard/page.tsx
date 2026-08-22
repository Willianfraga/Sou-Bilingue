import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ListaAlunos } from "@/components/admin/ListaAlunos";
import { GerenciadorPlanos } from "@/components/admin/GerenciadorPlanos";

export default function AdminPage() {
  return (
    <div className="space-y-12">
      {/* Dashboard Overview */}
      <section>
        <AdminDashboard />
      </section>

      {/* Gerenciador de Planos */}
      <section>
        <GerenciadorPlanos />
      </section>

      {/* Lista de Alunos */}
      <section>
        <ListaAlunos />
      </section>
    </div>
  );
}
