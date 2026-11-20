#!/usr/bin/env bash
# Varre páginas e histórico do git atrás das strings proibidas.
# Lista real fica fora do repo: ../.proibido-ps.txt (ou PROIBIDO=caminho).
set -u
cd "$(dirname "$0")/.."
LISTA="${PROIBIDO:-../.proibido-ps.txt}"
[ -f "$LISTA" ] || { echo "Lista $LISTA não encontrada"; exit 2; }
falhou=0
while IFS= read -r linha; do
  [[ -z "$linha" || "$linha" == \#* ]] && continue
  if [[ "$linha" == re:* ]]; then pad="${linha#re:}"; opt=(-P -i); else pad="$linha"; opt=(-F -i); fi
  achou=$(grep -rn "${opt[@]}" --include='*.html' --include='*.js' --include='*.md' --include='*.css' --exclude-dir=.git --exclude-dir=_saidas-brutas -e "$pad" . | head -5)
  hist=$(git log --all -p 2>/dev/null | grep -c "${opt[@]}" -e "$pad")
  if [ -n "$achou" ] || [ "$hist" != "0" ]; then
    falhou=1; echo "FALHA: $pad (histórico: $hist)"; [ -n "$achou" ] && echo "$achou"
  fi
done < "$LISTA"
[ $falhou = 0 ] && echo "OK: nenhuma string proibida nas páginas nem no histórico."
exit $falhou
