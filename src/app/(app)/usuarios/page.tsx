import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UsuarioFormDialog } from "@/components/usuarios/usuario-form-dialog";
import { UsuarioAtivoToggle } from "@/components/usuarios/usuario-ativo-toggle";
import { ExcluirUsuarioButton } from "@/components/usuarios/excluir-usuario-button";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  CEO: "CEO",
  DIRETOR: "Diretor",
  PROFIT: "Profit",
  FRANQUEADO: "Franqueado",
  OPERACIONAL: "Operacional",
};

export default async function UsuariosPage() {
  const usuarioAtual = await getCurrentUser();
  if (!canManageUsers(usuarioAtual)) redirect("/");

  // Sequential on purpose — ver comentário em src/app/franquias/page.tsx.
  const usuarios = await db.usuario.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    include: { franquia: true },
  });
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null, ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gestão de acesso e permissões da plataforma."
        actions={<UsuarioFormDialog franquias={franquias} />}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Franquia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nome}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{ROLE_LABEL[u.role] ?? u.role}</Badge>
              </TableCell>
              <TableCell>{u.franquia?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>
                <Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <UsuarioFormDialog usuario={u} franquias={franquias} />
                  <UsuarioAtivoToggle id={u.id} ativo={u.ativo} />
                  {u.id !== usuarioAtual.id && <ExcluirUsuarioButton id={u.id} nome={u.nome} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {usuarios.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
