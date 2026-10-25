# Plateau Divider UI

Butonul `Separator` apare in editor numai pentru `PLATOU > Titles`. Este disponibil atat in modul normal, cat si in Edit Mode, si nu depinde de setarea Drag-and-Drop.

La click, separatorul este inserat dupa titlul selectat. Daca nu exista un titlu selectat sau selectia nu poate fi folosita, separatorul este adaugat la finalul listei de titluri PLATOU.

Dividerul nu are text editabil, numar, checkbox sau formular propriu. In lista este afisat doar ca o linie vizuala discreta. Markerul `[ DIVIDER ]` este pastrat in datele interne ale proiectului si nu este afisat in UI.

Nu pot exista doua dividers consecutive. Regula se aplica atat la adaugare, cat si la drag-and-drop: daca pozitia propusa ar pune doua separatoare unul langa altul, modificarea este refuzata si apare mesajul `Nu pot fi adăugate două separatoare consecutive.`

Stergerea se face din controlul mic de delete al liniei dividerului. Stergerea elimina doar dividerul indicat si nu afecteaza titlurile vecine.

Mutarea dividerului nu este implementata aici. Reordonarea va fi gestionata separat prin fluxul Drag-and-Drop.

La adaugare sau stergere, fluxul salveaza starea proiectului in JSON si actualizeaza exporturile configurate in folderul `Export`. Exporturile pentru emisie nu contin dividerul. Daca salvarea starii proiectului sau un export critic esueaza, modificarea este respinsa si state-ul ramane la versiunea anterioara.
