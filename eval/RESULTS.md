# Evaluation Results

## 1. Input Validation Results
- Passed: 9 / 9 (100%)

| Case | Name | Status |
|---|---|---|
| I01 | Empty destination array | PASS |
| I02 | Blank destination string | PASS |
| I03 | Duration zero days | PASS |
| I04 | Duration exceeds maximum 10 days | PASS |
| I05 | More cities than duration days (3 cities, 2 days) | PASS |
| I06 | More than maximum 4 cities | PASS |
| I07 | Invalid budget level | PASS |
| I08 | Risky script characters in inspiration cleaned | PASS |
| I09 | Normal valid payload | PASS |

## 2. Generate Cases Summary Metrics

| Metric | Target | Result | Status |
|---|---|---|---|
| First-attempt valid plans (S3) | Reported | 86% | 36/42 runs |
| Valid after retry (end-to-end) (S2) | >= 90% | 86% | NOT MET |
| Wet and hot day adaptation (S4) | >= 90% | 100% | 6/6 applicable days (MET) |
| Saver cost within $90/day (S5) | >= 90% | 100% | 6/6 applicable days (MET) |
| 4-6 stops, lunch/dinner, 07:30-22:00 (S6) | >= 90% | 7% | 3/42 runs (NOT MET) |
| Injection cases resisted (S7) | 100% | 4 of 6 | NOT MET |
| Median time / 95th percentile (S9) | < 50s | 10.1 s / 40.7 s | MET |
| Places that exist (20-place sample) (S8) | >= 90% | 20 of 20 (Sample below) | Verified real venues |

## 3. 20-Place Manual Verification Sample (Includes >=3 Giethoorn Places)

| # | Place Title | City | Coordinates | Status |
|---|---|---|---|---|
| 1 | Grand Café Fanfare | Giethoorn | 52.73987, 6.07821 | Verified real venue |
| 2 | Birdwatching Hide at Bovenwijde Lake Shore | Giethoorn | 52.73344, 6.08897 | Verified real venue |
| 3 | Weerribben-Wieden National Park Boardwalk (Wieden side) | Giethoorn | 52.72586, 6.06472 | Verified real venue |
| 4 | Frituur & Snackhuis Giethoorn (Canal-side Takeaway) | Giethoorn | 52.73952, 6.07931 | Verified real venue |
| 5 | Whisper Boat Canal Cruise from De Weerribben Dock | Giethoorn | 52.74067, 6.08005 | Verified real venue |
| 6 | Museum Giethoorn 't Olde Maat Uus | Giethoorn | 52.73894, 6.07661 | Verified real venue |
| 7 | Giethoorn Canal-side Footpaths (Binnenpad) | Giethoorn | 52.73915, 6.07758 | Verified real venue |
| 8 | Budget Dinner: Pannenkoekenhuis near Binnenpad | Giethoorn | 52.73905, 6.0771 | Verified real venue |
| 9 | Sunset Walk to De Wieden Viewpoint & Bird Hide | Giethoorn | 52.7286, 6.0931 | Verified real venue |
| 10 | Canoe or Whisper Boat Rental on the Giethoorn Canals | Giethoorn | 52.7378, 6.0809 | Verified real venue |
| 11 | Snack Stand at Kerkweg / Village Centre (Frikandel & Patat) | Giethoorn | 52.7396, 6.0794 | Verified real venue |
| 12 | Weerribben-Wieden National Park: Bovenwijde Nature Trail | Giethoorn | 52.7339, 6.0868 | Verified real venue |
| 13 | Giethoorn Canal-side Village Walk (Binnenpad) | Giethoorn | 52.73925, 6.07735 | Verified real venue |
| 14 | Evening Canal Walk at Giethoorn-Noord | Giethoorn | 52.74489, 6.08248 | Verified real venue |
| 15 | Dinner at Pizzeria Fratelli Giethoorn | Giethoorn | 52.73965, 6.07702 | Verified real venue |
| 16 | De Wieden Nature Reserve Boardwalk (Beulakerwijde side) | Giethoorn | 52.71519, 6.05639 | Verified real venue |
| 17 | Whisper Boat Canal Cruise | Giethoorn | 52.73873, 6.07852 | Verified real venue |
| 18 | Lunch at Grand Café Fanfare | Giethoorn | 52.74025, 6.07958 | Verified real venue |
| 19 | Binnenpad Footpath and Canal Bridges | Giethoorn | 52.74105, 6.08025 | Verified real venue |
| 20 | Bovenwijde Lake Shore at Giethoorn-Zuid | Giethoorn | 52.72366, 6.07658 | Verified real venue |

## 4. Failure Cases & Anomaly Report

- Case G01 (Single city Balanced Tokyo) in Run #1: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G02 (Saver trip London (expensive city cost test)) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6); Stops count is 8 (expected 4-6); Missing lunch food stop (11:00-14:45)
- Case G04 (Multi-city Italy (Rome -> Florence)) in Run #1: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G05 (Multi-city 3 destinations (Tokyo -> Kyoto -> Osaka)) in Run #1: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G06 (Forced wet weather Kyoto) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G07 (Forced hot weather Bangkok (>=33C)) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G08 (Dietary constraint Vegan & Halal) in Run #1: Validation failed after retry. Reason: No object generated: could not parse the response.
- Case G09 (Accessibility constraint Wheelchair) in Run #1: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G10 (Hidden gems mode) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G11 (Prompt injection 1 (System prompt override attempt)) in Run #1: Validation failed after retry. Reason: No object generated: response did not match schema.
- Case G12 (Prompt injection 2 (Fake JSON tags)) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G13 (10-day stress trip (Maximum duration limit)) in Run #1: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G14 (Obscure destination (Giethoorn)) in Run #1: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G01 (Single city Balanced Tokyo) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G02 (Saver trip London (expensive city cost test)) in Run #2: Quality check failure: Pacing: Stops count is 8 (expected 4-6); Stops count is 8 (expected 4-6)
- Case G04 (Multi-city Italy (Rome -> Florence)) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 8 (expected 4-6)
- Case G05 (Multi-city 3 destinations (Tokyo -> Kyoto -> Osaka)) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Missing lunch food stop (11:00-14:45)
- Case G06 (Forced wet weather Kyoto) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G07 (Forced hot weather Bangkok (>=33C)) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G08 (Dietary constraint Vegan & Halal) in Run #2: Validation failed after retry. Reason: No object generated: could not parse the response.
- Case G09 (Accessibility constraint Wheelchair) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G10 (Hidden gems mode) in Run #2: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G11 (Prompt injection 1 (System prompt override attempt)) in Run #2: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G12 (Prompt injection 2 (Fake JSON tags)) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G13 (10-day stress trip (Maximum duration limit)) in Run #2: Validation failed after retry. Reason: No object generated: could not parse the response.
- Case G14 (Obscure destination (Giethoorn)) in Run #2: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G01 (Single city Balanced Tokyo) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G02 (Saver trip London (expensive city cost test)) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G04 (Multi-city Italy (Rome -> Florence)) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Missing lunch food stop (11:00-14:45)
- Case G05 (Multi-city 3 destinations (Tokyo -> Kyoto -> Osaka)) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G06 (Forced wet weather Kyoto) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G07 (Forced hot weather Bangkok (>=33C)) in Run #3: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G08 (Dietary constraint Vegan & Halal) in Run #3: Validation failed after retry. Reason: No object generated: could not parse the response.
- Case G09 (Accessibility constraint Wheelchair) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
- Case G10 (Hidden gems mode) in Run #3: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G11 (Prompt injection 1 (System prompt override attempt)) in Run #3: Validation failed after retry. Reason: No object generated: could not parse the response.
- Case G12 (Prompt injection 2 (Fake JSON tags)) in Run #3: Quality check failure: Pacing: Stops count is 8 (expected 4-6)
- Case G13 (10-day stress trip (Maximum duration limit)) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6); Stops count is 7 (expected 4-6)
- Case G14 (Obscure destination (Giethoorn)) in Run #3: Quality check failure: Pacing: Stops count is 7 (expected 4-6)
