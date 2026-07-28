import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const admin = await db.usuario.upsert({
    where: { email: "cesar.tallys@assessorialpha.com" },
    update: {},
    create: {
      nome: "Cesar Tallys",
      email: "cesar.tallys@assessorialpha.com",
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
