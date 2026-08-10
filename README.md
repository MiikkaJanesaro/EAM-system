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

Valmis testitunnus: **käyttäjätunnus `admin`, salasana `admin123`**
(vaihda/poista ennen tuotantoon vientiä).

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

## Seuraavat askeleet

- Roolit/oikeudet (esim. mekaanikko vs. pääkäyttäjä) - `users`-taulun laajennus + tarkistus middlewaressa.
- Liitteet (kuvat huoltotöistä) - S3-presigned upload -URL:t.
- Hälytykset sähköpostilla/SMS:llä myöhässä olevista huolloista (AWS SES/SNS + ajastettu Lambda).
