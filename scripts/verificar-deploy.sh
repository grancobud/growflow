#!/usr/bin/env bash
# Verifica que un deploy de growflow llevó un cambio, y que pega contra su base.
#
#   bash scripts/verificar-deploy.sh 'min-h-\[56px\] rounded-lg'
#
# POR QUÉ EXISTE
#
# El 28/08/2026 reporté tres veces «deploy pendiente» sobre deploys que ya
# estaban publicados. Las tres veces el error fue mío, y siempre el mismo:
#
#   1. Enumerar los chunks con un regex que sólo tomaba los del índice. El
#      índice NO referencia todos: hay chunks que se cargan desde otros chunks,
#      así que hay que caminar el grafo dos niveles.
#   2. Buscar la AUSENCIA de una clase vieja (`sm:grid-cols-3`) como señal de
#      código nuevo. Esa clase la usaban además otros componentes que no había
#      tocado, así que daba «viejo» para siempre.
#   3. Buscar el marcador en el chunk equivocado: el cambio vivía en
#      `FilaTocable-*.js` y yo miraba `PaginaCosecha-*.js`.
#
# La regla: buscar un string que SÓLO exista después del cambio, en TODOS los
# chunks. Si igual da «no está», mirar el estado real del deploy con
# `mcp__cloudflare-admin__pages_deployments_list` antes de decir que falta.
set -euo pipefail

sitio=growflow
marcador="${1:?falta el marcador que sólo existe después del cambio}"
base="https://growflow-5vs.pages.dev"

case "$sitio" in
  growflow) esperada=rtnidtpalynprizpbnuz; ajena=qivhrbsnvuaylqofpjti ;;
  *) echo "sitio desconocido: $sitio (growflow)" >&2; exit 2 ;;
esac

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
idx=$(curl -fsS "$base/" | grep -oP '/assets/[A-Za-z0-9_.-]+\.js' | head -1)
curl -fsS "$base$idx" > "$tmp/n1.js"

# Dos niveles: los chunks del índice, más los que ésos referencian.
nivel1=$(grep -oP '[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js' "$tmp/n1.js" | sort -u)
todos="$nivel1"
for c in $nivel1; do
  cuerpo=$(curl -fsS "$base/assets/$c" || true)
  printf '%s' "$cuerpo" > "$tmp/$c"
  todos="$todos $(printf '%s' "$cuerpo" | grep -oP '[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.js' || true)"
done
todos=$(printf '%s\n' $todos | sort -u)

encontrado=""
for c in $todos; do
  [ -s "$tmp/$c" ] || curl -fsS "$base/assets/$c" > "$tmp/$c" 2>/dev/null || continue
  grep -q "$marcador" "$tmp/$c" && encontrado="$encontrado $c"
done

n=$(printf '%s\n' $todos | wc -l)
if [ -n "$encontrado" ]; then
  echo "OK  $sitio: el cambio está publicado ($n chunks revisados) ->$encontrado"
else
  echo "NO  $sitio: el marcador no aparece en ninguno de los $n chunks."
  echo "    Antes de decir que falta desplegar: confirmar que el marcador existe"
  echo "    en el build local  ->  grep -l '$marcador' app/dist/assets/*.js"
  echo "    y mirar el estado real con pages_deployments_list."
fi

# La otra mitad: que el bundle pegue contra SU base y no contra la de al lado.
sup=$(grep -oP 'supabase-[A-Za-z0-9_-]+\.js' "$tmp/n1.js" | head -1)
if [ -n "$sup" ]; then
  cuerpo=$(curl -fsS "$base/assets/$sup")
  propia=$(printf '%s' "$cuerpo" | grep -c "$esperada" || true)
  otra=$(printf '%s' "$cuerpo" | grep -c "$ajena" || true)
  if [ "$propia" -ge 1 ] && [ "$otra" -eq 0 ]; then
    echo "OK  $sitio: apunta a su propia base ($esperada)."
  else
    echo "ALERTA  $sitio: propia=$propia ajena=$otra — revisar las env vars del proyecto de Pages."
  fi
fi
