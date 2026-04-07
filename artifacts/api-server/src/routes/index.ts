import { Router, type IRouter } from "express";
import healthRouter from "./health";
import unidadesRouter from "./unidades";
import usuariosRouter from "./usuarios";
import pacientesRouter from "./pacientes";
import anamneseRouter from "./anamnese";
import motorClinicoRouter from "./motorClinico";
import blocosRouter from "./blocos";
import protocolosRouter from "./protocolos";
import filasRouter from "./filas";
import followupRouter from "./followup";
import financeiroRouter from "./financeiro";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(unidadesRouter);
router.use(usuariosRouter);
router.use(pacientesRouter);
router.use(anamneseRouter);
router.use(motorClinicoRouter);
router.use(blocosRouter);
router.use(protocolosRouter);
router.use(filasRouter);
router.use(followupRouter);
router.use(financeiroRouter);
router.use(dashboardRouter);

export default router;
