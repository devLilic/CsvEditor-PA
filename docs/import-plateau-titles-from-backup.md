# Import titluri PLATOU din backup dedicat

Modalul de import foloseste backupurile dedicate de titluri create in folderul de backup configurat in Settings. Lista din partea stanga afiseaza doar fisierele dedicate cu nume de forma `DD_MM_YYYY_titluri.csv` sau `DD_MM_YYYY_titluri_N.csv`, ordonate cu cel mai recent primul. Backupurile normale ale CSV-ului complet nu sunt afisate.

In partea dreapta este afisata structura backupului selectat. Titlurile apar ca randuri selectabile, fiecare cu checkbox propriu. Separatoarele sunt afisate doar ca linii vizuale, in pozitia lor din backup; textul `[ DIVIDER ]` nu este afisat, iar separatoarele nu au checkbox si nu pot fi selectate.

Selectia este individuala si permite alegerea mai multor titluri. Nu exista actiuni globale de tip Select All sau Deselect All. Butonul Import ramane dezactivat pana cand exista cel putin un titlu selectat.

La import se preiau numai titlurile selectate, in ordinea lor din backup. Separatoarele si numerele vechi sunt ignorate. Duplicatele sunt permise.

Titlurile importate sunt adaugate la finalul sectiunii PLATOU. Dupa adaugare se recalculeaza `Nr` pentru toate titlurile din PLATOU.

Ordinea persistentei este:

1. Starea proiectului in JSON.
2. `PA_titles.csv`.
3. Backupul activ dedicat titlurilor, dupa succesul `PA_titles.csv`.
4. Restul exporturilor configurate.

Daca apare un esec critic la persistenta, importul face rollback la lista anterioara, modalul ramane deschis si se afiseaza eroarea. Daca fisierul selectat este invalid, modalul afiseaza eroarea controlat si nu blocheaza listarea celorlalte backupuri.
