import { enviarOrcamentoFarmaceutico } from "../../artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.js";

async function main() {
  const receitaId = Number(process.env["RECEITA_ID"] || "8727");
  console.log(`[disparar-teste] receitaId=${receitaId}`);

  const out = await enviarOrcamentoFarmaceutico({
    receitaId,
    farmaciaRepresentante: {
      nome: "Caio Padua (rep. teste FAMA)",
      cpf: "29327494806",
      email: "ceo@pawards.com.br",
      telefone: "5511946554000",
    },
  });

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("[disparar-teste] FALHOU:", e?.message || e);
  console.error(e?.stack);
  process.exit(1);
});
