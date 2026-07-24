import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const admin = await db.usuario.upsert({
    where: { email: "admin@alpha.com.br" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@alpha.com.br",
      // placeholder — auth ainda não implementado; substituir por hash real (bcrypt/argon2) quando o login for adicionado
      senhaHash: "CHANGE_ME",
      role: "ADMIN",
    },
  });

  console.log("Seed concluído. Usuário admin:", admin.email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
