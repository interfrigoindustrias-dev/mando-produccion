# -*- coding: utf-8 -*-
"""Avisa cuando el JS compartido da por hecho un elemento que solo existe en una pagina.

POR QUE EXISTE
    puertas.html y paneles.html comparten casi todo el JavaScript, pero no
    tienen los mismos controles: el filtro de ensamble, el cronograma, los
    campos de visor y bumper o el tablero de calidad son solo de puertas.

    Un `$("#loQueSea").onclick = ...` sobre algo que no existe lanza un
    TypeError que corta la carga del archivo ENTERO y deja sin enganchar todo
    lo que viene despues. El sintoma no se parece a la causa: la tabla aparece
    vacia, o un boton deja de responder, y nada dice por que.

    Paso varias veces seguidas. Este script lo caza antes de publicar.

QUE CUENTA COMO PROTEGIDO
    · en la misma linea:   $("#x") && $("#x").value        |  $("#x") ? ... : ...
    · guardado en variable: const e = $("#x"); if(e) e.onclick = ...
    · dentro de un bloque:  if($("#x")){ ... }  o  $("#x") ? [...] : []

    Un bloque abierto tras comprobar UN elemento vale por todo lo que hay
    dentro: quien escribio la comprobacion lo hizo para ese grupo entero, y
    exigir una por campo llenaria el codigo de ruido sin ganar nada.

USO
    python tools/comprobar_ids.py        (devuelve 1 si encuentra algo)
"""

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "src"
PAGINAS = ["puertas.html", "paneles.html"]

ACCESO = re.compile(
    r'\$\("#([a-zA-Z0-9_-]+)"\)\s*\.\s*'
    r'(onclick|onchange|oninput|addEventListener|value|checked|innerHTML|'
    r'textContent|disabled|classList|dataset|options|focus|click)'
)
# Aperturas de bloque que protegen lo de dentro.
GUARDA_BLOQUE = re.compile(r'if\s*\(\s*\$\("#([a-zA-Z0-9_-]+)"\)\s*\)')
# Ternaria que comprueba antes de usar: $("#x") ? [ ... ] : []
GUARDA_TERNARIA = re.compile(r'\$\("#[a-zA-Z0-9_-]+"\)\s*\?')
# Elemento guardado en una variable: a partir de ahi se usa la variable.
EN_VARIABLE = re.compile(r'(?:const|let|var)\s+\w+\s*=\s*\$\("#([a-zA-Z0-9_-]+)"\)')


def leer(p):
    return (RAIZ / p).read_text(encoding="utf-8")


def ids_de(pagina):
    return set(re.findall(r'id="([a-zA-Z0-9_-]+)"', leer(pagina)))


def scripts_de(pagina):
    return set(re.findall(r'<script src="js/([a-z_]+\.js)"', leer(pagina)))


def protegido_en_linea(linea, ident, pos):
    """El propio renglon comprueba antes de usar."""
    antes = linea[:pos]
    return (f'$("#{ident}")&&' in antes.replace(" ", "")
            or f'$("#{ident}")?' in antes.replace(" ", "")
            or f'$("#{ident}")&&' in linea.replace(" ", "")[:linea.replace(" ", "").find(".")+1])


def main():
    ids = {p: ids_de(p) for p in PAGINAS}
    scripts = {p: scripts_de(p) for p in PAGINAS}
    hallazgos = []

    for js in sorted(RAIZ.joinpath("js").glob("*.js")):
        cargan = [p for p in PAGINAS if js.name in scripts[p]]
        if len(cargan) < 2:          # exclusivo de una pagina: no hay riesgo
            continue

        lineas = js.read_text(encoding="utf-8").splitlines()
        en_variable = set()
        # Profundidades a las que se abrio una comprobacion. Mientras la pila
        # tenga algo, estamos dentro de una region ya protegida.
        pila = []
        prof = 0

        for n, linea in enumerate(lineas, 1):
            sin_texto = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', linea)
            abre = sum(sin_texto.count(c) for c in "{[(")
            cierra = sum(sin_texto.count(c) for c in "}])")

            for m in EN_VARIABLE.finditer(linea):
                en_variable.add(m.group(1))

            guarda = GUARDA_BLOQUE.search(linea) or GUARDA_TERNARIA.search(linea)

            if not pila:
                for m in ACCESO.finditer(linea):
                    ident = m.group(1)
                    if ident in en_variable:
                        continue
                    if protegido_en_linea(linea, ident, m.start()):
                        continue
                    if guarda and m.start() > guarda.start():
                        continue          # la comprobacion va delante en el renglon
                    faltan = [p for p in cargan if ident not in ids[p]]
                    if faltan:
                        hallazgos.append((js.name, n, ident, faltan, linea.strip()[:86]))

            if guarda and abre > cierra:
                pila.append(prof)

            prof += abre - cierra
            while pila and prof <= pila[-1]:
                pila.pop()

    if not hallazgos:
        print("OK - ningun acceso sin comprobar en el JS compartido.")
        return 0

    print(f"{len(hallazgos)} acceso(s) que pueden romper una de las paginas:\n")
    for archivo, n, ident, faltan, linea in hallazgos:
        print(f"  {archivo}:{n}  #{ident}  falta en: {', '.join(faltan)}")
        print(f"      {linea}")
    print('\nProtegelo:  const e = $("#id"); if(e) e.onclick = ...')
    return 1


if __name__ == "__main__":
    sys.exit(main())
