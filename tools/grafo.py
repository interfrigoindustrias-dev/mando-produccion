# -*- coding: utf-8 -*-
"""Reconstruye el grafo de conocimiento del proyecto.

    python tools/grafo.py

Extrae por AST (sin coste de tokens), agrupa en comunidades y las etiqueta
automaticamente a partir del archivo dominante de cada grupo. Automatico a
proposito: los identificadores de comunidad cambian en cada reconstruccion, asi
que unas etiquetas fijas se desalinearian al primer cambio de codigo.

Salidas en graphify-out/: graph.json, graph.html y GRAPH_REPORT.md
"""
import json
import os
import sys
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.detect import detect
from graphify.export import to_html, to_json
from graphify.extract import collect_files, extract
from graphify.report import generate

RAIZ = Path(__file__).resolve().parent.parent
os.chdir(RAIZ)
OUT = Path("graphify-out")
OUT.mkdir(exist_ok=True)

# Nombre en castellano por archivo. Lo que no este aqui usa el nombre del archivo.
NOMBRES = {
    "constantes.js": "Constantes del modelo",
    "util.js": "Utilidades y fechas",
    "config.js": "Configuracion del usuario",
    "auth.js": "Autenticacion con Google",
    "api.js": "Cliente de Google Sheets",
    "auditoria.js": "Historial de cambios",
    "datos.js": "Carga y refresco",
    "automatizaciones.js": "Automatizaciones de fecha",
    "control.js": "Control de OPs",
    "ficha.js": "Ficha de la puerta",
    "comun.js": "Ayudantes de tableros",
    "planta.js": "Vista de planta",
    "dashboards.js": "Tableros y catalogo",
    "impresion.js": "Impresion",
    "app.js": "Navegacion y arranque",
    "pwa.js": "Instalacion como app",
    "sw.js": "Service worker",
    "deploy.sh": "Despliegue",
}


def main():
    deteccion = detect(Path("."))
    print(f"corpus: {deteccion['total_files']} archivos")

    codigo = []
    for f in deteccion.get("files", {}).get("code", []):
        p = Path(f)
        codigo.extend(collect_files(p) if p.is_dir() else [p])
    ast = extract(codigo, cache_root=Path("."))
    print(f"AST: {len(ast['nodes'])} nodos, {len(ast['edges'])} aristas (0 tokens)")

    extraccion = {
        "nodes": ast["nodes"], "edges": ast["edges"], "hyperedges": [],
        "input_tokens": 0, "output_tokens": 0,
    }
    (OUT / ".graphify_extract.json").write_text(
        json.dumps(extraccion, indent=2, ensure_ascii=False), encoding="utf-8")

    G = build_from_json(extraccion, root=".", directed=False)
    if G.number_of_nodes() == 0:
        sys.exit("ERROR: el grafo salio vacio")

    comunidades = cluster(G)

    # Etiqueta = archivo que aporta mas nodos al grupo.
    origen = {n: (G.nodes[n].get("source_file") or "") for n in G.nodes}
    etiquetas = {}
    for cid, miembros in comunidades.items():
        cuenta = {}
        for m in miembros:
            base = os.path.basename(str(origen.get(m, "")).replace(chr(92), "/"))
            if base:
                cuenta[base] = cuenta.get(base, 0) + 1
        if cuenta:
            dominante = max(cuenta, key=cuenta.get)
            etiquetas[cid] = NOMBRES.get(dominante, dominante)
        else:
            etiquetas[cid] = f"Grupo {cid}"

    cohesion = score_all(G, comunidades)
    dioses = god_nodes(G)
    sorpresas = surprising_connections(G, comunidades)
    preguntas = suggest_questions(G, comunidades, etiquetas)
    tokens = {"input": 0, "output": 0}

    grafo = OUT / "graph.json"
    if grafo.exists():
        grafo.unlink()          # permitir que el grafo encoja si se borro codigo
    to_json(G, comunidades, str(grafo), community_labels=etiquetas)
    (OUT / "GRAPH_REPORT.md").write_text(
        generate(G, comunidades, cohesion, etiquetas, dioses, sorpresas,
                 deteccion, tokens, ".", suggested_questions=preguntas),
        encoding="utf-8")
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in etiquetas.items()}, ensure_ascii=False),
        encoding="utf-8")
    to_html(G, comunidades, str(OUT / "graph.html"), community_labels=etiquetas)

    print(f"grafo: {G.number_of_nodes()} nodos, {G.number_of_edges()} aristas, "
          f"{len(comunidades)} comunidades")
    print("mas conectados: " + ", ".join(
        f"{d.get('id', d)} ({d.get('degree', '')})" for d in dioses[:5]))


if __name__ == "__main__":
    main()
