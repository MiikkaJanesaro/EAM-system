# EAM-järjestelmä (Enterprise Asset Management)

Arkkitehtuurikaavion pohjalta rakennettu toimiva runko: kirjautuminen, etusivu/dashboard,
työkoneet, toimipaikat ja varastonhallinta. Työkoneen kortilla on huoltohistoria ja
tulevat määräaikaishuollot omina välilehtinään - juuri kuten alkuperäisessä kaaviossa.

**Tekninen pino:** React 19 + React Router 6 (Vite) frontendissä, Node.js + Express
backendissä, JWT-kirjautuminen. Backend käyttää tietovarastona **AWS DynamoDB:tä**
(viisi taulua: `eam-users`, `eam-locations`, `eam-assets`, `eam-inventory`,
`eam-workorders`) - ei enää paikallista JSON-tiedostoa. Kaikki reitit käyttävät
vain `utils/db.js`:n vientejä, joten tietovaraston voisi vaihtaa toiseen
(esim. RDS PostgreSQL) muuttamatta reittejä.

## Sisältö

```
eam-system/
  backend/          Node.js + Express -API
    routes/          auth, työkoneet, toimipaikat, varasto, työmääräykset
    middleware/auth.js   JWT-tarkistus suojatuille reiteille
    utils/db.js      DynamoDB-tietovarastokerros (AWS SDK v3)
    scripts/migrate-to-dynamodb.js   kertaluontoinen db.json -> DynamoDB -siirto
    db.json          alkuperäinen demodata (migraation lähde, ei enää ajonaikainen tietovarasto)
  frontend/          React-sovellus (Vite)
    src/pages/        Login, Dashboard, Assets, AssetDetail, Locations, LocationDetail, Inventory
    src/components/   Layout (sivupalkki), Modal, StatusPill, ProtectedRoute
    src/context/      AuthContext (JWT-tokenin hallinta)
    src/api/client.js fetch-kääre backendiin
```

## Käynnistys paikallisesti

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env      # muokkaa JWT_SECRET tuotannossa
npm run dev                # käynnistyy osoitteeseen http://localhost:4000
```

Backend lukee/kirjoittaa dataa AWS DynamoDB:hen, joten `~/.aws/credentials`-tiedostossa
pitää olla `.env`:n `AWS_PROFILE`-arvoa (`eam-app`) vastaava profiili ja viisi
`eam-`-alkuista taulua pitää olla olemassa valitussa `AWS_REGION`-alueessa
(ks. [Vienti AWS:ään](#vienti-awsn) alempana).

Valmis testitunnus (rooli `admin`): **käyttäjätunnus `admin`, salasana `admin123`**
(vaihda/poista ennen tuotantoon vientiä). Testitunnus mekaanikon roolille:
**`mekaanikko1` / `salasana123`**.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev                 # käynnistyy osoitteeseen http://localhost:5173
```

Vite proxaa kehityksessä `/api`-kutsut automaattisesti backendiin (ks. `vite.config.js`).

## Miten navigointi vastaa kaaviota

| Kaavion osa | Reitti | Sivu |
|---|---|---|
| Kirjautumissivu | `/login` | `Login.jsx` |
| Etusivu (Dashboard) | `/` (suojattu) | `Dashboard.jsx` – tilastokortit + tulevat/myöhässä olevat huollot |
| Työkoneet | `/assets` | `Assets.jsx` – listaus + "Lisää työkone" |
| Työkoneen kortti | `/assets/:id` | `AssetDetail.jsx` – välilehdet: Tiedot / Huoltohistoria / Määräaikaishuollot |
| Toimipaikat | `/locations` | `Locations.jsx` |
| Toimipaikkanäkymä | `/locations/:id` | `LocationDetail.jsx` – osoite, alue, siellä olevat koneet |
| Varastonhallinta | `/inventory` | `Inventory.jsx` – saldot ja nimikkeet |
| Asetukset | `/settings` | `Settings.jsx` – oman salasanan vaihto (kaikki), käyttäjien luonti (vain admin) |

Kaikki `/assets`, `/locations` ja `/inventory` -alaiset reitit ovat `ProtectedRoute`-
komponentin takana: jos JWT-tokenia ei ole tai se on vanhentunut, käyttäjä ohjataan
automaattisesti `/login`-sivulle.

## Objektien luonti ja päivitys (työkoneet ym.)

- **Luonti:** jokaisella listaussivulla (Työkoneet, Toimipaikat, Varasto) on
  "+ Lisää…" -nappi, joka avaa modaalin lomakkeella. Tallennus tekee `POST`-kutsun.
- **Päivitys:** työkoneen kortilla "Muokkaa"-nappi avaa saman lomakkeen esitäytettynä
  (`PUT`-kutsu). Varastonimikkeitä voi muokata klikkaamalla riviä.
- **Poisto:** "Poista"-napit tekevät `DELETE`-kutsun ja päivittävät listan.

Koska kaikki resurssit (`assets`, `locations`, `inventory`) käyttävät samaa
`crudFactory`-reititintä backendissä, uuden objektityypin lisääminen (esim.
"varaosatilaus") vaatii vain yhden rivin `server.js`:ään ja uuden React-sivun.

## Haku ja lajittelu

Jokaisella listasivulla (Työkoneet, Toimipaikat, Toimipaikan koneet, Varasto,
Käyttäjät, huoltotöiden Huoltohistoria/Määräaikaishuollot-taulukot) on
hakukenttä ja klikattavat sarakeotsikot lajittelua varten. Toteutus on jaettu
kaikkien sivujen kesken:

- `src/hooks/useTableControls.js` - hakusuodatus + lajittelu, toimii sekä
  suorilla kenttänimillä että laskettuja arvoja tuottavilla funktioilla
  (esim. työkoneen listassa haku toimii myös toimipaikan nimellä, ei vain
  työkoneen omilla kentillä).
- `src/components/SearchInput.jsx`, `src/components/SortableHeader.jsx` -
  yhteinen hakukenttä ja lajiteltava `<th>`-komponentti.

Haku ja lajittelu tapahtuvat selaimessa jo ladatulle datalle - ei uusia
API-kutsuja, koska tietomäärät ovat pieniä.

## Roolit ja oikeudet

Käyttäjillä on rooli (`admin` tai `mechanic`), joka tallentuu `eam-users`-tauluun
ja kulkee JWT-tokenissa. `requireRole("admin")`-middleware ([`middleware/auth.js`](backend/middleware/auth.js))
rajaa reittejä:

- **Pääkäyttäjä (`admin`):** näkee ja muokkaa kaikkea, ml. työkoneiden/toimipaikkojen/
  varaston luonti, muokkaus ja poisto, sekä käyttäjien hallinta (`/api/users`, ks. alla).
- **Mekaanikko (`mechanic`):** näkee kaiken, ja saa luoda/muokata/poistaa
  työmääräyksiä (`/api/workorders`) sekä lisätä niihin liitteitä - mutta ei voi
  muokata työkoneita, toimipaikkoja tai varastoa (POST/PUT/DELETE palauttaa 403).
  Frontend piilottaa vastaavat "Lisää"/"Muokkaa"/"Poista"-napit mekaanikolta,
  mutta oikeudet on toteutettu ja tarkistettu myös backendissä - frontendin
  piilotus on vain käyttökokemusta varten.

**Asetukset-sivulla** (`/settings`) kirjautunut käyttäjä voi vaihtaa oman
salasanansa (`PUT /api/auth/password`, vaatii nykyisen salasanan). Admin näkee
lisäksi käyttäjälistan, jossa voi:

- **Luoda** uuden käyttäjän ("+ Lisää käyttäjä" -lomake, `POST /api/users`).
- **Muokata** nimeä, käyttäjätunnusta ja roolia (`PUT /api/users/:id`).
- **Poistaa** käyttäjän (`DELETE /api/users/:id`) - vaatii käyttäjätunnuksen
  kirjoittamisen tarkalleen oikein vahvistusikkunassa ennen kuin "Poista
  pysyvästi" -nappi aktivoituu, jotta poisto ei tapahdu vahingossa.

Turvarajat (tarkistetaan backendissä, ei vain piilotettu käyttöliittymästä):
et voi poistaa omaa tiliäsi, etkä poistaa tai muuttaa mekaanikoksi viimeistä
jäljellä olevaa pääkäyttäjää - näin järjestelmä ei voi jäädä tilaan, jossa
kukaan ei enää pääse hallinnoimaan käyttäjiä.

Ei vielä mahdollisuutta vaihtaa toisen käyttäjän salasanaa - vain oman
salasanan vaihto.

## Vienti AWS:ään

Kohdearkkitehtuuri:

```
                 ┌─────────────────────────┐
   Käyttäjä ───► │  CloudFront + S3         │  (React-build, staattiset tiedostot)
                 └────────────┬────────────┘
                              │  /api/*
                              ▼
                 ┌─────────────────────────┐
                 │  Elastic Beanstalk tai  │  (Node.js/Express-backend,
                 │  ECS Fargate            │   ajetaan tällä hetkellä paikallisesti)
                 └────────────┬────────────┘
                              │  IAM (ei salasanaa)
                              ▼
                 ┌─────────────────────────┐
                 │  DynamoDB               │  eam-users, eam-locations, eam-assets,
                 │  (tehty)                │  eam-inventory, eam-workorders
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │  S3 (tehty)             │  eam-system-attachments-071954287329
                 └─────────────────────────┘
```

**Tietokanta (tehty) – DynamoDB**

`backend/utils/db.js` käyttää AWS SDK v3:a (`@aws-sdk/client-dynamodb`,
`@aws-sdk/lib-dynamodb`) yhden JSON-tiedoston sijaan. Yksi taulu per kokoelma,
osiointiavaimena `id`. Alkuperäinen `db.json`-demodata on siirretty tauluihin
`scripts/migrate-to-dynamodb.js`:llä; tiedostoa itseään ei enää lueta ajon aikana.

Pääsy on rajattu IAM:lla, ei verkolla: DynamoDB-taulut eivät ole julkisessa
verkossa avoinna (ei porttia, ei suojausryhmää muokattavana), vaan sovellus
tunnistautuu AWS-identiteetillä. Ajossa käytetään `eam-app`-IAM-käyttäjää, jolla
on oikeudet vain näihin viiteen tauluun (ei koko AWS-tiliin) - ks.
`backend/.env`:n `AWS_PROFILE`. Taulut on luotu varatulla kapasiteetilla
(5 RCU / 5 WCU per taulu = 25/25 yhteensä), joka mahtuu AWS:n pysyvään
ilmaiskiintiöön.

**Liitteet (tehty) – S3**

Työmääräyksiin voi liittää kuvia. Backend (`backend/utils/s3.js`,
`routes/workorders.js`) tarjoaa presigned-URL-perusteisen latauksen: selain
lataa tiedoston suoraan S3:aan, ei koskaan backendin kautta. Frontendissä
työmääräystaulukon "Liitteet"-sarake näyttää pienoiskuvat ja "+ Kuva" -napin.

Bucket `eam-system-attachments-071954287329` (eu-north-1) on luotu salattuna
(SSE-S3) ja julkinen pääsy on estetty kokonaan (`put-public-access-block`).
`eam-app`-käyttäjällä on omassa politiikassaan (`eam-app-s3-attachments-
access`) oikeudet `s3:PutObject`/`s3:GetObject` vain tähän buckettiin, ei
koko S3-tiliin. Bucketin nimi on `backend/.env`:n `S3_BUCKET`-muuttujassa.

**Muista CORS:** koska selain lataa tiedoston suoraan S3:aan (ei backendin
kautta), bucketissa täytyy olla CORS-konfiguraatio joka sallii `PUT`/`GET`
frontendin origin-osoitteesta - muuten selain estää latauksen ja `fetch()`
epäonnistuu viestillä "Failed to fetch" (backend ei näe pyyntöä koskaan,
joten palvelimen lokeista ei löydy mitään vihjettä). Asetettu näin:

```bash
aws s3api put-bucket-cors --bucket <bucket-nimi> --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'
```

Jos frontend viedään tuotantoon eri osoitteeseen, lisää sekin `AllowedOrigins`-
listaan.

Jos `S3_BUCKET` on tyhjä (esim. toisessa AWS-tilissä), liitteiden lataus palauttaa
selkeän 500-virheen ("S3_BUCKET ei ole asetettu"), ei kaada palvelinta.

**Vaihe 1 – Frontend (S3 + CloudFront)**

```bash
cd frontend
npm run build          # luo dist/-kansion
aws s3 sync dist/ s3://<bucket-nimi> --delete
```
Aseta `VITE_API_URL` build-vaiheessa osoittamaan tuotanto-API:in (esim.
`.env.production` -> `VITE_API_URL=https://api.omadomain.fi/api`), ja luo
CloudFront-jakelu S3-bucketin eteen HTTPS:ää varten.

**Vaihe 2 – Backend (Elastic Beanstalk tai ECS)**

- Yksinkertaisin reitti: `eb init` + `eb create` Elastic Beanstalkilla (Node.js-alusta).
- Skaalautuvampi reitti: paketoi backend Dockeriin ja aja ECS Fargatessa
  Application Load Balancerin takana.
- Aseta ympäristömuuttujat (`JWT_SECRET`, `CORS_ORIGIN`, `AWS_REGION`) palvelun
  konsolista tai Secrets Managerista - ei koskaan suoraan koodiin. Tuotannossa
  `eam-app`-käyttäjän pitkäikäisten avainten sijaan kannattaa antaa
  ECS-tehtävälle/EB-instanssille oma IAM-rooli (sama `eam-app-dynamodb-access`
  -politiikka), jolloin erillisiä avaimia ei tarvita ollenkaan.

**Autentikointi tuotannossa:** demon oma JWT-kirjautuminen toimii sellaisenaan,
mutta jos organisaatiollasi on jo käyttäjähakemisto, harkitse AWS Cognitoa
(hoitaa salasanat, MFA:n ja istunnot puolestasi) - `requireAuth`-middleware
korvattaisiin tällöin Cognitoin JWT:n varmistuksella.

## Testit

```bash
cd backend && npm test    # 66 testiä, mockattu AWS SDK, ei oikeita AWS-kutsuja
cd frontend && npm test   # 42 testiä, Vitest + React Testing Library
```

`cd backend && npm run test:aws` tekee valinnaisen oikean kirjoitus/luku/poisto-kierroksen
DynamoDB:hen `eam-app`-tunnuksilla - ei osa `npm test`:iä, ei ajeta automaattisesti.

## Seuraavat askeleet

- Toisen käyttäjän salasanan vaihto/nollaus admin-oikeuksilla.
- Hälytykset sähköpostilla/SMS:llä myöhässä olevista huolloista (AWS SES/SNS + ajastettu Lambda).
