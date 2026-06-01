# Release

## Cum creezi o versiune noua

1. Modifica `version` in `package.json`.
2. Fa commit cu modificarile.
3. Creeaza si publica tag-ul:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

4. GitHub Actions ruleaza workflow-ul de release si publica artefactele in GitHub Releases.
5. Aplicatiile instalate pot verifica manual update-ul din Settings.

## Note

- Update-ul este manual din Settings; aplicatia nu verifica si nu instaleaza automat la pornire.
- Aplicatia este momentan nesemnata.
- Windows poate afisa un warning pentru publisher necunoscut.
- Release-ul publicat in GitHub Releases trebuie sa includa installerul Windows si `latest.yml`, folosit de updater.
