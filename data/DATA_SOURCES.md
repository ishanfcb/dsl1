# Emergency Enroute: data sources

This file goes with `scenarios.json`. Every number in the JSON has a `src` id that points to a source below, and a `kind` that says how it was arrived at:

- **sourced**: taken directly from the source.
- **derived**: calculated from sourced numbers (the formula is given in the JSON).
- **proxy**: real data, but from a nearby or similar place.
- **assumption**: no public data was found. Replace it with field data before the jury.

## Sources

| id | What it gives | Source |
|---|---|---|
| S1 | Bengaluru 2025: 74.4% congestion; 36:09 per 10 km; evening peak 13.2 km/h (115.2%); morning peak 14.6 km/h; 6 pm worst hour (183%) | [TomTom Traffic Index – Bengaluru](https://www.tomtom.com/traffic-index/bengaluru-traffic) |
| S2 | ORR, Bengaluru, after ~2 h of rain: 4.8 km/h average, 3.2 km queue | [Deccan Herald – Bumper-to-bumper traffic on ORR after evening showers](https://www.deccanherald.com/india/karnataka/bengaluru/bumper-to-bumper-traffic-on-orr-after-evening-showers-in-bengaluru-3066149) |
| S3 | New Delhi metro 2025: 60.2% congestion; 24 min per 10 km; evening rush 18.9 km/h (107.4%); 192% congestion at 6 pm | [TomTom Traffic Index – New Delhi](https://www.tomtom.com/traffic-index/new-delhi-traffic/) |
| S4 | IGI → Medanta green corridor: 12 km in 6 min, against 15–20 min normally at peak (23 Apr 2023) | [The Tribune – 12-km green corridor to Medanta](https://www.tribuneindia.com/news/delhi/gurugram-12-km-green-corridor-created-for-lungs-transportation-from-igi-to-medanta-hospital-500208) |
| S5 | Silk Board: 17,816 vehicles, 9:30–10:30 am; 8,300 from BTM; 285 s cycle; green BTM 150 s, HSR 90 s, Hosur Rd 45 s each side (17 Jul 2024) | [Deccan Herald – How Silk Board sinks under vehicle movement](https://www.deccanherald.com/india/karnataka/bengaluru/traffic-troubles-how-bengalurus-silk-board-junction-sinks-under-enormous-vehicle-movement-3109964) |
| S6 | Silk Board average peak speed 4.48 km/h (2017 CTSTP study, via Times of India) | [Wikipedia – Silk Board junction](https://en.wikipedia.org/wiki/Silk_Board_junction) |
| S7 | Bengaluru fleet: 1.28 crore vehicles, 87 lakh two-wheelers, 25.2 lakh cars (2026) | [Deccan Herald – At 25 lakh, Bengaluru has the most private cars](https://deccanherald.com/india/karnataka/bengaluru/at-25-lakh-bengaluru-has-maximum-number-of-private-cars-4079754) |
| S8 | Full registered-vehicle breakdown by type, Bengaluru, 31 Mar 2025 (download the CSV) | [OpenCity – Total Vehicles Registered in Bengaluru 2024-25](https://data.opencity.in/dataset/total-vehicles-registered-in-bengaluru/resource/4c0f7518-2ec8-496a-addc-9741b49b6671) |
| S9 | Flood depth vs safe vehicle speed: v(w) = 0.0009w² − 0.5529w + 86.9448; impassable at 300 mm | Pregnolato et al. (2017), *Transportation Research Part D* 55, 67–81. [doi:10.1016/j.trd.2017.06.020](https://doi.org/10.1016/j.trd.2017.06.020) · [open PDF](https://research-information.bris.ac.uk/ws/files/191868409/Full_text_PDF_final_published_version_.pdf) |
| S10 | Mixed-traffic PCU: 2W 0.46, auto 0.78, bus 2.2; saturation flows of 2,000–4,000 PCU/h per approach; vehicle mixes (Car:2W 45:39, 37:44) | [Sali & Ajitha – Delay and saturation flow using PCU methods (ICCESP 2024)](https://books.aijr.org/index.php/press/catalog/download/179/95/3808-1?inline=1) |
| S11 | IRC saturation flow = 525 × width (m) PCU per hour of green | [NPTEL – Traffic signal design](https://archive.nptel.ac.in/content/storage2/courses/105104098/TransportationII/lecture8/text/node8.html) |
| S12 | IRC:93-1985 cycle 40–120 s (60–90 s optimum), amber 3–6 s, all-red 1–2 s, Webster's formula, pedestrian walking speed 1.2 m/s | [InfraLens – IRC 93-1985 summary](https://infralens.in/code/IRC-93-1985) |
| S13 | Siren reaches only ~40 ft (12 m) into a car at an urban intersection, ≤80 ft in general; drivers locate it correctly only 26% of the time with windows closed; reaction time ~1.6 s | [Fire Engineering – Apparatus siren limitations and intersection crashes](https://www.fireengineering.com/fire-apparatus/apparatus-siren-limitations-and-intersection-crashes/) |
| S14 | Bengaluru pilot: the signal turns green when the ambulance is 760 m away; piloted at 2 junctions with 3 ambulances | [Deccan Herald – Now, a device to give ambulances right of way](https://www.deccanherald.com/india/karnataka/bengaluru/now-device-give-ambulances-right-2291367) |
| S15 | Bengaluru: ~3,000 ambulance trips a day; deaths en route 175 (2021) → 292 (2023); ₹10,000 fine under MV Act 194E | [Deccan Herald – No green for the ambulance](https://www.deccanherald.com/opinion/no-green-for-the-ambulance-3403011) |
| S16 | Intelligent Driver Model (car-following) | Treiber, Hennecke & Helbing (2000), *Phys. Rev. E* 62, 1805. [arXiv:cond-mat/0002177](https://arxiv.org/abs/cond-mat/0002177) |
| S17 | Ambulance response in Indian cities: 25–30 min; 62% of ambulance drivers say motorists don't yield | [The Hindu via Vision IAS – Reclaiming the Golden Hour](https://visionias.in/current-affairs/upsc-daily-news-summary/article/2025-06-13/the-hindu/science-and-technology/reclaiming-the-golden-hour-how-technology-can-help-beat-urban-traffic-and-save-lives) |
| S18 | Gurugram underpass speed limit 30 km/h | [The Tribune – 30 km/h limit for 9 underpasses](https://www.tribuneindia.com/news/haryana/speed-limit-fixed-at-30km-hr-for-9-underpasses-in-gurugram-558467) |
| S19 | Gurugram rain, 4 Aug 2026: a 5–7 min trip took 1.5 h; a 5 min trip took 1 h | [Business Today – Gurugram rains leave commuters stranded](https://www.businesstoday.in/latest/trends/story/7-minutes-journey-took-one-and-a-half-hour-gurugram-rains-leave-commuters-stranded-for-hours-547337-2026-08-05) |
| S20 | Street geometry for the real-map toggle (export the junctions as GeoJSON). Credit "© OpenStreetMap contributors" on screen (ODbL licence). | [OpenStreetMap](https://www.openstreetmap.org) · [overpass-turbo](https://overpass-turbo.eu) |
| S21 | Background: NBER study of 154 Indian cities. Delhi's slowest hour is 35% slower than its fastest. Rain outside the monsoon has little effect, so use waterlogging depth (S9), not "rain", to slow traffic. | [Akbar et al. – Mobility and Congestion in Urban India (NBER w25218)](https://www.nber.org/system/files/working_papers/w25218/w25218.pdf) |

## Caveats

- **Gurugram has no TomTom index.** The Gurugram scenarios use New Delhi metro figures as a proxy. Say so on screen.
- **Silk Board's volume is a morning count (S5).** It's used for the evening rain scenario as a proxy. The green times add up to more than the 285 s cycle (330 s), so some phases must run at the same time. Model BTM and HSR as overlapping.
- **The vehicle mix is the registered fleet, not traffic on the road.** On-road counts at Indian intersections show fewer two-wheelers (39–44% in S10, against 68% registered). A short video count of your own is the best fix.
- **Rain studies don't hold up for Indian cities.** The NBER study (S21) found light rain doesn't slow Indian traffic. The slowdown comes from waterlogging. That's why the rain scenarios use water depth (S9) together with the observed 4.8 km/h (S2).

## Data still to collect

These would turn the assumptions into sourced numbers:

1. **Signal cycle and green times at Rajiv Chowk, Subhash Chowk and J2 on Hosur Road.** Time 5 cycles, either on site or from a YouTube or dashcam video.
2. **A classified vehicle count.** Take one 15-minute video per approach and count 2W, car, auto and bus.
3. **Approach widths.** Measure them with the Google Maps distance tool.
4. **The real J1 → J2 distance for each route.** Use Maps or OSM.
5. **Optional:** ask the traffic police (Gurugram Traffic Police / BTP ITMS) for junction counts. An RTI or a polite email to them works for student projects.
