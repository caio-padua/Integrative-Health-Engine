/**
 * Script: uploadModelosDrive.ts
 * Envia os 13 modelos de receituário/RAS/capa para a pasta Drive do CEO.
 * Usa o ID direto da conexão Google Drive (não o query por connector_name).
 */
import { google } from 'googleapis';
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_DESTINO_ID = "12lsL8VV7GxoSMKgk70-mOMdw2OHdCuVL";

// ID específico da conexão Google Drive neste Repl
const CONN_ID = "conn_google-drive_01KNNJP2AQVYCB2AV3SQ3DQ367";

async function getAccessTokenDireto(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replIdentity = process.env.REPL_IDENTITY;
  const deplRenewal = process.env.WEB_REPL_RENEWAL;

  const xReplitToken = replIdentity
    ? 'repl ' + replIdentity
    : deplRenewal
    ? 'depl ' + deplRenewal
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Tokens de ambiente não encontrados (REPL_IDENTITY/WEB_REPL_RENEWAL/REPLIT_CONNECTORS_HOSTNAME)');
  }

  // Tentar 1: pelo ID específico da conexão
  const resp1 = await fetch(
    `https://${hostname}/api/v2/connection/${CONN_ID}?include_secrets=true`,
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  );
  if (resp1.ok) {
    const data = await resp1.json() as any;
    const token = data?.settings?.access_token
      ?? data?.settings?.oauth?.credentials?.access_token;
    if (token) {
      console.log("✓ Token obtido pelo ID da conexão");
      return token;
    }
  }

  // Tentar 2: query por connector_config_id (formato alternativo)
  const resp2 = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&limit=50`,
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  );
  if (resp2.ok) {
    const data = await resp2.json() as any;
    console.log("Todas as conexões:", JSON.stringify((data.items ?? []).map((i: any) => ({ id: i.id, displayName: i.displayName }))));
    const driveConn = (data.items ?? []).find((i: any) =>
      i.id?.includes('google-drive') || i.displayName?.toLowerCase().includes('drive')
    );
    if (driveConn) {
      const token = driveConn?.settings?.access_token
        ?? driveConn?.settings?.oauth?.credentials?.access_token;
      if (token) {
        console.log("✓ Token obtido pela listagem geral");
        return token;
      }
    }
    console.log("Itens encontrados:", data.items?.length ?? 0);
  }

  throw new Error('Token Google Drive não encontrado. Reconecte a integração no painel do Replit.');
}

async function getDriveClient() {
  const accessToken = await getAccessTokenDireto();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

const MOCKUPS_BASE = "/home/runner/workspace/artifacts/mockup-sandbox/src/components/mockups";

const MODELOS: Array<{ nome: string; arquivo: string; descricao: string }> = [
  { nome: "REC-01__Receituario_Classico_Branco.tsx",      arquivo: `${MOCKUPS_BASE}/ReceitaVarianteA.tsx`, descricao: "Receituário Clássico Branco — layout limpo, tipografia documental" },
  { nome: "REC-02__Receituario_Bicolor_Clinico.tsx",      arquivo: `${MOCKUPS_BASE}/ReceitaVarianteB.tsx`, descricao: "Receituário Bicolor Clínico — navy + creme" },
  { nome: "REC-03__Receituario_Com_Blocos.tsx",           arquivo: `${MOCKUPS_BASE}/ReceitaVarianteC.tsx`, descricao: "Receituário com Blocos — seções demarcadas por linhas" },
  { nome: "REC-04__Receituario_Compacto.tsx",             arquivo: `${MOCKUPS_BASE}/ReceitaVarianteD.tsx`, descricao: "Receituário Compacto — menor espaçamento, mais itens por página" },
  { nome: "REC-05__Receituario_Controlado_Azul_B1_B2.tsx",arquivo: `${MOCKUPS_BASE}/ReceitaVarianteE.tsx`, descricao: "Receituário Controlado Azul B1/B2 — faixa ANVISA, SNCR, seção farmácia" },
  { nome: "REC-06__Receituario_Magistral_Farmacia.tsx",   arquivo: `${MOCKUPS_BASE}/ReceitaVarianteF.tsx`, descricao: "Receituário Magistral RDC-67 — fórmulas por cor + seção farmácia" },
  { nome: "RAS-01__Capa_Navy_Gradient.tsx",               arquivo: `${MOCKUPS_BASE}/PdfVarianteA.tsx`,      descricao: "Capa RAS — navy gradient, header institucional" },
  { nome: "RAS-02__Capa_Linha_Inferior.tsx",              arquivo: `${MOCKUPS_BASE}/PdfVarianteB.tsx`,      descricao: "Capa RAS — navy com linha inferior" },
  { nome: "RAS-03__Capa_Dourado_Border.tsx",              arquivo: `${MOCKUPS_BASE}/PdfVarianteC.tsx`,      descricao: "Capa RAS — borda dourada topo, dourado PENUMBRA" },
  { nome: "RAS-04__Capa_Bicolor_Austero.tsx",             arquivo: `${MOCKUPS_BASE}/PdfVarianteD.tsx`,      descricao: "Capa RAS — bicolor austero" },
  { nome: "CAP-01__Capa_Premium_Substancias_Farmacia.tsx",arquivo: `${MOCKUPS_BASE}/CapaProtocoloA.tsx`,    descricao: "Capa Protocolo Premium — gráfico de barras substâncias + farmácia + ICP-Brasil" },
  { nome: "CAP-02__Capa_Austero_Tipografico.tsx",         arquivo: `${MOCKUPS_BASE}/CapaProtocoloB.tsx`,    descricao: "Capa Protocolo Austero — tipografia pura, estilo documento jurídico, índice de cadernos" },
  { nome: "CAP-03__Capa_Radar_SVG_Categorias.tsx",        arquivo: `${MOCKUPS_BASE}/CapaProtocoloC.tsx`,    descricao: "Capa Protocolo Radar SVG — gráfico radar por categoria terapêutica" },
];

async function main() {
  console.log("▶  Conectando ao Google Drive…");
  const drive = await getDriveClient();

  try {
    const pasta = await drive.files.get({ fileId: PASTA_DESTINO_ID, fields: "id,name" });
    console.log(`✓  Pasta destino: ${pasta.data.name}`);
  } catch {
    console.error("✗  Pasta destino não encontrada ou sem acesso");
    process.exit(1);
  }

  let ok = 0, fail = 0;

  for (const modelo of MODELOS) {
    const caminhoLocal = path.resolve(__dirname, modelo.arquivo);
    if (!fs.existsSync(caminhoLocal)) {
      console.error(`✗  Arquivo não encontrado: ${modelo.arquivo}`);
      fail++; continue;
    }
    const conteudo = fs.readFileSync(caminhoLocal, "utf-8");
    try {
      const busca = await drive.files.list({
        q: `name='${modelo.nome}' and '${PASTA_DESTINO_ID}' in parents and trashed=false`,
        fields: "files(id,name)",
      });
      if (busca.data.files && busca.data.files.length > 0) {
        await drive.files.update({
          fileId: busca.data.files[0].id!,
          requestBody: { description: modelo.descricao },
          media: { mimeType: "text/plain", body: Readable.from([conteudo]) },
        });
        console.log(`↺  Atualizado: ${modelo.nome}`);
      } else {
        await drive.files.create({
          requestBody: { name: modelo.nome, parents: [PASTA_DESTINO_ID], description: modelo.descricao },
          media: { mimeType: "text/plain", body: Readable.from([conteudo]) },
          fields: "id,name",
        });
        console.log(`✓  Enviado: ${modelo.nome}`);
      }
      ok++;
    } catch (err: any) {
      console.error(`✗  Erro em ${modelo.nome}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n══════════════════════════════`);
  console.log(`  ${ok} enviados | ${fail} com falha`);
  console.log(`  Pasta: https://drive.google.com/drive/folders/${PASTA_DESTINO_ID}`);
  console.log(`══════════════════════════════`);
}

main().catch(console.error);

// PATCH: adicionado inline — rodar separadamente para a série luxo
