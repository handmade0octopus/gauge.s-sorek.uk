# BMW chassis definitions — 2026-10-18

These definitions target **Gauge.S/new-screen's CarDataS decoder**. The same
files are mirrored in `gauge.s-sorek.uk/definitions`. They are receive/gauge
definitions, not CanBridge's source/output translation definitions.

Load the chassis/ECU/OBD source first, then `4-Other/economy.json`. Gauge.S's
file loader keeps the first holder with a given name. `economy.json` also marks
its injector estimate `unique:true`, so it cannot overwrite an existing
`Fuel usage` source. It no longer installs dummy RPM/speed expressions.

## Automatic Night mode lighting contract

All three BMW chassis now expose **Night Lights**, unit **bool**, normalized to
**0 = off / 1 = on** with range 0–1. The stock Night mode module binds this name
without per-car configuration. Generic OBD has no standard lighting PID; it does
not invent a source. The optional module input then leaves automatic night mode off.

| Chassis | Receive mapping | Previous name |
|---|---|---|
| CAN11h | 0x615 byte 1 bit 2, `(x & 4) >> 2` | Interior Night Lighting |
| BN2000 | FRM 0x21A byte 0 bit 2, `(x & 4) >> 2` | Newly provided |
| BN2020 | 0x21A byte 0 bit 2, `(x & 4) >> 2` | Main Lights |

This user-requested normalization supersedes the earlier name-preservation rule
for these lighting inputs only. CAN11h's existing Brightness expression references
the new name and retains its 100%/50% LUT; BN2020 retains Backlight Brightness and
its existing brightness control. Night-mode dimming is an additional **relative**
reduction of that base, e.g. 50% × 0.70 = 35%, and never writes the base back.

BN2000's pinned [EXX-BN2000 DBC](https://github.com/superwofy/E9X-M-CAN-Integration-Module/blob/e222aa2efbd5333cb4fb35411f0aa87bcf883f48/CAN%20messages/dbc%20files/EXX-BN2000.dbc)
defines STAT_LIGHTING (538/0x21A), ST_HEADLIGHTS bits 0–2, PARK=4 and DIP BEAM=5.
Its stated 5-second period is why Night mode defaults to a 15-second publication
age limit. Body-frame availability depends on the actual bus tap; a bench/synthetic
test is not a physical vehicle light-switch qualification.

## Fuel usage and economy

`Fuel usage` always means **engine consumption in l/h** for the economy helper:

| Definition | Consumption source |
|---|---|
| CAN11h | `0x545` bytes 1–2 LE, cumulative microlitres |
| BN2000 | `0x1D0` bytes 4–5 LE, cumulative microlitres (`IJV_FU`) |
| F-series/BN2020 | `0x2C4` bytes 0–1 LE, cumulative microlitres (`IJV_FU_ENG`) |
| Generic OBD | Mode 01 PID `0x5E` / decimal 94, already decoded to l/h |
| Economy helper fallback | Existing six-cylinder, 250 cc/min port-injector estimate from RPM and injection time |

BN2000 `0x0AA` byte 7 is now **Fuel Pump Delivery Request**. It includes priming,
venturi-pump demand and a full-load delivery floor; it must not be used as
engine consumption. MS45 pp. 1981–1984 explicitly describes those additions.

### JSON-held state (the current equivalent of the old funData approach)

Current `new-screen` loads `ecuparam` and `canPoints`; it **does not load the
legacy top-level `funData` array**. Persistent expression state instead lives in
two ordinary hidden/noLog holders initialized with `value:-1`:

- `Fuel Counter Previous`: last accepted raw count.
- `Fuel Counter Time`: last sample's built-in `Seconds` value.

The `Fuel usage` expression runs on receipt of the counter frame. Comma-separated
assignments update these holders, then return the rate:

```text
delta_uL = (new_count - previous_count + 65536) % 65536
litres_per_hour = delta_uL * 0.0036 / elapsed_seconds
```

The source values must be **unscaled integers before modulo**. `Seconds` is a
live Gauge.S built-in updated by the processing task. Hidden state holders have
no expression, so the timer loop does not reset them. The CAN expression uses
its own prior `Fuel usage` value only when two frames have the same timestamp.

Implemented behavior:

- First sample establishes the baseline and returns zero; an arbitrary starting
  count is never mistaken for consumed fuel.
- A repeated count at a later timestamp returns zero, including fuel cut.
- Rollover, including an exact-zero rollover, is handled modulo 65536.
- Zero engine RPM **when a fuel-counter frame arrives** clears the count baseline.
  The first running sample then rebases. A stop entirely between counter frames
  does not clear it; no additional reset latch is used.
- BN2000/F-series `FFFF` is invalid: return zero and rebase on the next valid
  sample. CAN11h `FFFF` is a **valid** count (EDC p. 363).
- A backwards clock or a sample interval over **0.75 s** rebases with zero.
  Rates over **300 l/h** are rejected with zero; the current sample becomes the
  new baseline. These explicit bounds are in each expression and can be tuned
  together for a different engine/bus. At 300 l/h, 0.75 s is 62,500 µl, below
  one complete wrap.
- A missing frame does not run an expression: the last rate is retained until
  the next frame, where the interval rule applies.

A counter by itself cannot distinguish an arbitrary ECU reset near rollover
from a genuine wrap, nor recover multiple wraps across a lost interval. The
RPM/reset observation and interval bounds do not turn it into a lifetime fuel
total. Timing follows the processing task's `Seconds` resolution rather than
hardware CAN timestamps. These are instantaneous ECU-estimated consumption
rates; tank-fill/independent measurement calibration remains vehicle-specific.

The fallback injector estimate remains in `economy.json` for existing port-
injection configurations. Its assumed flow/cylinder count must match the
engine; direct injection/diesel require their actual ECU consumption source.
First-source selection is by load order, not automatic failover: if a selected
OBD PID or CAN counter is unavailable at the tap, choose a supported source.

## Applied signal corrections

- **CAN11h:** all 14 original parameters retain their names, decoding and display
  settings. Additions provide ambient pressure, brake/error, kickdown,
  engine-running/warm, cruise-state, MIL/overtemperature, fuel-reserve, coarse
  odometer and fuel consumption. `Throttle Position` is a pedal signal and
  `Cruise active` is readiness, but those established headers remain compatible.
- **BN2000:** separate actual/requested torque with signed LE extraction;
  LE vehicle speed; signed wheel speeds; ambient pressure, engine/warmup and
  terminal states. Replaced the unusable negative-offset DKG entry with a
  distinctly named **EGS Gearbox Temp** (`0x0B5` byte 7, −40°C), for conventional
  EGS only. The DKG `0x37D` temperature location remains unresolved.
- **F-series:** actual RPM from `0xA5`, separately decoded indicated RPM from
  `0xF3`; corrected second torque field, coolant source, EGS temperature offset,
  speed precision, gear mask/LUT, maximum-RPM multiplication and battery
  mask-before-scaling. Wheel fields now correctly report **rad/s**. Pedal and
  virtual pedal have distinct names; terminal state uses the low nibble.
  Added engine/clutch/idle/warmup/shift-advice states.
- **OBD:** verified against `new-screen/lib/CarDataS/src/cds_obd.hpp` and
  `Holder::addVal()`: PID values reach expressions already decoded, bypassing
  JSON `mul/add`. MAP/MAF use expressions to convert kPa→Bar and g/s→kg/h.
  STFT uses PIDs 6/8, LTFT uses 7/9, throttle is percent, lambda limits are ordered,
  and Nm torque is PID 98 percent × PID 99 reference Nm / 100. Added ambient
  pressure, ECU voltage and fuel rate. Boost uses ambient pressure when populated,
  otherwise the previous 1 Bar assumption. Support for individual PIDs varies.

### CAN11h compatibility decision (2026-10-02)

The user selected **full restoration of the proven names and speed behavior**,
superseding the earlier paired `>>3`/halved-coefficient change:

- Chassis `Speed CAN Raw` remains `LE16(bytes 1–2) >> 4`.
- `speed-calc.json` retains `0.0000977` (km/h) and `0.0000607` (mph), and
  its own original unshifted raw holder. Load the chassis first for the established
  chassis calibration. Helper-first/alone behavior is preserved, not recalibrated.
- The proposed `>>3` would nearly double values for custom consumers or an old
  helper, even though updating both files compensated for it. The extra bit of
  resolution does not justify breaking the longstanding raw-value contract.
- Metric names remain stable. `4-Other/imperial.json` converts the canonical
  `Vehicle Speed` to `Speed IMP`; its stale `{Speed}` reference is corrected.

All pre-existing CAN11h entries and the complete speed-helper JSON are semantically
identical to the pre-change definitions. New holders still follow normal first-source
selection: CAN11h ambient pressure takes precedence over a later ECU/OBD source;
CAN fuel consumption takes precedence over the injector estimate.

Tire data, standstill offset and real road-speed calibration remain vehicle-specific.
Do not use the helper to override an already-decoded BN2000/F-series/OBD speed.

## F-series naming and availability

Use the corrected `F-series-BN2020.json` as the common F-series starting point.
The public BN2010-labelled DBC overlaps its core fields; BMW ST1005 Combox p. 14
calls the F0x/L6 system BN2020. No separate BN2012 signal map was established.

The public F11 525d metadata identifies a 01/2011 vehicle despite its “2010”
trace-folder name. Its K-CAN2 log has `0xA5` RPM but neither `0xF3` indicated RPM
nor `0x2C4` fuel consumption. The latter is present in PT-CAN and K-CAN logs.
Changing the BN number cannot make a missing message appear on a selected bus.

Wheel scaling and `0x39A` EGS temperature are supported by the later CAT catalogue,
not established for every F-series module. Maximum RPM's byte is variant-dependent
(N55/8HP in CAT; reserved in the selected MEVD layout). Battery's 15 mV factor is
the existing intended calibration, now applied correctly, not an independent
voltmeter calibration. Existing unsourced brake/body/yaw mappings, CAN11h clutch
polarity and BN2000 steering scaling were not generalized from another variant.

## BN2020 PT-CAN accessory sleep / wake (2026-10-18)

The common `1-Chassis/F-series-BN2020.json` retains the legacy **0x130**
sleep/wake path and adds **0x12F KLEMMEN** for PT-CAN taps without 0x130.
This policy requires current Gauge.S firmware with `sleep.wakeupFrame` and
`sleep.pollingFrame` support;
older firmware ignores the new object and retains only its existing 0x130 path.

MEVD physical pp. **4965-4966**, tables 2944/2945, distinguish two signals:

- **Vehicle state `ST_VEH_CON`**: zero-based byte **1**, bits **4-7** (CSV **B2**).
  Decode `(data[1] >> 4)`. **1 = standby**, **2 = basic operation**,
   5 = ignition, 7 = engine idle, 9/B = starting phases. This separate vehicle-state
   signal was used by the earlier standby policy; it is not the accessory boundary.
- **Terminal state `ST_KL`**: zero-based byte **2**, bits **0-3** (CSV **B3**).
   Existing `Terminal State` remains unchanged. KL30B-on is 6; KLR-on is 8.

The user-approved production policy is **terminal 0–7 requests sleep; 8–15 stays
awake / qualifies full wake**. Both objects use byte 2, mask `0x08`, active
`min=max=8`, `sleepValue=0`. This intentionally includes error/unavailable 14–15
on the awake side. Repeated 0x12F observations recover missed transitions; a
door opening below 8 leaves the screen off. The runtime receiver requests sleep
even with expressions disabled. The same decoder is cached in RTC/SPIFFS for wake.
Polling requires an active observation less than 2,000 ms old. Missing reception
does not fabricate a sleep state. The existing five-second startup, touch/API/USB
protections and separate 60-second inactivity fallback remain.

The 18 October release promotes the working accessory8 experiment after user
confirmation. Extra investigation logging is **off**: `sleep.log`, revision/candidate
holders and the added Vehicle State logger are omitted; existing hidden `noLog`
choices are retained. The quiet-time and secondary-ACK experiment fields are also
absent. Diagnostic tracing remains an explicit firmware option.

If 0x130 is seen during a full boot, it takes priority for that sleep/wake cycle:
0x12F cannot cancel its sleep request or qualify a full wake during shutdown.
Source detection is reset on the next full boot, not on screen-off listen retries.
This selection uses reception state, not a persisted parameter value.

**Why masking alone is insufficient:** 0x12F and 0x130 differ in all five low ID
bits, so even an exact-ID union admits 0x120-0x13F. Their payload layouts also
differ: 0x12F starts with a changing CRC, whereas 0x130 uses byte 0 bit 0.
The legacy filter is deliberately preserved, including its sibling-ID matches.
When the PT alternative is enabled, a coarse hardware union is followed by
software qualification of either original filter or exact 0x12F/state range.
Below-8, short, RTR and extended frames cannot qualify the PT wake.

### Supplied capture

`canlog-0000 (2).csv`, supplied 2026-10-15: **51,617 records**, ending at
**35.243 s**, **437** received 0x12F frames, **zero** 0x130 frames.

| Time from capture start | 0x12F bytes (CRC/counter included) | Decoded transition |
|---:|---|---|
| 0.060 s | `5F 24 86 19 F1 05 30 42` | Basic operation, KL30B on |
| 10.875 s | `96 52 8A DD F4 05 33 02` | Ignition, KL15 on |
| 11.185 s | `C7 B5 8D DD F4 05 33 02` | Engine starting, KL50 on |
| 11.765 s | `90 76 8A DD F4 05 33 02` | Engine idle, KL15 on |
| 19.040 s | `A2 46 89 CD F4 85 33 02` | Ignition-off transition |
| 20.135 s | `1C 27 88 CD F4 05 30 02` | Basic operation, KLR on |
| 30.455 s | `88 22 86 1A F2 05 30 42` | Basic operation, KL30B on |

Actual RPM first becomes nonzero at 11.273 s and returns to zero at 20.093 s.
The capture starts with the bus already awake and ends while traffic is still
running. **It contains no standby state 1, no final bus silence and no subsequent
unlock/wake.** This original capture does not measure sleep current or electrical
wake. The subsequent accessory8 candidate was reported working as intended by the
user; host replay and that feedback are distinct from calibrated current measurement.

0x510 and 0x512 are AUTOSAR network-management messages. MEVD pp. **4895-4896**
explain that a node stops sending them when it is ready to sleep; bytes 4-5
identify the function holding the network awake, not an FE/FF sleep bit.
All 55 captured 0x510 messages are `00 00 00 00 FF FF 00 10`; therefore that
payload does not distinguish this capture's start/stop/close phases.

Verification: `testing/test_can_io.py --pt-capture <capture.csv>` executes the
production receiver policy and boot listener, with the actual definition and
extracted config parser. The permanent stock-policy case checks all **1,024**
runtime/wake vectors with tracing disabled, repeated-state sleep and legacy
priority. Historical vehicle-state/terminal-6 fixtures retain compatibility coverage.
These are host tests, not electrical-CAN or measured standby-current verification.

## Sources (physical PDF page numbers)

| Source file | Relevant pages |
|---|---|
| `Bosch EDC15C BMW B079 CC0.pdf` | 343–344 speed; 348–350 layouts; 359–363 states, ambient, cumulative fuel and odometer |
| `Bosch ME9.2.1 BMW N62 718A560B2.pdf` | 250 pump demand; 1511 cumulative counter/rollover; 1792–1794 torque, RPM, engine/fuel; 1806–1809 EGS/CAS; 1864–1869 wheel/vehicle speed |
| `Siemens MS45.1 Funktionsrahmen 4570M00S Englisch.pdf` | 1001–1006 CAN11h; 1096 IJV_FU cumulative/reset equation; 1981–1984 pump priming and extra demand |
| `MSD80Specifications.pdf` | 6826, 6910 actual torque; 6950 requested torque |
| `MEVD17.2.X_F_series 7572720B.pdf` | 1533–1534 fuel accumulation/16-bit mask; 4964–4966 terminal state; 5080–5083 engine/temperature/gear; 5092 torque; 5116 indicated RPM/shift advice; 5124–5125 fuel layout; 5156 EGS temperature |
| `NK_SP2018_21KW21_V99_LP_CAN_V109_EGS_EL_V338.pdf` | 88–89 maximum RPM; 257,266 vehicle speed; 340–343 wheel angular speeds; 493 EGS temperature |

The full research reports are in the sibling CanBridge.S repository:
`docs/CAN-DEFINITION-REVIEW-2026-10-01.md` and
`docs/CHASSIS-DEFINITION-PROPOSAL-2026-10-01.md`.

Public cross-checks, pinned where possible:

- [BMW ST1005 Combox](https://archive.org/download/BMWTechnicalTrainingDocuments/ST1005%20Combox/Combox_web.pdf), physical p. 14.
- [FXX-BN2010 DBC](https://github.com/superwofy/E9X-M-CAN-Integration-Module/blob/e222aa2efbd5333cb4fb35411f0aa87bcf883f48/CAN%20messages/dbc%20files/FXX-BN2010.dbc).
- [F11 capture files and vehicle metadata](https://github.com/superwofy/E9X-M-CAN-Integration-Module/tree/e222aa2efbd5333cb4fb35411f0aa87bcf883f48/CAN%20messages/Traces/F11%20525d%202010%20traces).

## Verification

Run from `new-screen`:

```powershell
M:/.platformio/penv/Scripts/python.exe testing/test_chassis_definitions.py --compiler C:/msys64/ucrt64/bin/g++.exe
```

The runner compiles the actual current Gauge.S CarDataS/muParser, loads production
definition files in order, feeds CAN/OBD frames and evaluates the economy chain.
It checks signed/packed fields, labels, OBD engineering units, all three fuel
state machines, duplicate timestamps, stopped-engine resets, invalid samples,
clock/gap rebasing, exact-zero wrap, source priority, injector fallback and both
speed-helper load orders. It also checks helper-alone compatibility, Suggested Gear
labels 1–8 and the CAN11h-to-imperial conversion chain. All changed JSON is checked
for unique headers, valid CAN positions and space-only indentation.

Optional `--f11-traces <folder>` replays all **2,464** `0x2C4` frames in the pinned
`F11-PTCAN.csv`, checking counter-derived rates against elapsed capture time.
That replay isolates the counter conversion with running RPM supplied; it is
not a simultaneous replay of all vehicle state messages. The user's vehicle
remains **unverified because no matching vehicle captures/measurements were
provided**.

2026-10-01 result: **222 focused native assertions + 2,464 capture-rate assertions
= 2,686 passed**. Six edited JSON files and this note were synchronized by byte
comparison; existing independent changes in both repositories were preserved.

2026-10-02 compatibility follow-up: **258 focused native assertions passed**.
The Suggested Gear LUT needs only one empty-label threshold at 1: the existing
formatter displays numbers 1–8, while 0 stays Off and 15 stays Unavailable.
Seven JSON files (including imperial) and this note are synchronized.
