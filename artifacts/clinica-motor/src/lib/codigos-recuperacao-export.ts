// Task #223 — exportar codigos de recuperacao 2FA em TXT/PDF.
// Como os codigos so aparecem UMA UNICA VEZ no front (backend nao guarda
// em claro), a geracao do arquivo precisa ser client-side. Pra evitar
// dependencia nova (jspdf/pdf-lib), o PDF e construido a mao com a
// estrutura minima do PDF 1.4 + fonte Courier (built-in, monoespacada).

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function nomeArquivoBase(nomeUsuario: string) {
  const slug = nomeUsuario
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "usuario";
  const data = new Date().toISOString().slice(0, 10);
  return `pawards-codigos-recuperacao-2fa-${slug}-${data}`;
}

export function baixarCodigosTxt(
  codigos: string[],
  nomeUsuario: string,
  email: string,
) {
  const dataLegivel = new Date().toLocaleString("pt-BR");
  const linhas = [
    "PAWARDS - Codigos de recuperacao 2FA",
    "=====================================",
    "",
    `Usuario: ${nomeUsuario}`,
    `Email:   ${email}`,
    `Gerado:  ${dataLegivel}`,
    "",
    "Cada codigo serve UMA UNICA VEZ. Guarde em local seguro",
    "(cofre fisico ou gerenciador de senhas). Nao compartilhe.",
    "",
    "Codigos:",
    "",
    ...codigos.map((c) => `  ${c}`),
    "",
  ];
  const blob = new Blob([linhas.join("\n")], {
    type: "text/plain;charset=utf-8",
  });
  baixarBlob(blob, `${nomeArquivoBase(nomeUsuario)}.txt`);
}

// Escapa caracteres especiais do PDF dentro de literais string (parenteses
// e barra invertida). Mantem ASCII apenas — caracteres acentuados sao
// transliterados pra ASCII via NFD pra evitar precisar embutir fonte.
function escaparPdfString(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function baixarCodigosPdf(
  codigos: string[],
  nomeUsuario: string,
  email: string,
) {
  const dataLegivel = new Date().toLocaleString("pt-BR");

  // Monta o conteudo da pagina como uma sequencia de operadores de texto
  // PDF. Cada bloco BT...ET posiciona uma linha. Coordenadas em pontos
  // (1/72in); pagina A4 = 595 x 842.
  type Linha = { texto: string; x: number; y: number; fonte: "F1" | "F2"; tamanho: number };
  const linhas: Linha[] = [];

  let y = 800;
  linhas.push({ texto: "PAWARDS", x: 50, y, fonte: "F2", tamanho: 18 });
  y -= 22;
  linhas.push({
    texto: "Codigos de recuperacao - autenticacao em duas etapas",
    x: 50,
    y,
    fonte: "F2",
    tamanho: 11,
  });
  y -= 30;
  linhas.push({ texto: `Usuario: ${nomeUsuario}`, x: 50, y, fonte: "F1", tamanho: 11 });
  y -= 16;
  linhas.push({ texto: `Email:   ${email}`, x: 50, y, fonte: "F1", tamanho: 11 });
  y -= 16;
  linhas.push({ texto: `Gerado:  ${dataLegivel}`, x: 50, y, fonte: "F1", tamanho: 11 });
  y -= 28;
  linhas.push({
    texto: "Cada codigo serve UMA UNICA VEZ. Guarde em local seguro",
    x: 50,
    y,
    fonte: "F1",
    tamanho: 10,
  });
  y -= 14;
  linhas.push({
    texto: "(cofre fisico ou gerenciador de senhas). Nao compartilhe.",
    x: 50,
    y,
    fonte: "F1",
    tamanho: 10,
  });
  y -= 26;
  linhas.push({ texto: "Codigos:", x: 50, y, fonte: "F2", tamanho: 12 });
  y -= 20;

  for (const c of codigos) {
    linhas.push({ texto: c, x: 70, y, fonte: "F2", tamanho: 13 });
    y -= 20;
  }

  y -= 10;
  linhas.push({
    texto: "Pawards - plataforma clinica integrativa",
    x: 50,
    y: 40,
    fonte: "F1",
    tamanho: 8,
  });

  const stream = linhas
    .map(
      (l) =>
        `BT /${l.fonte} ${l.tamanho} Tf ${l.x} ${l.y} Td (${escaparPdfString(l.texto)}) Tj ET`,
    )
    .join("\n");

  const objetos: string[] = [];
  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objetos.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
  );
  objetos.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  baixarBlob(blob, `${nomeArquivoBase(nomeUsuario)}.pdf`);
}
