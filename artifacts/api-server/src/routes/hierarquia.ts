import { Router, Request, Response } from "express";
import { db, teamPositionsTable, teamMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

interface CargoComFilhos {
  id: number;
  cargo: string;
  indice: string;
  codigoCompleto: string;
  modalidade: string;
  slaDefault: string | null;
  reportaA: string | null;
  descricaoFuncao: string | null;
  colaboradores: {
    id: number;
    nomeCompleto: string;
    emailFuncional: string | null;
    telefone: string | null;
    statusAtivo: boolean | null;
    fotoUrl: string | null;
  }[];
  filhos: CargoComFilhos[];
}

function montarArvore(cargos: any[], membros: any[]): CargoComFilhos[] {
  const raizes = cargos.filter((c) => !c.reportaA);

  function construirNodo(cargo: any): CargoComFilhos {
    const colaboradoresDoCargo = membros.filter(
      (m) => m.posicaoId === cargo.id && m.statusAtivo
    );
    const filhosDirectos = cargos.filter((c) => c.reportaA === cargo.indice);

    return {
      id: cargo.id,
      cargo: cargo.cargo,
      indice: cargo.indice,
      codigoCompleto: cargo.codigoCompleto,
      modalidade: cargo.modalidade,
      slaDefault: cargo.slaDefault,
      reportaA: cargo.reportaA,
      descricaoFuncao: cargo.descricaoFuncao,
      colaboradores: colaboradoresDoCargo.map((m) => ({
        id: m.id,
        nomeCompleto: m.nomeCompleto,
        emailFuncional: m.emailFuncional,
        telefone: m.telefone,
        statusAtivo: m.statusAtivo,
        fotoUrl: m.fotoUrl,
      })),
      filhos: filhosDirectos.map(construirNodo),
    };
  }

  return raizes.map(construirNodo);
}

router.get("/", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const cargosQuery = unidadeId
    ? db.select().from(teamPositionsTable).where(
        and(eq(teamPositionsTable.unidadeId, unidadeId), eq(teamPositionsTable.ativa, true))
      )
    : db.select().from(teamPositionsTable).where(eq(teamPositionsTable.ativa, true));

  const membrosQuery = unidadeId
    ? db.select().from(teamMembersTable).where(
        and(eq(teamMembersTable.unidadeId, unidadeId), eq(teamMembersTable.statusAtivo, true))
      )
    : db.select().from(teamMembersTable).where(eq(teamMembersTable.statusAtivo, true));

  const [cargos, membros] = await Promise.all([cargosQuery, membrosQuery]);

  const arvore = montarArvore(cargos, membros);

  res.json({
    arvore,
    totalCargos: cargos.length,
    totalColaboradores: membros.length,
  });
});

export default router;
