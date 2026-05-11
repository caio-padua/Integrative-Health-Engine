import { enviarOrcamentoFarmaceutico } from "../lib/assinatura/use-cases/enviarOrcamentoFarmaceutico";

(async () => {
  try {
    const r = await enviarOrcamentoFarmaceutico({
      receitaId: 8727,
      farmaciaRepresentante: {
        nome: "Caio Padua (TESTE FARMACIA - Wave 10 Fase B)",
        cpf: "29327494806",
        email: "ceo@pawards.com.br",
        telefone: "5511946554000",
      },
    });
    console.log("RESULTADO:");
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
