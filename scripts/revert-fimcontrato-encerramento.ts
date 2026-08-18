import "dotenv/config";
import { db } from "@/lib/db";

// Reverte o fimContrato sobrescrito por scripts/backfill-encerramento-datas.ts
// (branch [evento]) — dataSaida deve continuar como está (é a data real de
// saída), mas fimContrato precisa voltar a ser o prazo ORIGINALMENTE
// contratado, não a data em que o cliente efetivamente saiu. Os valores
// originais abaixo vêm direto do log do `--apply` anterior (única fonte que
// temos, já que o valor já foi sobrescrito no banco).
//
// Não mexe nos 17 contratos da branch [renovação] — esses nunca tiveram
// fimContrato alterado (só dataSaida foi preenchida), então não precisam de
// reversão.
//
// Uso:
//   npx tsx scripts/revert-fimcontrato-encerramento.ts            (dry-run)
//   npx tsx scripts/revert-fimcontrato-encerramento.ts --apply    (aplica)
const APLICAR = process.argv.includes("--apply");

const ORIGINAIS: { contratoId: string; cliente: string; fimContratoOriginal: string }[] = [
  { contratoId: "cmrwfu3z801gvuktolxi0sx7e", cliente: "Clássico Burguer", fimContratoOriginal: "2026-07-28" },
  { contratoId: "cmrwftd0j01eouktodi4vkkuz", cliente: "Massimo Pizzaria", fimContratoOriginal: "2026-07-16" },
  { contratoId: "cmrwfru3a01a1uktoeq3qtr7i", cliente: "Loov Café", fimContratoOriginal: "2026-07-21" },
  { contratoId: "cmrwfjmvk00jaukton9fgy49d", cliente: "Frozen & Cia", fimContratoOriginal: "2026-07-30" },
  { contratoId: "cmrwflzbj00r4uktofxcu9sum", cliente: "Bendito Brookie", fimContratoOriginal: "2026-09-02" },
  { contratoId: "cmrwfm1g900rbuktoslaqaioe", cliente: "CLUB DA PIZZA", fimContratoOriginal: "2026-09-04" },
  { contratoId: "cmrwfm5tz00rpuktokinkzj1e", cliente: "DONA XICA", fimContratoOriginal: "2026-09-07" },
  { contratoId: "cmrwfmris00tguktot9kmoe54", cliente: "MAMMA MIA PIZZARIA", fimContratoOriginal: "2026-09-15" },
  { contratoId: "cmrwfmtj800tnuktolop36hn2", cliente: "Moneira Burguer", fimContratoOriginal: "2026-09-16" },
  { contratoId: "cmrwfn3dj00umuktoqa2hpu9h", cliente: "Point do Açaí", fimContratoOriginal: "2026-09-20" },
  { contratoId: "cmrwflbla00oxuktowj80gbhe", cliente: "Santana Burger", fimContratoOriginal: "2026-08-08" },
  { contratoId: "cmrwflkga00prukto3vsrgulc", cliente: "Tradição Camuru", fimContratoOriginal: "2026-08-08" },
  { contratoId: "cmrwfqu95016tuktos3ppxmaa", cliente: "Ocaso Café", fimContratoOriginal: "2026-08-12" },
  { contratoId: "cmrwfun1y01ifuktoesms2jpv", cliente: "Rosa Lanches", fimContratoOriginal: "2026-08-05" },
  { contratoId: "cmrwfu9fi01h9uktoypj5el60", cliente: "Epicerie Kadeau", fimContratoOriginal: "2026-08-04" },
  { contratoId: "cmrwgf8be03aeukto37ovk1iy", cliente: "Caio's Delivery", fimContratoOriginal: "2026-08-05" },
  { contratoId: "cms80eeel000601peafngjomg", cliente: "Aldeias do Porto Pizzaria LTDA", fimContratoOriginal: "2026-07-06" },
  { contratoId: "cmrwfoh9k00zaukto7653wg97", cliente: "Vila Radical Street Food", fimContratoOriginal: "2026-05-12" },
  { contratoId: "cmrwfifu200fbuktoeurxuw09", cliente: "Madelin", fimContratoOriginal: "2026-06-30" },
  { contratoId: "cmrwfiszq00gjukto3w5rq1to", cliente: "ROS Lanches", fimContratoOriginal: "2026-07-27" },
  { contratoId: "cmrwfjcgg00ibuktovh140w03", cliente: "Burgg's Hamburgueria", fimContratoOriginal: "2026-06-30" },
  { contratoId: "cmrwfjim200iwuktovpqmxg23", cliente: "Dominick Pizzaria", fimContratoOriginal: "2026-06-25" },
  { contratoId: "cmrwfqnan0167uktolxhyt1mu", cliente: "Milky Moo", fimContratoOriginal: "2026-07-28" },
  { contratoId: "cmrwfkhev00m3ukto72tluryb", cliente: "Castello Pizzaria", fimContratoOriginal: "2026-07-03" },
  { contratoId: "cmrwfkyhw00nouktowyos69o5", cliente: "Gate 22", fimContratoOriginal: "2026-07-08" },
  { contratoId: "cmrwfldpz00p4ukto2kqapp85", cliente: "Se Liga no Cone", fimContratoOriginal: "2026-07-24" },
  { contratoId: "cmrwfnq8u00wrukto453aar0z", cliente: "Chocolate Brant", fimContratoOriginal: "2026-07-09" },
  { contratoId: "cmrwfotsc010guktoba22oyl3", cliente: "Dom Baruka", fimContratoOriginal: "2026-07-16" },
  { contratoId: "cmrwfjwd300k3uktoybtw50mr", cliente: "Mammas Gourmet", fimContratoOriginal: "2026-07-07" },
  { contratoId: "cmrwfk0bs00khukto433fafkc", cliente: "Prime Beef Premium", fimContratoOriginal: "2026-07-10" },
  // Arca burguer (cms7uma4f000e01pgvsmah5h8) não entra — original já era 2026-08-14,
  // igual ao valor gravado pelo backfill (não houve mudança real).
];

async function main() {
  console.log(`${ORIGINAIS.length} contrato(s) a reverter.\n`);

  for (const item of ORIGINAIS) {
    const contrato = await db.contrato.findUniqueOrThrow({ where: { id: item.contratoId } });
    const fimAtual = contrato.fimContrato?.toISOString().slice(0, 10);

    console.log(
      `${item.cliente} — contrato ${item.contratoId}: fimContrato ${fimAtual} → ${item.fimContratoOriginal} (dataSaida mantida: ${contrato.dataSaida?.toISOString().slice(0, 10)})`,
    );

    if (APLICAR) {
      await db.contrato.update({
        where: { id: item.contratoId },
        data: { fimContrato: new Date(item.fimContratoOriginal) },
      });
    }
  }

  console.log(APLICAR ? "\nAplicado." : "\nDry-run — nada foi alterado. Rode com --apply para gravar.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
