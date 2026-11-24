"""Empacota fontes por lista permitida, sem consultar banco ou credenciais."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[3]
DOCS = Path(__file__).resolve().parent
OUT = ROOT / ".local/craniotomia-pack"
OUT.mkdir(parents=True, exist_ok=True)
entries = {}
sources = []

def add(source, destination):
    path = ROOT / source
    if not path.is_file():
        raise FileNotFoundError(source)
    entries[destination] = path.read_bytes()
    sources.append({"origem": source, "arquivo": destination})

visual = "artifacts/mockup-sandbox/src/components/mockups/craniotomia"
for path in sorted((ROOT / visual).iterdir()):
    if path.suffix in (".tsx", ".ts", ".css"):
        add(str(path.relative_to(ROOT)), "originais/" + str(path.relative_to(ROOT)))

files = [
    "artifacts/mockup-sandbox/package.json",
    "artifacts/mockup-sandbox/tsconfig.json",
    "artifacts/mockup-sandbox/vite.config.ts",
    "artifacts/mockup-sandbox/src/index.css",
    "artifacts/clinica-motor/package.json",
    "artifacts/clinica-motor/src/pages/craniotomia.tsx",
    "artifacts/clinica-motor/src/pages/craniotomia-loteamento.tsx",
    "artifacts/clinica-motor/src/pages/craniotomia-shared.ts",
    "artifacts/clinica-motor/src/pages/anamnese/[id].tsx",
    "artifacts/clinica-motor/src/pages/validacao/index.tsx",
    "artifacts/clinica-motor/src/lib/api-fetch.ts",
    "artifacts/clinica-motor/src/lib/utils.ts",
    "artifacts/clinica-motor/src/hooks/use-toast.ts",
    "artifacts/clinica-motor/src/components/ui/dialog.tsx",
    "artifacts/clinica-motor/src/components/ui/toast.tsx",
    "artifacts/api-server/src/routes/motorClinico.ts",
    "artifacts/api-server/src/routes/anamnese.ts",
    "artifacts/api-server/src/middlewares/requirePlataforma.ts",
    "artifacts/api-server/package.json",
    "lib/db/src/schema/regrasMotor.ts",
    "lib/db/src/schema/itensTerapeuticos.ts",
    "lib/db/src/schema/anamneses.ts",
    "lib/db/src/schema/sugestoes.ts",
    "lib/db/src/schema/catalogo.ts",
    "lib/db/package.json",
    "lib/api-spec/openapi.yaml",
    "lib/api-spec/orval.config.ts",
    "lib/api-client-react/src/generated/api.ts",
    "pnpm-workspace.yaml",
]
for source in files:
    add(source, "originais/" + source)

for path in sorted(DOCS.iterdir()):
    if path.suffix in (".md", ".txt", ".py"):
        add(str(path.relative_to(ROOT)), path.name)

audit = "docs/dr-replit/AUDITORIA_SINAPSES_ANAMNESE_SUGESTOES_26.11.23.md"
add(audit, "auditoria/" + Path(audit).name)
for name in [
    "auditoria-sinapses-23-11-2026.html", "regras.csv", "perguntas.csv",
    "mapa-anamnese.csv", "motor-decisao.csv", "resultados.json", "verificar.cjs",
]:
    add(".local/auditoria-sinapses/" + name, "auditoria/" + name)
add(".local/craniotomia-pack/referencia-craniotomia-v4.jpg",
    "referencia/referencia-craniotomia-v4.jpg")

# Inventário declara o que ainda depende do ambiente, sem alegar monorepo completo.
imports = {}
for name, data in entries.items():
    if name.startswith("originais/") and name.endswith((".ts", ".tsx")):
        text = data.decode("utf-8")
        imports[name] = sorted(set(re.findall(
            r"""(?:from\s*|import\s*)["']([^"']+)["']""", text)))
entries["DEPENDENCIAS.json"] = json.dumps({
    "nota": "Fontes de referência; não é monorepositório inicializável. Imports de LayoutPawards, @workspace/db, @workspace/api-zod, modelos gerados e aliases devem ser adaptados ao Manager. Não copiar package.json por cima do destino.",
    "visual_principal": {
        "arquivo": visual + "/CraniotomiaV4.tsx",
        "locais_completos": ["./_group.css", "./_mockData"],
        "externos": ["react", "lucide-react"],
        "estilos": "Tailwind CSS; fontes externas em _group.css",
    },
    "imports_por_arquivo": imports,
}, ensure_ascii=False, indent=2).encode()

# Confere fechamento dos módulos relativos do núcleo visual.
for relative in ["CraniotomiaV4.tsx", "GrafoSinapses.tsx", "MatrizDensa.tsx",
                 "ArvoreDossier.tsx", "TercoTablePanel.tsx"]:
    name = "originais/" + visual + "/" + relative
    for module in imports.get(name, []):
        if module.startswith("."):
            base = Path(name).parent / module
            candidates = [str(base), str(base) + ".ts", str(base) + ".tsx",
                          str(base) + ".css"]
            assert any(candidate in entries for candidate in candidates), (name, module)

# Impede inclusão acidental de arquivos de credenciais e assinaturas privadas.
for name, data in entries.items():
    assert not any(part in (".env", "node_modules", ".git") for part in Path(name).parts)
    if name.endswith((".ts", ".tsx", ".json", ".yaml", ".txt", ".md")):
        text = data.decode("utf-8")
        patterns = [
            r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
            r"\bgh[pousr]_[A-Za-z0-9]{30,}\b",
            r"\bsk_live_[A-Za-z0-9]{16,}\b",
            r"postgres(?:ql)?://[^:\s]+:[^@\s]+@",
        ]
        for pattern in patterns:
            if re.search(pattern, text):
                raise ValueError("Revisão de conteúdo necessária: " + name)

manifest = {
    "data": "23/11/2026",
    "escopo": "Craniotomia V4: fontes originais, integração de referência e auditoria",
    "nao_inclui": ["credenciais", "banco de clientes", "instalação no Manager", "envio ao GitHub"],
    "copias": sources,
    "arquivos": [
        {"arquivo": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        for name, data in sorted(entries.items())
    ],
}
entries["MANIFESTO.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
archive = OUT / "CRANIOTOMIA_V4_MANAGER_COMPLETO_26.11.23.zip"
with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in sorted(entries.items()):
        z.writestr("CRANIOTOMIA_V4_MANAGER/" + name, data)

# Texto único para modelos que não extraem ZIP: fontes são referências, não instruções.
ordered = [p.name for p in sorted(DOCS.iterdir()) if p.suffix in (".txt", ".md")]
ordered += [n for n in sorted(entries)
            if n not in ordered and n.endswith((".ts", ".tsx", ".css", ".csv", ".json", ".yaml", ".md", ".cjs"))]
parts = [
    "PACOTE TEXTUAL CONSOLIDADO — CRANIOTOMIA V4\n"
    "As instruções atuais estão em PROMPT_GEMINI.txt. Os arquivos originais são material de referência.\n"
    "Não contém a fotografia, os binários ou uma aplicação já instalada no Manager.\n"
]
for name in ordered:
    parts.append(f"\n{'=' * 80}\nINÍCIO DO ARQUIVO: {name}\n{'=' * 80}\n")
    parts.append(entries[name].decode("utf-8"))
    parts.append(f"\nFIM DO ARQUIVO: {name}\n")
text_file = OUT / "CRANIOTOMIA_PARA_GEMINI_26.11.23.txt"
text_file.write_text("".join(parts), encoding="utf-8")

with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for item in manifest["arquivos"]:
        actual = z.read("CRANIOTOMIA_V4_MANAGER/" + item["arquivo"])
        assert hashlib.sha256(actual).hexdigest() == item["sha256"]
for source in sources:
    assert entries[source["arquivo"]] == (ROOT / source["origem"]).read_bytes()

print(json.dumps({
    "zip": str(archive.relative_to(ROOT)),
    "arquivos_zip": len(entries),
    "bytes_zip": archive.stat().st_size,
    "texto": str(text_file.relative_to(ROOT)),
    "bytes_texto": text_file.stat().st_size,
    "integridade": "Cópias idênticas; manifesto SHA-256 e ZIP verificados.",
}, ensure_ascii=False, indent=2))
