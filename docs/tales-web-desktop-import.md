# Importarea edițiilor din Tales Web în Tales Desktop

## Scop și flux

Operatorul poate porni din editorul desktop importul unei ediții salvate în Tales Web. Integrarea citește emisiunile și edițiile accesibile prin API, permite selectarea unei ediții (inclusiv una arhivată), descarcă separat configurația TED asociată și înlocuiește conținutul de lucru local. CSV-urile continuă să fie scrise de fluxul existent din Tales Desktop; această integrare nu implementează un exportator CSV paralel.

La deschiderea selectorului, Tales încearcă să potrivească exact, fără diferențe de diacritice și majuscule, numele emisiunii locale cu un singur rezultat Tales Web. Operatorul poate schimba selecția. Edițiile arhivate rămân vizibile și sunt marcate în listă.

Înainte de înlocuire, operatorul confirmă acțiunea. Desktopul salvează un backup al ediției locale, aplică configurația de export și TED a ediției selectate, apoi încarcă entitățile și Quick Titles. Hook-ul existent de autosave persistă conținutul și actualizează CSV-urile proiectului local.

## Conexiune și securitate

- Nu se folosește autentificarea unui utilizator Tales Web și conexiunea este independentă de orice sesiune Web. În dialogul „Din Tales Web” se introduc URL-ul de bază și secretul comun de integrare read-only.
- Secretul este transmis și păstrat numai în procesul principal Electron, criptat prin `safeStorage`. Rendererul primește doar starea conexiunii și URL-ul; secretul nu este pus în `localStorage`, în proiectul Tales sau în fișierele de setări exportabile.
- Cererile API sunt făcute din procesul principal Electron cu `Authorization: Bearer …`; browserul rendererului nu comunică direct cu API-ul.
- Integrarea trebuie configurată ca acces read-only în Tales Web. Orice modificare a edițiilor se face în aplicația Web, iar Desktop doar le citește.

## Contract API folosit

- `GET /api/desktop/shows` → `{ shows: [{ id, slug, name }] }`
- `GET /api/desktop/shows/{show}/editions` → `{ editions: [{ id, name, theme, broadcastAt, revision, templateId, templateVersion, archived, updatedAt, isPublished }] }`
- `GET /api/desktop/shows/{show}/editions/{edition}` → `{ edition, content: { sections }, quickTitles }`
- `GET /api/desktop/shows/{show}/editions/{edition}/template` → documentul TemplateDocument, prefixul CSV, numele de export, lower-third-urile și setările lor pentru ediția selectată
- `GET /api/desktop/shows/{show}/editions/{edition}/assets/{asset}` → imaginea binară originală și tipul MIME

Răspunsurile JSON cu erori folosesc `{ message }`. Payload-urile de template și entități trebuie păstrate compatibile cu tipurile desktop `TemplateDocument`, `LowerThirdTypeDefinition`, `EntityTemplateNames` și `EntitiesState`.

## Imaginile entităților Phone

Referințele `asset:{UUID}` din persoanele care au imagine sunt descărcate individual în folderul `Telefon` al proiectului activ, cu numele UUID-ului și extensia determinată din MIME. Referințele `asset:{UUID}` din documentul TED (fundaluri și straturi imagine) se descarcă în `Telefon/TalesWebTED`; acestea sunt rescrise cu căi locale pentru ca preview-ul din desktop să le poată încărca.

## Garanții la import

- Un backup local trebuie creat cu succes înainte de schimbarea configurației sau a entităților.
- Mesajul de succes apare doar după ce autosave-ul existent confirmă scrierea datelor importate. Dacă scrierea eșuează după aplicarea configurației, desktopul încearcă să restaureze setările, conținutul, Quick Titles și CSV-urile anterioare; mesajul de eroare precizează dacă restaurarea CSV a eșuat.
- Configurația primită se aplică proiectului local activ; documentul TED global implicit al desktopului rămâne separat.
- Se păstrează structura secțiunilor, ordinea, divider-ele și secțiunile BETA primite din Web.
- Asset-urile TED sunt servite de API numai dacă apar în template-ul istoric al ediției solicitate; desktopul le descarcă local înainte să aplice documentul și nu lasă referințe `asset:` ne-rezolvate în preview.
- Secretul de integrare nu este logat și nu apare în erorile vizibile.
- Dacă API-ul, descărcarea imaginilor, backup-ul sau salvarea proiectului eșuează, importul nu trebuie prezentat ca reușit.

## Verificări

Testele unitare ale selectorului acoperă potrivirea emisiunii locale, selectarea edițiilor arhivate și apelul explicit de import. La schimbări de contract se actualizează tipurile IPC/API și acest document. Testele end-to-end se adaugă doar dacă o regresie importantă nu poate fi acoperită la nivel de componentă sau integrare.
