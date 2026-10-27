# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cms-session-safety.spec.ts >> expired image upload retains its selected file and metadata for retry
- Location: tests\browser\cms-session-safety.spec.ts:132:5

# Error details

```
Error: locator.setInputFiles: Error: strict mode violation: locator('[role="dialog"]').locator('input[type=file]') resolved to 2 elements:
    1) <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp"/> aka getByRole('button', { name: 'Upload image' })
    2) <input type="file" accept="image/jpeg,image/png,image/webp"/> aka getByRole('button', { name: 'Upload mobile image' })

Call log:
  - waiting for locator('[role="dialog"]').locator('input[type=file]')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - toolbar "CMS toolbar" [ref=e2]:
    - button "Exit edit mode" [pressed] [ref=e3] [cursor=pointer]:
      - img [ref=e4]
      - generic [ref=e7]: Editing on
    - button "All text" [ref=e9] [cursor=pointer]: Aa
    - button "SEO" [ref=e10] [cursor=pointer]:
      - img [ref=e11]
    - button "Global settings" [ref=e14] [cursor=pointer]:
      - img [ref=e15]
    - link "Opening hours" [ref=e18] [cursor=pointer]:
      - /url: /en/admin/kalender
      - img [ref=e19]
  - generic [ref=e22]:
    - banner [ref=e23]:
      - generic [ref=e24]:
        - generic "Krekelberg Nautic" [ref=e25]:
          - generic "Krekelberg Nautic" [ref=e26]:
            - generic [ref=e27] [cursor=pointer]:
              - img "Krekelberg Nautic logo"
              - button "Edit image" [ref=e28]:
                - img [ref=e29]
            - generic [ref=e32]:
              - generic [ref=e33]: KREKELBERG
              - generic [ref=e34]: Nautic · Jachtmakelaar
        - navigation [ref=e35]:
          - list [ref=e36]:
            - listitem [ref=e37]:
              - link "Yard & services" [ref=e38] [cursor=pointer]:
                - /url: /en/diensten
                - generic [ref=e39]: Yard & services
                - img [ref=e40]
            - listitem [ref=e42]:
              - link "Sales" [ref=e43] [cursor=pointer]:
                - /url: /en/verkoop
                - generic [ref=e44]: Sales
            - listitem [ref=e45]:
              - link "About" [ref=e46] [cursor=pointer]:
                - /url: /en/over-ons
                - generic [ref=e47]: About
            - listitem [ref=e48]:
              - link "Contact" [ref=e49] [cursor=pointer]:
                - /url: /en/contact
                - generic [ref=e50]: Contact
        - generic [ref=e51]:
          - button "en" [ref=e53] [cursor=pointer]:
            - img [ref=e54]
            - generic [ref=e60]: en
            - img [ref=e61]
          - link "Admin dashboard" [ref=e63] [cursor=pointer]:
            - /url: /en/admin
            - button "Admin dashboard" [ref=e64]:
              - generic [ref=e65]: Admin dashboard
          - button "Edit button" [ref=e67] [cursor=pointer]:
            - text: Stalling
            - img [ref=e68]
    - main [ref=e71]:
      - generic [ref=e72]:
        - generic [ref=e74] [cursor=pointer]:
          - generic [ref=e76]:
            - img "Krekelberg Nautic jachtwerf"
          - button "Edit image" [active] [ref=e77]:
            - img [ref=e78]
        - generic:
          - generic [ref=e83]:
            - text: Brokerage · Storage · DIY yard
            - button "Edit text" [ref=e84] [cursor=pointer]:
              - img [ref=e85]
          - heading "Yacht yard & brokerage in Roermond Edit text" [level=1] [ref=e88]:
            - generic [ref=e89]:
              - text: Yacht yard & brokerage in Roermond
              - button "Edit text" [ref=e90] [cursor=pointer]:
                - img [ref=e91]
          - paragraph [ref=e94]:
            - generic [ref=e95]:
              - text: From craning and storage to sales support and DIY maintenance — Krekelberg Nautic delivers everything your vessel needs at one professional location on the Maasplassen.
              - button "Edit text" [ref=e96] [cursor=pointer]:
                - img [ref=e97]
          - generic:
            - generic [ref=e100]:
              - generic [ref=e101]:
                - generic [ref=e102]: Sell your boat
                - img [ref=e104]
              - button "Edit button" [ref=e106] [cursor=pointer]:
                - img [ref=e107]
            - generic [ref=e110]:
              - generic [ref=e112]: View yard services
              - button "Edit button" [ref=e113] [cursor=pointer]:
                - img [ref=e114]
          - generic [ref=e117]:
            - generic [ref=e118]:
              - img [ref=e119]
              - generic [ref=e122]:
                - text: Active since 1972
                - button "Edit text" [ref=e123] [cursor=pointer]:
                  - img [ref=e124]
            - generic [ref=e127]:
              - img [ref=e128]
              - generic [ref=e132]:
                - text: 30-ton crane
                - button "Edit text" [ref=e133] [cursor=pointer]:
                  - img [ref=e134]
            - generic [ref=e137]:
              - img [ref=e138]
              - generic [ref=e141]:
                - text: 200+ stands
                - button "Edit text" [ref=e142] [cursor=pointer]:
                  - img [ref=e143]
            - generic [ref=e146]:
              - img [ref=e147]
              - generic [ref=e150]:
                - text: 60+ listings
                - button "Edit text" [ref=e151] [cursor=pointer]:
                  - img [ref=e152]
      - generic [ref=e155]:
        - generic [ref=e156]:
          - generic [ref=e157]:
            - generic [ref=e159]:
              - text: Our services
              - button "Edit text" [ref=e160] [cursor=pointer]:
                - img [ref=e161]
            - heading "Everything for your boat at one yard Edit text" [level=2] [ref=e164]:
              - generic [ref=e165]:
                - text: Everything for your boat at one yard
                - button "Edit text" [ref=e166] [cursor=pointer]:
                  - img [ref=e167]
            - paragraph [ref=e170]:
              - generic [ref=e171]:
                - text: From crane to sales, all in one place at the Maasplassen.
                - button "Edit text" [ref=e172] [cursor=pointer]:
                  - img [ref=e173]
          - generic [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e178]: View all services
              - img [ref=e180]
            - button "Edit button" [ref=e182] [cursor=pointer]:
              - img [ref=e183]
        - generic [ref=e186]:
          - generic [ref=e188]:
            - generic [ref=e189]:
              - generic [ref=e191] [cursor=pointer]:
                - generic [ref=e193]:
                  - img "Crane up to 30 tons"
                - button "Edit image" [ref=e194]:
                  - img [ref=e195]
              - generic:
                - generic:
                  - img
              - generic [ref=e198]:
                - generic [ref=e200]:
                  - text: Crane up to 30 tons
                  - button "Edit text" [ref=e201] [cursor=pointer]:
                    - img [ref=e202]
                - generic [ref=e206]:
                  - text: Boat in or out of water
                  - button "Edit text" [ref=e207] [cursor=pointer]:
                    - img [ref=e208]
            - generic [ref=e211]:
              - generic [ref=e212]:
                - paragraph [ref=e213]: Professional craning with our 30-ton mobile crane and experienced team.
                - button "Edit text" [ref=e214] [cursor=pointer]:
                  - img [ref=e215]
              - img [ref=e218]
          - generic [ref=e221]:
            - generic [ref=e222]:
              - generic [ref=e224] [cursor=pointer]:
                - generic [ref=e226]:
                  - img "Hull pressure wash"
                - button "Edit image" [ref=e227]:
                  - img [ref=e228]
              - generic:
                - generic:
                  - img
              - generic [ref=e231]:
                - generic [ref=e233]:
                  - text: Hull pressure wash
                  - button "Edit text" [ref=e234] [cursor=pointer]:
                    - img [ref=e235]
                - generic [ref=e239]:
                  - text: Right after craning
                  - button "Edit text" [ref=e240] [cursor=pointer]:
                    - img [ref=e241]
            - generic [ref=e244]:
              - generic [ref=e245]:
                - paragraph [ref=e246]: Environmentally friendly washing with filtered runoff, ready for storage or antifouling.
                - button "Edit text" [ref=e247] [cursor=pointer]:
                  - img [ref=e248]
              - img [ref=e251]
          - generic [ref=e254]:
            - generic [ref=e255]:
              - generic [ref=e257] [cursor=pointer]:
                - generic [ref=e259]:
                  - img "Winter storage"
                - button "Edit image" [ref=e260]:
                  - img [ref=e261]
              - generic:
                - generic:
                  - img
              - generic [ref=e264]:
                - generic [ref=e266]:
                  - text: Winter storage
                  - button "Edit text" [ref=e267] [cursor=pointer]:
                    - img [ref=e268]
                - generic [ref=e272]:
                  - text: Indoor & outdoor
                  - button "Edit text" [ref=e273] [cursor=pointer]:
                    - img [ref=e274]
            - generic [ref=e277]:
              - generic [ref=e278]:
                - paragraph [ref=e279]: Safe and insured at the 10,000 m² yard, monitored 24/7.
                - button "Edit text" [ref=e280] [cursor=pointer]:
                  - img [ref=e281]
              - img [ref=e284]
          - generic [ref=e287]:
            - generic [ref=e288]:
              - generic [ref=e290] [cursor=pointer]:
                - generic [ref=e292]:
                  - img "Work on your own boat"
                - button "Edit image" [ref=e293]:
                  - img [ref=e294]
              - generic:
                - generic:
                  - img
              - generic [ref=e297]:
                - generic [ref=e299]:
                  - text: Work on your own boat
                  - button "Edit text" [ref=e300] [cursor=pointer]:
                    - img [ref=e301]
                - generic [ref=e305]:
                  - text: DIY-friendly yard
                  - button "Edit text" [ref=e306] [cursor=pointer]:
                    - img [ref=e307]
            - generic [ref=e310]:
              - generic [ref=e311]:
                - paragraph [ref=e312]: Workspaces with power, water and our mechanics on request — work independently.
                - button "Edit text" [ref=e313] [cursor=pointer]:
                  - img [ref=e314]
              - img [ref=e317]
          - generic [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e323] [cursor=pointer]:
                - generic [ref=e325]:
                  - img "Sell your boat"
                - button "Edit image" [ref=e326]:
                  - img [ref=e327]
              - generic:
                - generic:
                  - img
              - generic [ref=e330]:
                - generic [ref=e332]:
                  - text: Sell your boat
                  - button "Edit text" [ref=e333] [cursor=pointer]:
                    - img [ref=e334]
                - generic [ref=e338]:
                  - text: Via Schepenkring Roermond
                  - button "Edit text" [ref=e339] [cursor=pointer]:
                    - img [ref=e340]
            - generic [ref=e343]:
              - generic [ref=e344]:
                - paragraph [ref=e345]: Sell at our physical location with professional brokerage and continuous visibility.
                - button "Edit text" [ref=e346] [cursor=pointer]:
                  - img [ref=e347]
              - img [ref=e350]
          - generic [ref=e353]:
            - generic [ref=e354]:
              - generic [ref=e356] [cursor=pointer]:
                - generic [ref=e358]:
                  - img "A week ashore"
                - button "Edit image" [ref=e359]:
                  - img [ref=e360]
              - generic:
                - generic:
                  - img
              - generic [ref=e363]:
                - generic [ref=e365]:
                  - text: A week ashore
                  - button "Edit text" [ref=e366] [cursor=pointer]:
                    - img [ref=e367]
                - generic [ref=e371]:
                  - text: A week to work on your boat
                  - button "Edit text" [ref=e372] [cursor=pointer]:
                    - img [ref=e373]
            - generic [ref=e376]:
              - generic [ref=e377]:
                - paragraph [ref=e378]: Bring your boat ashore and take time for maintenance at our yard.
                - button "Edit text" [ref=e379] [cursor=pointer]:
                  - img [ref=e380]
              - img [ref=e383]
      - generic [ref=e386]:
        - generic [ref=e387]:
          - generic [ref=e389] [cursor=pointer]:
            - generic [ref=e391]:
              - img "Boot kranen op de werf van Krekelberg Nautic"
            - button "Edit image" [ref=e392]:
              - img [ref=e393]
          - generic [ref=e396]:
            - img [ref=e397]
            - generic [ref=e400]: HISWA certified
            - generic [ref=e401]: HISWA · 1976
            - button "Edit certification badge" [ref=e402] [cursor=pointer]:
              - img [ref=e403]
              - text: Edit certification badge
        - generic [ref=e406]:
          - generic [ref=e408]:
            - text: Yard services
            - button "Edit text" [ref=e409] [cursor=pointer]:
              - img [ref=e410]
          - heading "A complete yard, managed in-house Edit text" [level=2] [ref=e413]:
            - generic [ref=e414]:
              - text: A complete yard, managed in-house
              - button "Edit text" [ref=e415] [cursor=pointer]:
                - img [ref=e416]
          - paragraph [ref=e419]:
            - generic [ref=e420]:
              - text: Our yard is set up for both DIY boaters and clients who hand over the full maintenance. Everything in one location at the Maasplassen in Roermond.
              - button "Edit text" [ref=e421] [cursor=pointer]:
                - img [ref=e422]
          - paragraph [ref=e425]:
            - generic [ref=e426]:
              - text: We combine family-business craftsmanship with modern facilities — keeping your boat in top condition year-round.
              - button "Edit text" [ref=e427] [cursor=pointer]:
                - img [ref=e428]
          - list [ref=e431]:
            - listitem [ref=e432]:
              - img [ref=e434]
              - generic [ref=e438]:
                - generic [ref=e440]:
                  - text: Crane & wash
                  - button "Edit text" [ref=e441] [cursor=pointer]:
                    - img [ref=e442]
                - generic [ref=e446]:
                  - text: 30-ton crane and high-pressure wash
                  - button "Edit text" [ref=e447] [cursor=pointer]:
                    - img [ref=e448]
            - listitem [ref=e451]:
              - img [ref=e453]
              - generic [ref=e456]:
                - generic [ref=e458]:
                  - text: Maintenance
                  - button "Edit text" [ref=e459] [cursor=pointer]:
                    - img [ref=e460]
                - generic [ref=e464]:
                  - text: Antifouling, polishing, engine service
                  - button "Edit text" [ref=e465] [cursor=pointer]:
                    - img [ref=e466]
            - listitem [ref=e469]:
              - img [ref=e471]
              - generic [ref=e474]:
                - generic [ref=e476]:
                  - text: Indoor & outdoor storage
                  - button "Edit text" [ref=e477] [cursor=pointer]:
                    - img [ref=e478]
                - generic [ref=e482]:
                  - text: For boats up to 14m+
                  - button "Edit text" [ref=e483] [cursor=pointer]:
                    - img [ref=e484]
            - listitem [ref=e487]:
              - img [ref=e489]
              - generic [ref=e491]:
                - generic [ref=e493]:
                  - text: DIY yard
                  - button "Edit text" [ref=e494] [cursor=pointer]:
                    - img [ref=e495]
                - generic [ref=e499]:
                  - text: Workspaces with power and water
                  - button "Edit text" [ref=e500] [cursor=pointer]:
                    - img [ref=e501]
          - generic [ref=e504]:
            - generic [ref=e505]:
              - generic [ref=e506]:
                - generic [ref=e507]: View yard services
                - img [ref=e509]
              - button "Edit button" [ref=e511] [cursor=pointer]:
                - img [ref=e512]
            - generic [ref=e515]:
              - generic [ref=e517]: Book appointment
              - button "Edit button" [ref=e518] [cursor=pointer]:
                - img [ref=e519]
      - generic [ref=e524]:
        - generic [ref=e527] [cursor=pointer]:
          - generic [ref=e529]:
            - img "Boot te koop via Krekelberg Nautic"
          - button "Edit image" [ref=e530]:
            - img [ref=e531]
        - generic [ref=e534]:
          - generic [ref=e536]:
            - text: Schepenkring Roermond
            - button "Edit text" [ref=e537] [cursor=pointer]:
              - img [ref=e538]
          - heading "Looking for a (new) boat? Edit text" [level=2] [ref=e541]:
            - generic [ref=e542]:
              - text: Looking for a (new) boat?
              - button "Edit text" [ref=e543] [cursor=pointer]:
                - img [ref=e544]
          - paragraph [ref=e547]:
            - generic [ref=e548]:
              - text: We are the largest yacht broker in Limburg with at least 75 boats for sale on location. The full catalogue is online via our Schepenkring partner.
              - button "Edit text" [ref=e549] [cursor=pointer]:
                - img [ref=e550]
          - generic [ref=e553]:
            - generic [ref=e554]:
              - generic [ref=e555]: 60+
              - generic [ref=e556]: Boats for sale
            - generic [ref=e557]:
              - generic [ref=e558]: 3-6 mnd
              - generic [ref=e559]: Avg sale time
            - generic [ref=e560]:
              - generic [ref=e561]: 100%
              - generic [ref=e562]: Guided process
          - generic [ref=e563]:
            - generic [ref=e564]:
              - generic [ref=e565]:
                - generic [ref=e566]: View boats for sale
                - img [ref=e568]
              - button "Edit button" [ref=e570] [cursor=pointer]:
                - img [ref=e571]
            - generic [ref=e574]:
              - generic [ref=e576]: List your boat
              - button "Edit button" [ref=e577] [cursor=pointer]:
                - img [ref=e578]
      - generic [ref=e582]:
        - generic [ref=e584] [cursor=pointer]:
          - generic [ref=e586]:
            - img "Jachthaven Krekelberg Nautic Roermond"
          - button "Edit image" [ref=e587]:
            - img [ref=e588]
        - generic [ref=e591]:
          - generic [ref=e593]:
            - text: Contact & location
            - button "Edit text" [ref=e594] [cursor=pointer]:
              - img [ref=e595]
          - heading "Plan your visit to the yard Edit text" [level=3] [ref=e598]:
            - generic [ref=e599]:
              - text: Plan your visit to the yard
              - button "Edit text" [ref=e600] [cursor=pointer]:
                - img [ref=e601]
          - list [ref=e604]:
            - listitem [ref=e605]:
              - img [ref=e606]
              - text: Hertenerweg 2, 6049AA Herten
            - listitem [ref=e609]:
              - img [ref=e610]
              - link "0475 315 661" [ref=e612] [cursor=pointer]:
                - /url: tel:+31475315661
            - listitem [ref=e613]:
              - img [ref=e614]
              - generic [ref=e617]:
                - text: Mon–Fri 09:00–17:30 · Wed closed · Sat + Sun 10:00–17:00
                - button "Edit text" [ref=e618] [cursor=pointer]:
                  - img [ref=e619]
          - generic [ref=e623]:
            - generic [ref=e624]:
              - generic [ref=e625]: Book appointment
              - img [ref=e627]
            - button "Edit button" [ref=e629] [cursor=pointer]:
              - img [ref=e630]
      - generic [ref=e634]:
        - button "Edit image" [ref=e639] [cursor=pointer]:
          - img [ref=e640]
        - generic:
          - generic:
            - generic [ref=e645]:
              - text: Ready to start?
              - button "Edit text" [ref=e646] [cursor=pointer]:
                - img [ref=e647]
            - heading "Reserve your crane slot or storage Edit text" [level=3] [ref=e650]:
              - generic [ref=e651]:
                - text: Reserve your crane slot or storage
                - button "Edit text" [ref=e652] [cursor=pointer]:
                  - img [ref=e653]
            - paragraph [ref=e656]:
              - generic [ref=e657]:
                - text: Combine multiple services and book easily online. Our yard planning is live.
                - button "Edit text" [ref=e658] [cursor=pointer]:
                  - img [ref=e659]
          - generic:
            - generic [ref=e662]:
              - generic [ref=e663]:
                - generic [ref=e664]: Book a crane slot
                - img [ref=e666]
              - button "Edit button" [ref=e668] [cursor=pointer]:
                - img [ref=e669]
            - generic [ref=e672]:
              - generic [ref=e674]: Get in touch
              - button "Edit button" [ref=e675] [cursor=pointer]:
                - img [ref=e676]
    - contentinfo [ref=e679]:
      - generic [ref=e680]:
        - generic [ref=e681]:
          - generic "Krekelberg Nautic" [ref=e682]:
            - generic [ref=e683] [cursor=pointer]:
              - img "Krekelberg Nautic logo"
              - button "Edit image" [ref=e684]:
                - img [ref=e685]
            - generic [ref=e688]:
              - generic [ref=e689]: KREKELBERG
              - generic [ref=e690]: Nautic · Jachtmakelaar
          - paragraph [ref=e691]: Yacht yard, storage and brokerage in Roermond. Vakmanschap, planning en stalling sinds 1972.
        - generic [ref=e692]:
          - button "Services" [ref=e694]
          - list [ref=e695]:
            - listitem [ref=e696]:
              - link "Crane" [ref=e697] [cursor=pointer]:
                - /url: /en/kraanafspraak
            - listitem [ref=e698]:
              - link "Pressure wash" [ref=e699] [cursor=pointer]:
                - /url: /en/diensten/afspuiten
            - listitem [ref=e700]:
              - link "Winter storage" [ref=e701] [cursor=pointer]:
                - /url: /en/diensten/winterstalling
            - listitem [ref=e702]:
              - link "A week ashore" [ref=e703] [cursor=pointer]:
                - /url: /en/diensten/weekje-op-wal
            - listitem [ref=e704]:
              - link "Sell your boat" [ref=e705] [cursor=pointer]:
                - /url: /en/verkoop
        - generic [ref=e706]:
          - button "Company" [ref=e708]
          - list [ref=e709]:
            - listitem [ref=e710]:
              - link "About" [ref=e711] [cursor=pointer]:
                - /url: /en/over-ons
            - listitem [ref=e712]:
              - link "Frequently asked questions" [ref=e713] [cursor=pointer]:
                - /url: /en/faq
            - listitem [ref=e714]:
              - link "Contact" [ref=e715] [cursor=pointer]:
                - /url: /en/contact
            - listitem [ref=e716]:
              - link "Timeline" [ref=e717] [cursor=pointer]:
                - /url: /en/feed
            - listitem [ref=e718]:
              - link "Login" [ref=e719] [cursor=pointer]:
                - /url: /en/login
        - generic [ref=e720]:
          - generic [ref=e721]: Contact
          - list [ref=e722]:
            - listitem [ref=e723]:
              - img [ref=e724]
              - button "Hertenerweg 2, 6049AA Herten" [ref=e728]
            - listitem [ref=e729]:
              - img [ref=e730]
              - link "0475 315 661" [ref=e732] [cursor=pointer]:
                - /url: tel:+31475315661
            - listitem [ref=e733]:
              - img [ref=e734]
              - link "marketing@answer24.nl" [ref=e737] [cursor=pointer]:
                - /url: mailto:info@krekelberg-nautic.nl
      - generic [ref=e739]:
        - button "© 2026 Krekelberg Nautic — All rights reserved." [ref=e741]
        - generic [ref=e742]:
          - link "Privacy" [ref=e743] [cursor=pointer]:
            - /url: /en/privacy
          - link "Voorwaarden" [ref=e744] [cursor=pointer]:
            - /url: /en/voorwaarden
          - link "Cookies" [ref=e745] [cursor=pointer]:
            - /url: /en/cookies
  - alert [ref=e746]
  - dialog [ref=e747]:
    - generic [ref=e749]:
      - button "Sluiten" [ref=e750] [cursor=pointer]:
        - img [ref=e751]
      - generic [ref=e754]:
        - heading "Edit image" [level=2] [ref=e755]
        - paragraph [ref=e756]: home.hero.image
      - generic [ref=e757]:
        - generic [ref=e758]:
          - generic [ref=e759]:
            - generic [ref=e760]: Focal point
            - generic [ref=e761]: x 50 · y 50
          - generic [ref=e765]:
            - text: Zoom
            - slider "Zoom" [ref=e766]: "1"
          - paragraph [ref=e767]: Click the image to set the focal point.
        - generic [ref=e768]:
          - generic [ref=e769] [cursor=pointer]:
            - img [ref=e770]
            - text: Upload image
            - button "Upload image" [ref=e773]
          - paragraph [ref=e774]: Drop a JPG, PNG or WEBP file here.
        - group "Media library" [ref=e775]:
          - generic [ref=e776]: Media library
          - button "Existing image" [ref=e778] [cursor=pointer]:
            - generic [ref=e779]: Keep current image
            - img [ref=e780]
          - generic [ref=e782]:
            - text: Mobile image
            - button "Mobile image" [ref=e784] [cursor=pointer]:
              - generic [ref=e785]: Use desktop image
              - img [ref=e786]
          - generic [ref=e788]:
            - text: Upload mobile image
            - button "Upload mobile image" [ref=e789]
          - generic [ref=e790]:
            - text: "Desktop focal x: 50"
            - slider "Desktop focal x" [ref=e791]: "50"
          - generic [ref=e792]:
            - text: "Desktop focal y: 50"
            - slider "Desktop focal y" [ref=e793]: "50"
          - generic [ref=e794]:
            - text: "Mobile focal x: 50"
            - slider "Mobile focal x" [ref=e795]: "50"
          - generic [ref=e796]:
            - text: "Mobile focal y: 50"
            - slider "Mobile focal y" [ref=e797]: "50"
          - generic [ref=e798]:
            - text: "brightness: 100%"
            - slider "brightness" [ref=e799]: "100"
          - generic [ref=e800]:
            - text: "contrast: 100%"
            - slider "contrast" [ref=e801]: "100"
          - generic [ref=e802]:
            - text: "saturation: 100%"
            - slider "saturation" [ref=e803]: "100"
          - generic [ref=e804]:
            - text: Alignment
            - button "Alignment" [ref=e806] [cursor=pointer]:
              - generic [ref=e807]: center
              - img [ref=e808]
          - generic [ref=e810]:
            - text: Gradient
            - button "Gradient" [ref=e812] [cursor=pointer]:
              - generic [ref=e813]: right
              - img [ref=e814]
          - generic [ref=e816]:
            - text: gradient start
            - slider "gradient_start" [ref=e817]: "0.95"
          - generic [ref=e818]:
            - text: gradient end
            - slider "gradient_end" [ref=e819]: "0.35"
        - generic [ref=e820]:
          - generic [ref=e821]:
            - text: Dark overlay
            - generic [ref=e822]: "0.00"
          - slider "Dark overlay" [ref=e823]: "0"
        - generic [ref=e824]:
          - generic [ref=e825]: Alt text
          - tablist "Locale" [ref=e827]:
            - tab "NL" [ref=e828] [cursor=pointer]
            - tab "EN" [selected] [ref=e829] [cursor=pointer]
            - tab "DE" [ref=e830] [cursor=pointer]
            - tab "FR" [ref=e831] [cursor=pointer]
          - textbox "Alt text EN" [ref=e832]:
            - /placeholder: Describe the image…
          - generic [ref=e833]: Image SEO title
          - textbox "Image SEO title EN" [ref=e834]:
            - /placeholder: Image SEO title
      - generic [ref=e835]:
        - button "Cancel" [ref=e836] [cursor=pointer]:
          - generic [ref=e837]: Cancel
        - button "Save" [ref=e838] [cursor=pointer]:
          - generic [ref=e839]: Save
```

# Test source

```ts
  44  |     }
  45  |   });
  46  | }
  47  | 
  48  | test('expired save retains the draft and resumes only for the same verified editor', async ({ page }) => {
  49  |   await fixture(page);
  50  |   let expired = true;
  51  |   let saved: unknown;
  52  |   await page.route('**/admin/cms/content-blocks/home.werf.cta', route => {
  53  |     saved = route.request().postDataJSON();
  54  |     return route.fulfill({ status: expired ? 401 : 200, json: {} });
  55  |   });
  56  |   expect((await page.goto('/en'))?.status()).toBe(200);
  57  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  58  |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  59  |   const input = page.locator('[role="dialog"] textarea');
  60  |   await input.fill('Keep this unsaved label');
  61  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  62  |   const recovery = page.locator('dialog[open]');
  63  |   await expect(recovery).toContainText(cms.draftRetained);
  64  |   await expect(recovery.getByRole('link', { name: cms.signInAgain })).toHaveAttribute('target', '_blank');
  65  |   await page.keyboard.press('Escape');
  66  |   await expect(recovery).toBeVisible();
  67  |   await expect(input).toHaveValue('Keep this unsaved label');
  68  |   // Another account must not inherit or save this draft.
  69  |   await page.context().addCookies([{ name: 'krek_session', value: 'new-session', url: test.info().project.use.baseURL! }]);
  70  |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, id: 'other-editor' } }));
  71  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  72  |   await expect(recovery).toBeVisible();
  73  |   await expect(recovery).toContainText(cms.sessionNotRestored);
  74  |   await page.route('**/auth/me', route => route.fulfill({ json: editor }));
  75  |   expired = false;
  76  |   await recovery.getByRole('button', { name: cms.resumeEditing }).click();
  77  |   await expect(recovery).toHaveCount(0);
  78  |   await expect(input).toHaveValue('Keep this unsaved label');
  79  |   await page.getByRole('button', { name: cms.save, exact: true }).click();
  80  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  81  |   expect(saved).toMatchObject({ value_by_locale: { 'en-GB': 'Keep this unsaved label' } });
  82  | });
  83  | 
  84  | test('route changes close stale dialogs and disable page actions without a registration', async ({ page }) => {
  85  |   await fixture(page);
  86  |   expect((await page.goto('/en'))?.status()).toBe(200);
  87  |   await expect(page.getByRole('button', { name: cms.seoTitle, exact: true })).toBeDisabled();
  88  |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  89  |   await page.getByRole('button', { name: cms.seoTitle, exact: true }).click();
  90  |   await expect(page.getByRole('dialog')).toBeVisible();
  91  |   // Native history changes are integrated with the Next app router. Exercise
  92  |   // several route changes without waiting for registration effects in between.
  93  |   await page.evaluate(() => {
  94  |     history.pushState(null, '', '/en/contact');
  95  |     history.pushState(null, '', '/en/kraanafspraak');
  96  |     history.pushState(null, '', '/en/missing-cms-route');
  97  |   });
  98  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  99  | });
  100 | 
  101 | test('translated links have one keyboard target and edit without following their destination', async ({ page }) => {
  102 |   await fixture(page);
  103 |   expect((await page.goto('/en'))?.status()).toBe(200);
  104 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  105 |   const text = page.locator('footer [data-cms-translation="services.crane.title"]');
  106 |   const link = text.locator('..');
  107 |   await expect(text).not.toHaveAttribute('role', 'button');
  108 |   await link.focus();
  109 |   await link.press('Enter');
  110 |   await expect(page.getByRole('dialog')).toBeVisible();
  111 |   await expect(page).toHaveURL(/\/en$/);
  112 |   await page.getByRole('dialog').getByRole('button', { name: cms.cancel, exact: true }).click();
  113 |   await link.click();
  114 |   await expect(page.getByRole('dialog')).toBeVisible();
  115 |   await expect(page).toHaveURL(/\/en$/);
  116 |   await expect(page.locator('a button[data-cms-edit], button button[data-cms-edit], a [role="button"], button [role="button"]')).toHaveCount(0);
  117 | });
  118 | 
  119 | test('revoked permission removes controls and closes an open editor after revalidation', async ({ page }) => {
  120 |   await fixture(page);
  121 |   expect((await page.goto('/en'))?.status()).toBe(200);
  122 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  123 |   await page.locator('[data-cms-block="home.werf.cta"] button').click();
  124 |   await expect(page.getByRole('dialog')).toBeVisible();
  125 |   await page.route('**/auth/me', route => route.fulfill({ json: { ...editor, permissions: [] } }));
  126 |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  127 |   await expect(page.getByRole('toolbar')).toHaveCount(0);
  128 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  129 |   await expect(page.locator('[data-cms-edit]')).toHaveCount(0);
  130 | });
  131 | 
  132 | test('expired image upload retains its selected file and metadata for retry', async ({ page }) => {
  133 |   await fixture(page);
  134 |   let expired = true;
  135 |   let uploads = 0;
  136 |   await page.route('**/admin/cms/media-blocks/*/upload', route => {
  137 |     uploads++;
  138 |     return route.fulfill({ status: expired ? 401 : 200, json: { image_url: '/img/krek/werf-hero.webp' } });
  139 |   });
  140 |   expect((await page.goto('/en'))?.status()).toBe(200);
  141 |   await page.getByRole('button', { name: cms.enterEdit, exact: true }).click();
  142 |   await page.locator('[data-cms-block="home.hero.image"] button').click();
  143 |   const dialog = page.locator('[role="dialog"]');
> 144 |   await dialog.locator('input[type=file]').setInputFiles('public/img/krek/werf-hero.webp');
      |   ^ Error: locator.setInputFiles: Error: strict mode violation: locator('[role="dialog"]').locator('input[type=file]') resolved to 2 elements:
  145 |   const alt = dialog.getByRole('textbox', { name: `${cms.altText} EN`, exact: true });
  146 |   await alt.fill('Retained image description');
  147 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  148 |   await expect(page.locator('dialog[open]')).toBeVisible();
  149 |   await expect(dialog.locator('img[src^="blob:"]').first()).toBeAttached();
  150 |   await page.context().addCookies([{ name: 'krek_session', value: 'renewed-image-session', url: test.info().project.use.baseURL! }]);
  151 |   expired = false;
  152 |   await page.locator('dialog[open]').getByRole('button', { name: cms.resumeEditing }).click();
  153 |   await expect(page.locator('dialog[open]')).toHaveCount(0);
  154 |   await expect(alt).toHaveValue('Retained image description');
  155 |   await dialog.getByRole('button', { name: cms.save, exact: true }).click();
  156 |   await expect(dialog).toHaveCount(0);
  157 |   expect(uploads).toBe(2);
  158 | });
  159 | 
```