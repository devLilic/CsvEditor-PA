# Plateau Title Drag-and-Drop

Drag-and-drop este disponibil numai in `PLATOU > Titles` cand toate conditiile sunt indeplinite:

- sectiunea activa este `INVITATI`;
- tipul activ este `titles`;
- Edit Mode este activ;
- setarea `enablePlateauTitleDragDrop` este `true`.

Setarea este persistenta, are valoarea implicita `true` si poate fi modificata fara restart. Butonul pentru adaugarea separatorului ramane disponibil si cand drag-and-drop este dezactivat sau cand Edit Mode este oprit.

Pot fi mutate atat titlurile, cat si dividers. Dividerul ramane afisat ca linie vizuala, fara text editabil si fara markerul `[ DIVIDER ]` in UI. Handle-ul de mutare apare in interiorul itemului cand DnD este activ.

Nu pot exista doua dividers consecutive. Regula se aplica atat la adaugare, cat si la drag-and-drop: un drop invalid afiseaza mesajul `Nu pot exista doua separatoare consecutive.`, pastreaza ordinea veche si nu porneste persistenta.

Dupa reorder, numerele titlurilor sunt recalculate consecutiv. Divider-ele nu primesc numar.

Persistenta reorder-ului este tranzactionala: se pastreaza snapshot-ul vechi, UI-ul este actualizat optimist, apoi se scrie starea JSON a proiectului. Daca salvarea starii sau a exporturilor critice esueaza, lista revine la snapshot.

Fluxul existent de scriere actualizeaza:

- JSON-ul proiectului, care pastreaza `[ DIVIDER ]`;
- exportul `titles`, fara dividers;
- exportul `titles` cu coloanele configurate, fara dividers.
