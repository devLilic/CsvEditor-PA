# Audit Tales Web / Tales desktop — 02.11.2026

Stare: audit de cod și propunere de arhitectură. Recomandările de mai jos nu sunt încă implementate. Auditul folosește specialiști gpt-6-luna pentru desktop și Laravel/DB. Nu s-au rulat suite de teste pentru acest raport.

## Cerința confirmată în timpul auditului

- Importul aduce conținutul ediției: valori, secțiuni Platou/Beta, ordine și divizoare.
- Tales desktop are propriile template-uri TED și imagini configurate. Importul nu trebuie să înlocuiască documentul TED, paletele, prefixele sau configurația locală a emisiunii și nu trebuie să descarce imaginile TED.
- Sincronizarea conținutului nu modifică TED în Web sau desktop. Nu este necesară sincronizarea graficii pentru a sincroniza titlurile.
- Desktopul salvează CSV-urile înainte de a trimite datele ediției către API. DB rămâne arhiva comună a edițiilor.
- Accesul desktop folosește secretul comun, independent de sesiunile utilizatorilor Web.
- Numele lb-portal sunt contracte de export importante. Compatibilitatea lor trebuie verificată fără rescriere automată a configurației locale.

## Constatări din implementarea actuală

| Prioritate | Constatare | Efect |
| --- | --- | --- |
| Critică | `EditorHeader.handleTalesWebImport` aplică documentul TED, prefixul, numele de export și lower-third-urile primite; handlerul Electron descarcă inclusiv asset-uri TED. | Importul schimbă configurația desktop, contrar cerinței confirmate. Corectarea acestui comportament precedă sincronizarea bidirecțională. |
| Critică | Desktopul scrie CSV la salvare; Web scrie la Publică. Blocarea publicării Web este în DB, iar coada desktop este în procesul Electron. | Dacă destinațiile sunt același director fizic, scrierile se pot intercala. Niciuna dintre blocări nu coordonează ambele aplicații. |
| Ridicată | Fișierul local `ShowEditionFile` păstrează showProjectId și entities, dar importul nu persistă ID-ul ediției Web și revizia primită. | Nu există încă o destinație sigură pentru actualizările ulterioare. Numele sau data ediției nu identifică unic ediția. |
| Ridicată | API-ul desktop are doar GET; fluxul Web de autosave cere User, lockToken și expectedRevision. | Adăugarea unui PUT trebuie să integreze controlul concurenței și identitatea integrării. Nu se poate reutiliza orbește endpointul browserului. |
| Ridicată | La adăugarea unei persoane, `savePersonEntity` execută reducerul pentru nextState, apoi dispatch execută din nou acțiunea care generează UUID-uri. | Salvarea imediată poate avea ID-uri diferite de starea React, înainte ca autosave să le rescrie. Unitatea salvată și sincronizată trebuie să provină dintr-o singură generare a ID-urilor. |
| Ridicată | Conținutul live și configurația din snapshot sunt citite separat; endpointul template poate lua o revizie istorică anterioară. | Un import nu reprezintă neapărat aceeași stare de conținut și configurație. Importul exclusiv de conținut elimină dependența de TED, dar conținutul și revizia trebuie citite coerent. |
| Ridicată | Publisher-ul Web consultă lower-third-urile curente chiar dacă există snapshot istoric. | Numele lb-portal publicate pot diferi de mapările păstrate pentru ediție. Necesită o decizie explicită de contract de export. |
| Ridicată | Imaginile telefonice importate sunt rescrise din asset:UUID în căi locale Windows. | Trimiterea înapoi a snapshot-ului local ar introduce în Web căi pe care browserul nu le poate utiliza. Aceste câmpuri nu se sincronizează orbește. |
| Medie | CSV-ul exportat nu conține ID-uri; parserul CSV generează ID-uri noi. JSON-ul local păstrează ID-urile. | Sincronizarea trebuie construită din starea JSON, nu din reparsarea CSV-ului pentru emisie. |
| Medie | Exportul desktop scrie fișierele separat, direct; Web folosește fișiere temporare, dar șterge destinația înainte de rename. | Un set de CSV-uri nu este atomic. Există risc de set parțial sau fișier temporar absent pentru cititorul lb-portal. |

Surse principale: `electron/main/tales-web-handlers.ts`, `src/ui/components/layout/EditorHeader.tsx`, `src/features/show-projects/domain/showEdition.ts`, `src/features/csv-editor/hooks/useEntities.ts`, `src/features/csv-editor/state/csv.reducer.ts`, `electron/main/csv-handlers.ts`, `electron/main/entity-export-service.ts`; în Web: `routes/api.php`, `app/Http/Controllers/DesktopApiShowController.php`, `app/Services/EditionWorkflow.php`, `app/Services/Publication/EditionPublisher.php`, `app/Services/Publication/PublicationFileWriter.php`.

## Modelul recomandat

### Identitatea și responsabilitatea datelor

DB păstrează ediția comună și istoricul. API-ul validează și salvează datele în DB. Desktopul păstrează o copie locală durabilă pentru operare și produce CSV-urile cu configurația sa locală. Interfața Web editează ediția din DB; salvarea Web nu publică automat.

Se păstrează modelul existent `editions.content_json`; nu este necesar acum un tabel SQL pentru fiecare titlu. Pentru actualizări se transmite starea completă a conținutului acceptat, cu ID-uri stabile. Aceasta păstrează ordinea, ștergerile și structura Beta fără zeci de operații individuale.

Full snapshot înseamnă conținutul ediției, nu ShowProject/TED/setările aplicației. API-ul acceptă explicit câmpurile de conținut și respinge modificările configurației. Elementele importate își păstrează ID-ul; un element creat local primește un UUID o singură dată; reeditarea nu schimbă ID-ul.

Asocierea locală trebuie să cuprindă: identitatea serverului, webShowId, webEditionId, localEditionUuid, ultima revizie confirmată și hash-ul ultimei stări confirmate. Ea aparține ediției, nu doar emisiunii. „Ediție nouă” creează o nouă identitate și nu reutilizează destinația vechii ediții. Edițiile vechi fără asociere cer alegerea explicită a ediției Web înainte de prima sincronizare.

### Salvare locală și recuperare după întrerupere

1. Generează un snapshot fix și un operationId. Scrie local intenția de sincronizare cu starea `waiting_for_csv`; încă nu se face nicio cerere de scriere către API.
2. Salvează JSON-ul local și toate CSV-urile necesare, inclusiv fluxurile separate precum Quick Titles dacă sunt incluse în snapshot.
3. Numai după succesul întregului export marchează operația `ready` și trimite snapshot-ul în fundal.
4. API-ul confirmă revizia salvată; desktopul persistă confirmarea și actualizează starea afișată.
5. La eroare de rețea sau restart, reia operația. O intenție rămasă `waiting_for_csv` necesită recuperarea/verificarea exportului înainte de trimitere.

Coada este durabilă și proprie calculatorului; nu se păstrează doar în React. Se trimite o singură operație odată pentru o ediție. Modificările încă netrimise se pot grupa în cea mai nouă stare; o cerere deja trimisă și neconfirmată își păstrează operationId și payload-ul. Revizia de bază pentru următoarea cerere se avansează numai după confirmare.

API-ul înregistrează operationId împreună cu destinația, hash-ul payload-ului și revizia rezultată, în aceeași tranzacție cu ediția. Repetarea aceleiași operații întoarce aceeași confirmare; reutilizarea ID-ului cu alt conținut este respinsă. Astfel, pierderea răspunsului după commit nu creează o nouă ediție sau o revizie duplicată.

### Conflicte și lucru simultan

Fiecare cerere include expectedRevision. Serverul blochează rândul ediției în tranzacție, verifică asocierea, starea ediției și dreptul de scriere, apoi compară revizia. Dacă s-a schimbat între timp, răspunde 409 și nu suprascrie datele.

Se recomandă un singur editor activ per ediție, prin extinderea mecanismului existent la deținător de tip utilizator Web sau dispozitiv desktop. Alți operatori pot lucra la alte ediții/emisiuni. Dispozitivul are un identificator și o etichetă pentru jurnal; acestea nu sunt conturi de logare și nu dovedesc identitatea unei persoane când toate dispozitivele folosesc același secret.

Întreruperea conexiunii nu oprește lucrul local. La reconectare, revizia se verifică din nou. Dacă Web a modificat ediția, starea locală rămâne salvată și poate fi încărcată ca ediție separată ori reconciliată explicit. Nu se face „ultima salvare câștigă” și nu se rezolvă conflictul descărcând automat peste CSV-urile de emisie.

Ștergerea unui element este reflectată în snapshot. Ștergerea/arhivarea unei ediții este operație separată; un client rămas offline nu trebuie să reactiveze automat o ediție arhivată. Restaurarea unui backup trebuie să definească explicit dacă se reia aceeași ediție sau se creează una nouă.

### Cine scrie directorul de emisie

Pentru fiecare emisiune trebuie definit un singur responsabil pentru directorul de emisie. Recomand modul „Desktop responsabil de emisie” când desktopul trebuie să scrie CSV înainte de API. Web poate continua pregătirea edițiilor în DB, dar publicarea directă în același director este oprită cât timp desktopul are acest rol.

Se poate păstra și modul „Web responsabil de emisie”, cu transfer explicit al responsabilității. Nu se transferă automat rolul doar fiindcă a expirat un heartbeat: desktopul poate fi deconectat de API și totuși poate scrie pe share. Pentru control strict sunt necesare drepturi de fișiere, un writer unic sau un mecanism comun respectat de toate procesele; o coloană în DB singură nu blochează accesul Windows la fișiere.

Opțional, ulterior, Publică din Web poate crea o comandă pentru desktopul responsabil. Web marchează publicarea ca finalizată abia după confirmarea scrierii CSV-urilor de către desktop. Asta este o funcționalitate separată de salvarea conținutului în DB.

### TED, lb-portal și câmpurile imagine

Eliminarea aplicării automate a TED și a descărcării imaginilor TED din import este prima corecție. Importul nu trebuie să apeleze saveProject pentru a suprascrie configurația locală. Ediția folosește grafica deja configurată în desktop.

ID-urile tipurilor lower-third și numele lb-portal trebuie să aibă o asociere verificată între emisiunea Web și proiectul desktop. Dacă un tip importat nu există local, importul semnalează incompatibilitatea și cere mapare; nu substituie tacit varianta ordinary și nu rescrie numele exporturilor. Desenele TED pot rămâne diferite în cele două aplicații.

Nu se descarcă automat imagini în fluxul de import al valorilor. Pentru Phone, textul poate fi sincronizat la fel ca pentru celelalte categorii, dar imaginea trebuie tratată separat: o cale Windows locală nu poate înlocui asset:UUID din Web. Recomand păstrarea separată a referinței Web și a rezolvării locale; reeditările textului păstrează imaginea deja asociată în DB. Pentru un Phone nou creat în desktop trebuie definit ulterior un flux explicit de asociere/încărcare a imaginii dacă se dorește afișarea ei și în Web. Un PUT de conținut trebuie să păstreze câmpurile excluse din sincronizare, nu să le golească implicit.

Transformarea uppercase trebuie definită la nivelul exportului/prezentării. Desktopul aplică în prezent unele transformări și asupra datelor persistate; sincronizarea lor ar schimba și textul canonic din Web. Recomand păstrarea textului introdus ca valoare comună și aplicarea transformării locale la export, cu verificarea compatibilității înaintea unei schimbări de comportament.

### Date suplimentare propuse

- Metadate locale de asociere per ediție și coadă durabilă cu snapshot, operationId, revizie de bază, stare export și stare sincronizare.
- Evidență server pentru cereri procesate: cheie unică a operației, ediție, dispozitiv, hash și revizie rezultată.
- Extinderea blocărilor ediției pentru dispozitive, cu tipul deținătorului explicit.
- Jurnal sursă Web/desktop și identificator de dispozitiv. Câmpurile updated_by/saved_by sunt deja nullable; nu se atribuie artificial modificările unui admin.
- Responsabil de emisie per show și ultima generație CSV confirmată, separat de ultima revizie salvată în DB.

Secretul comun continuă să autorizeze integrarea. Nu devine implicit identitate de utilizator. Endpointurile noi acceptă numai operațiile de conținut convenite și verifică show/edition; nu acceptă căi de export sau drepturi admin din payload.

## Ordinea de implementare recomandată

1. Corectarea importului la conținut exclusiv, stabilizarea UUID-urilor și persistarea asocierii cu ediția Web. Clarificarea responsabilului CSV și a câmpului Phone image.
2. API de salvare/create cu validare, revizii, idempotency și blocări compatibile Web/desktop. Citirea conținutului și a reviziei trebuie să fie coerentă.
3. Coada locală și recuperarea după restart; CSV înainte de API; notificări distincte pentru salvat local, nesincronizat, sincronizat și conflict.
4. Controlul publicării din ambele aplicații și al transferului de responsabilitate; corectarea consistenței mapărilor lb-portal.

## Verificări necesare la implementare

- Importul nu modifică documentul TED, imaginile, prefixele și mapările locale.
- Adăugare/reeditare: același ID în React, JSON local, coadă și DB; fără duplicate la retransmitere.
- Ștergere, reordonare, divizoare, Quick Titles și Beta; tip lower-third necunoscut și mapare lb-portal incompatibilă.
- Un CSV eșuează: API-ul nu primește snapshot-ul drept salvat pentru emisie; recuperare după crash în fiecare etapă.
- Răspuns API pierdut după commit, retransmitere, reconectare și restart: o singură operație aplicată.
- Modificare Web concurentă: 409, ambele variante păstrate; ediție nouă nu actualizează ediția precedentă.
- Phone: reeditarea textului păstrează referința de imagine Web; nicio cale Windows trimisă ca asset Web.
- Două procese/calculatoare încearcă publicarea aceleiași emisiuni: responsabil unic și raportarea corectă a scrierilor parțiale.

Teste unitare pentru reguli; integrare pentru DB, concurență și fișiere. E2E numai pentru un flux critic de emisie care nu poate fi demonstrat suficient la nivelurile anterioare. Auditul de față nu certifică funcționarea pe share-ul real sau coordonarea efectivă cu lb-portal.
