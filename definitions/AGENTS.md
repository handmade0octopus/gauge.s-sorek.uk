# Gauge.S Definition Files Guide

## What Are Definition Files?

Definition files (`.json`) tell your Gauge.S device **what parameters to read** from your car's ECU, **how to decode them**, and **how to display them**. They are the bridge between raw vehicle data and meaningful gauges on your screen.

Each definition file contains an array of `ecuparam` entries. Each entry defines:
- **What to read**: A specific sensor value (RPM, coolant temp, etc.)
- **Where to read it from**: K-line address, CAN bus ID, analog input, or expression
- **How to decode it**: Multipliers, offsets, formulas, lookup tables
- **How to display it**: Units, decimal places, min/max values, warnings

---

## File Structure

```json
{
  "canSpeed": 500,
  "address": ["0x12", "0x05", "0x0B", "0xB0", "0xAC"],
  "ecuparam": [
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "address": "0x000000DA2A",
      "mul": 1.0,
      "add": 0,
      "dec": 0,
      "max": 7000,
      "min": 0,
      "flashPoint": 7000
    }
  ]
}
```

### Top-Level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `canSpeed` | For CAN | CAN bus speed in kbps (100, 125, 250, 500, 1000) |
| `address` | For K-line | Array of hex bytes for DS2/KWP initialization |
| `defaultRate` | No | Poll rate in **Hz** for this file's actively-requested params (0/absent = free-run). Applies to KWP-CAN and OBD sources; legacy `pollMs` (ms period) still works and converts to Hz. Overridable per file via `filelist.json` `{"path": ..., "rate": Hz}` |
| `ecuparam` | **Yes** | Array of parameter definitions |

**Rate semantics**: params from a rate-limited file are grouped into their own dynDID block(s) on BOSCH/multi-block ECUs (e.g. MG1 main file + a `"defaultRate": 0.1` temperatures file = temps polled once per 10s in their own block). On single-telegram ECUs (TELE/MSV80) all params share one telegram polled at the fastest rate present. OBD PIDs from a rate-limited file are requested at that rate in the round-robin. Passive sources (broadcast `canId` listeners, analog) are never rate-limited. KWP-CAN rates only apply while an OBD2 file is also loaded (OBD coexistence) — a KWP-only filelist always free-runs at ECU answer speed.

---

## Canonical Parameter Naming & Units (v3.14+)

BMW chassis revisions, fuel-counter state, source priority and calibration notes:
[BMW-CHASSIS-NOTES.md](BMW-CHASSIS-NOTES.md). These receive definitions target
Gauge.S/new-screen, not CanBridge's source/output format. Current new-screen
does not load legacy top-level `funData`; use hidden `ecuparam` holders with
`value` initialization and expression assignments for stored state.

All definitions use the same canonical parameter names and **metric units** (Bar, °C, km/h). Gauge designs reference these names — keep them stable.

Treat existing headers as an integration contract: `4-Other` helpers reference
them too. Keep CAN11h's proven `Throttle Position`, `Cruise active` and raw-speed
scale; document more precise signal meanings without renaming established inputs.
Imperial conversion belongs in `4-Other/imperial.json`, using `Vehicle Speed`.

### Canonical names

| Canonical | Unit | Aliases (renamed from) |
|-----------|------|------------------------|
| `Engine Speed` | RPM | Engine speed, Engine RPM, Engine_Speed |
| `Vehicle Speed` | km/h | Speed, Vehicle speed, Indicated Vehicle Speed kph |
| `Coolant Temp` | °C | Coolant temp, ECT, Water Temp |
| `Oil Temp` | °C | Oil temp, Oil Temperature, Oil_Temp |
| `Intake Air Temp` | °C | Intake Temp, Charge Temp, Charge Air Temp, IAT |
| `Throttle Position` | % | TPS, TPS Value |
| `Accelerator Pedal` | % | PVS, Accel Ped. Pos., Pedal pos |
| `Mass Airflow` | kg/h | Mass airflow, MAF |
| `Ignition Angle` / `Ignition Cyl 1..6` | °CRK | Ignition cylinder N, Ignition N |
| `Torque` | Nm | Engine Torque, Calculated Torque |
| `Fuel Inj` | ms | Injection time, Injection Quantity |
| `Fuel usage` | l/h | Actual consumption rate; consumed by `4-Other/economy.json` |
| `Battery Voltage` | V | Battery voltage, Batt_Volts |
| `EGT` | °C | Exhaust Gas Temp, EGT 1 |
| `Lambda 1` / `Lambda 2` | λ | Lambda_1, Lambda Bank 1 |
| `Lambda Setpoint` | λ | Lambda setpoint |
| `STFT 1/2`, `LTFT 1/2` | % | STFT, LTFT, STFT1, STFT - Bank 1 |
| `Wastegate Duty` | % | WG PWM, Wastegate duty, VNT duty |
| `Oil Pressure` | Bar | — |
| `Fuel Pressure` | Bar | Fuel high pressure, Rail Pressure, Fuel_Press |
| `Fuel Pressure Target` | Bar | Target Rail Pressure, Rail press set |
| `Ambient Pressure` | Bar | Atmospheric Pressure, Barometric Pressure, Air Pressure |

### MAP / Boost availability rule

Every definition that has *either* a manifold or boost reading must expose **both**, in **Bar**:

| Canonical | Meaning | Form |
|-----------|---------|------|
| `MAP` | manifold **absolute** pressure (Bar) | direct param (DID/CAN/OBD2) |
| `Boost` | **relative** = MAP − Ambient (Bar) | expr param |

If no `Ambient Pressure` param exists on the definition, `Boost` falls back to assuming 1 Bar ambient: `"expr": "x-1"` with `"x": "MAP"`.

### Unit rules

- **Pressure**: always `Bar` (convert hPa ÷1000, kPa ÷100, psi ×0.0689476 in `mul`).
- **Temperature**: always `°C`.
- **Speed**: always `km/h`.
- Exception: `4-Other/imperial.json` deliberately converts to imperial (°F/psi/mph) — that's its purpose.

---

## Parameter Fields

### Basic Fields (All Parameters)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `header` | string | **required** | Unique name. Used to reference this parameter from other parameters |
| `alias` | string | `header` | Short display name shown on screen |
| `unit` | string | "" | Display unit ("RPM", "°C", "V", "km/h", etc.) |
| `dec` | int | 2 | Decimal places to display |
| `max` | float | 0 | Maximum value for graph scaling (0 = auto-scale) |
| `min` | float | 0 | Minimum value for graph scaling |
| `hidden` | bool | false | Hide from display but still log |
| `noLog` | bool | false | Exclude from data logging |
| `resetTime` | int | 5 | Seconds between min/max resets. 0 = manual only |
| `flashPoint` | float | - | Screen flashes when value >= this |
| `autoLogPoint` | float | - | Auto-start logging when value >= this |
| `warningPoint` | float | - | Show on-screen warning when value >= this |
| `warningString` | string | - | Text to show in warning popup |

### Data Source Fields (Pick ONE source type)

#### K-line / DS2 Protocol

| Field | Description |
|-------|-------------|
| `address` | Hex string like `"0x010000DA2A"` or byte array `["0x12","0x05",...]` |
| `offset` | Byte position in response (0-based) |
| `length` | Number of bytes (1, 2, or 4) |
| `mul` | Multiply raw value by this |
| `add` | Add this after multiplication |

#### CAN Bus

| Field | Description |
|-------|-------------|
| `canId` | CAN frame ID (hex `"0x316"` or decimal `790`) |
| `offset` | Byte position in CAN frame (0-7) |
| `length` | Byte length (1 or 2) |
| `mul` | Multiply raw value |
| `add` | Add after multiplication |

#### Analog Inputs

| Field | Description |
|-------|-------------|
| `expr` | Expression using `"Analog 1"` through `"Analog 7"` as inputs |

Analog inputs are voltage readings (0-3.3V or 0-5V depending on pin). Use expressions to convert voltage to real-world values.

#### Expressions (Calculated Parameters)

| Field | Description |
|-------|-------------|
| `expr` | Math expression. Can reference other parameters by `header` name |
| `x`, `y`, `z` | Up to 3 parameter references for use in `expr` |

### Special Fields

| Field | Description |
|-------|-------------|
| `stringLut` | Lookup table to convert numeric values to text labels |
| `lutTable` | Lookup table for sensor calibration (x=voltage, y=value) |
| `eventsPerSecond` | Rate limit for expression evaluation (default: every poll). **On OBD params it sets the POLL rate** (e.g. `"eventsPerSecond": 0.1` = request that PID once per 10s) — use it for slow params you don't need fresh. Ignored on KWP params (would regroup dynDID blocks) |
| `avgLen` | Distance (km) for `avg()` function averaging window |
| `replace` | If true, replaces an existing parameter with same header |

---

## Data Source Types Explained

### 1. K-line / DS2 (BMW Pre-2007)

The device sends a query address repeatedly, and the ECU responds with a byte array.

```json
{
  "header": "Coolant Temp",
  "unit": "°C",
  "address": "0x000000DA5A",
  "mul": 0.747,
  "add": -48,
  "max": 120,
  "min": 60,
  "dec": 1
}
```

**How it works:**
- Device sends query for address `0x000000DA5A`
- ECU responds with bytes
- Device extracts bytes (auto-calculated from address)
- Applies: `value = raw * 0.747 + (-48)`

For DS2 protocol, set `address` in main config:
```json
{
  "address": ["0x12", "0x05", "0x0B", "0xB0", "0xAC"]
}
```

For KWP protocol, also add:
```json
{
  "forceKwp": true
}
```

### 2. Telegram Mode (DS2 Extended)

Special mode for parameters found in RomRaider/TunerPro definitions.

```json
{
  "header": "Engine Load",
  "unit": "mg/str",
  "address": "0x010000FAFC",
  "mul": 0.021,
  "max": 700,
  "dec": 1
}
```

The `address` format is: `0xTTAAAAAAVV` where:
- `TT` = type byte
- `AAAAAA` = address bytes
- `VV` = validation byte

Offset and length are calculated automatically from the address.

### 3. CAN Bus

Read data directly from CAN frames.

```json
{
  "header": "Engine Speed",
  "unit": "RPM",
  "canId": "0x316",
  "offset": 2,
  "length": 2,
  "mul": 0.15625,
  "dec": 0
}
```

**Key points:**
- `canId`: Hex string (with `0x` prefix) or decimal number
- `offset`: 0-based byte position in the 8-byte CAN frame
- `length`: 1 or 2 bytes (3-4 byte parameters use expressions)
- For signed values, use `"expr": "signed(x)"`

### 4. Analog Inputs

Read voltage from analog pins and convert to real values.

```json
{
  "header": "Oil Pressure",
  "unit": "Bar",
  "expr": "2.5*(x-0.5)",
  "x": "Analog 1"
}
```

Available analog inputs:
- `"Analog 1"` - `"Analog 4"`: 0-5V tolerant (with voltage divider)
- `"Analog 5"`: 0-12V tolerant
- `"Analog 6"` - `"Analog 7"`: Configurable (see PCB dipswitches)

### 5. Expressions

Calculate values from other parameters.

```json
{
  "header": "Fuel Usage",
  "unit": "l/h",
  "expr": "(x/60)*(y/1000)*(250/16.6667)*3",
  "x": "Engine Speed",
  "y": "Fuel Inj"
}
```

**Expression syntax:**
- Standard math: `+`, `-`, `*`, `/`, `^` (power), `%` (modulo)
- Boolean: `&&`, `||`, `==`, `!=`, `>`, `>=`, `<`, `<=`
- Bitwise: `&`, `|`, `>>`, `<<`, `^`
- Ternary: `condition ? value_if_true : value_if_false`
- Parentheses for grouping

**Referencing parameters:**
- `x`, `y`, `z`: Referenced via the `x`, `y`, `z` fields
- `{Parameter Name}`: Direct reference to any parameter by header (v2.20+)
- If no `x`/`y`/`z` is specified, expression uses this parameter's own value

---

## Built-in Functions

| Function | Description | Example |
|----------|-------------|---------|
| `clip(x, max)` | Limit x to maximum (default max=99) | `clip(100*x/y)` |
| `avg(name, x, y)` | Rolling average over distance (km) | `avg("Economy", x, y)` |
| `trip(name, x)` | Trip odometer | `trip("Trip 1", x)` |
| `delta(name, x)` | Change per second | `delta("RPM Delta", x)` |
| `filter(name, count)` | Moving average of last N values | `filter("Analog 1", 64)` |
| `lutTable(name, x)` | Lookup table interpolation | `lutTable("Oil Temp", x)` |
| `map(x, in_min, in_max, out_min, out_max)` | Map range | `map(x, 0, 1023, 0, 100)` |
| `signed(x, bytes)` | Convert to signed (1 or 2 bytes) | `signed(x, 2)` |
| `setBrightness(x)` | Set screen brightness (0-100%) | `setBrightness(x)` |
| `setPwm(x)` | Set PWM on EA pin | `setPwm(x)` |
| `buttonPress(all, confirm, next, prev)` | Virtual button inputs | `buttonPress(0, x>0, y>0, z>0)` |
| `sleep(bool)` | Put device to sleep | `sleep(x > 10)` |

---

## Lookup Tables

### String LUT (Convert numbers to text)

```json
{
  "header": "Gear",
  "unit": "Byte",
  "canId": "0x1D2",
  "offset": 2,
  "length": 1,
  "expr": "signed(x)",
  "stringLut": [
    { "x": -1, "y": "R" },
    { "x": 0, "y": "N" },
    { "x": 1, "y": "" }
  ]
}
```

**Note:** String LUTs select the last listed row whose `x` is at or below the value.
List thresholds in ascending order. An empty `y` displays the formatted numeric
value instead (for example, `0: "Off"`, `1: ""`, `15: "Unavailable"` shows gears 1–8).

### Value LUT (Sensor Calibration)

```json
{
  "header": "Oil Temp",
  "unit": "°C",
  "expr": "lutTable('Oil Temp', x)",
  "x": "Analog 4",
  "lutTable": [
    { "x": 0.053, "y": 140 },
    { "x": 0.066, "y": 130 },
    { "x": 0.083, "y": 120 },
    { "x": 3.005, "y": -40 }
  ]
}
```

The device interpolates between points linearly.

---

## CAN Retransmission

Send data back out on CAN bus:

```json
{
  "header": "Battery Voltage",
  "canFrame": {
    "canId": 129,
    "canPoints": [
      {
        "expr": "x*10000",
        "x": "Accel X",
        "offset": 3,
        "length": 3,
        "reverseEndianness": false
      },
      {
        "offset": 0,
        "length": 2,
        "mul": 100
      }
    ]
  }
}
```

Each `canPoint`:
- `offset`: Byte position in frame (0-7)
- `length`: Bytes to write (1-4)
- `x`: Parameter to send (uses parent header if omitted)
- `expr`: Transform before sending
- `mul`/`add`: Simple transform (faster than expr)
- `reverseEndianness`: Byte order (default: true = big-endian)

---

## Predefined Parameters

These parameters exist automatically (no definition needed):

| Parameter | Description | Requirement |
|-----------|-------------|-------------|
| `Seconds` | Time since boot | Always available |
| `Accel X/Y/Z` | Acceleration in G | ADXL345 connected via I2C |
| `GPS Speed` | Speed in km/h | GPS module + `"gps": true` |
| `GPS North` | Heading in degrees | GPS module + `"gps": true` |
| `GPS Altitude` | Meters above sea level | GPS module + `"gps": true` |
| `GPS Latitude/Longitude` | Position | GPS module + `"gps": true` |
| `Analog 1` - `Analog 7` | Raw voltage readings | Always available |
| `Input V` | Device supply voltage | Always available |

---

## Examples by Car/ECU

### BMW E36 with MS41 ECU

```json
{
  "canSpeed": 500,
  "address": ["0x12", "0x05", "0x0B", "0x00", "0x1C"],
  "ecuparam": [
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "address": "0x010000DA2A",
      "dec": 0,
      "max": 7000,
      "flashPoint": 7000
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "address": "0x000000DA5A",
      "mul": 0.747,
      "add": -48,
      "max": 120,
      "min": 60,
      "dec": 1
    },
    {
      "header": "TPS",
      "unit": "%",
      "address": "0x000000E8D7",
      "mul": 0.3921569,
      "max": 100,
      "dec": 0
    }
  ]
}
```

### BMW E46/E39 CAN Bus (Pre-2007)

```json
{
  "canSpeed": 500,
  "ecuparam": [
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "canId": "0x316",
      "offset": 2,
      "length": 2,
      "mul": 0.15625,
      "dec": 0
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "canId": "0x329",
      "offset": 1,
      "mul": 0.75,
      "add": -48
    },
    {
      "header": "Speed CAN Raw",
      "canId": "0x153",
      "offset": 1,
      "length": 2,
      "expr": "x >> 4"
    }
  ]
}
```

### Bosch PST-F1 Oil Temp/Pressure Sensor

```json
{
  "ecuparam": [
    {
      "header": "Oil Temp",
      "unit": "°C",
      "expr": "lutTable('Oil Temp', x)",
      "x": "Analog 4",
      "lutTable": [
        { "x": 0.053, "y": 140 },
        { "x": 0.066, "y": 130 },
        { "x": 0.083, "y": 120 },
        { "x": 0.105, "y": 110 },
        { "x": 0.134, "y": 100 },
        { "x": 0.173, "y": 90 },
        { "x": 0.226, "y": 80 },
        { "x": 0.297, "y": 70 },
        { "x": 0.393, "y": 60 },
        { "x": 0.521, "y": 50 },
        { "x": 0.692, "y": 40 },
        { "x": 0.913, "y": 30 },
        { "x": 1.190, "y": 20 },
        { "x": 1.516, "y": 10 },
        { "x": 1.874, "y": 0 },
        { "x": 2.232, "y": -10 },
        { "x": 2.554, "y": -20 },
        { "x": 2.815, "y": -30 },
        { "x": 3.005, "y": -40 }
      ]
    },
    {
      "header": "Oil Pressure",
      "unit": "Bar",
      "expr": "2.5*(x-0.5)",
      "x": "Analog 1",
      "dec": 1
    }
  ]
}
```

### Economy/Fuel Consumption

```json
{
  "ecuparam": [
    {
      "header": "Fuel usage",
      "unit": "l/h",
      "expr": "(x/60)*(y/1000)*(250/16.6667)*3",
      "x": "Engine Speed",
      "y": "Fuel Inj"
    },
    {
      "header": "Economy",
      "unit": "l/100km",
      "expr": "clip(100*x/(y+0.1))",
      "x": "Fuel usage",
      "y": "Speed"
    }
  ]
}
```

**Note:** Change `250` to your injector flow rate in cc/min.

---

## How to Create Definitions for Your Car

### Step 1: Identify Your ECU Protocol

| Car | Year | Protocol | Example Address |
|-----|------|----------|----------------|
| BMW E30 | 1982-1994 | K-line DS2 | `0x12 0x05 0x0B 0xB0 0xAC` |
| BMW E36 318i (M43 / BMS43) | 1994-2000 | K-line DS2 | `0x12 0x05 0x0B 0x03 0x1F` |
| BMW E36 (MS41) | 1990-2000 | K-line DS2 | `0x12 0x05 0x0B 0x00 0x1C` |
| BMW E36/E46 (MS42 / ME5.2) | 1998-2000 | K-line DS2 | `0x12 0x05 0x0B 0x03 0x1F` |
| BMW E46/E39 | 1998-2007 | CAN 500k | `canId: 0x316` |
| BMW E9X | 2005-2013 | CAN 500k | `canId: 0x0A5` |
| Aftermarket ECU | - | CAN 500k/250k | Check ECU docs |

### Step 2: Find Parameter Addresses

**For K-line/DS2:**
- Check existing definitions in this folder for your ECU type
- Search online forums for your specific ECU
- Use RomRaider or TunerPro definition files
- Telegram addresses are 10-character hex strings
- INPA/EDIABAS `.prg` dumps (`STATUS_*` jobs): many Bosch DMEs share poll `12 05 0B 03` (XOR cks `1F`). Gauge.S `offset` = PRG response index − 3 (skip DS2 addr/len/status). Formula is `raw * FAKT_A + FAKT_B` (or the job's `fmul`/`fadd`/`fdiv` constants)

**For CAN bus:**
- Check existing CAN definitions for your chassis
- Use CAN sniffer tool to identify frames
- Search online databases (e.g., ms4x.net for BMW)

### Step 3: Determine Conversion Formulas

Most parameters use: `value = raw * mul + add`

Example: Coolant temp with `mul: 0.75, add: -48`
- Raw byte value = 100
- Displayed = 100 * 0.75 + (-48) = 27°C

For 2-byte values:
- Big-endian (default): `0x01 0x2C` = 300
- Little-endian: `0x2C 0x01` = 300

### Step 4: Test and Validate

1. Upload definition to device SD card
2. Restart device
3. Check if parameters show reasonable values
4. Compare with known-good values (e.g., OBD2 scanner)
5. Adjust `mul`/`add` if values are wrong

---

## Tips for LLMs and AI Assistants

When asking an LLM to create a definition file, provide:

1. **Your car model and year** (e.g., "BMW E46 330i 2003")
2. **ECU type** (e.g., "MS43", "ME7.2", " aftermarket ECU")
3. **Protocol** (K-line DS2, KWP, CAN 500k, CAN 250k)
4. **Parameters you want** (RPM, coolant temp, boost, etc.)
5. **Any known addresses** (from forums, tuning software, etc.)

**Example prompt:**

> Create a Gauge.S definition file for my BMW E36 328i (1996) with MS41.1 ECU using K-line DS2 protocol. I want: RPM, coolant temp, TPS, MAF, ignition angle, fuel injector time, and battery voltage. Use telegram addresses from MS41.1.

**The LLM should:**
- Create valid JSON with proper ecuparam array
- Set correct `address` array for DS2 init
- Use telegram addresses when available
- Set reasonable `max`/`min` values
- Add `flashPoint` for RPM
- Include `dec` (decimal places) appropriate for each parameter
- Add comments with alternative addresses when known

---

## Common Issues and Solutions

### Values are way too high/low

Check your `mul` and `add`. Some ECUs use different scaling:
- MS41: `mul: 0.747, add: -48` for coolant
- BMS43 / MS42 / MS43 / ME5.2: `mul: 0.75, add: -48` for coolant

### CAN values look wrong

- Verify `canId` is correct (decimal vs hex)
- Check if `length` should be 1 or 2 bytes
- Try `expr: "signed(x)"` for signed values
- Check `reverseEndianness` for byte order

### Parameter not showing up

- Check that `header` is unique
- Verify `hidden` is not `true`
- For K-line: verify `address` init array is correct
- For CAN: verify `canSpeed` matches your bus

### Expression errors

- Use `"` around parameter names with spaces in `x`/`y`/`z`
- From v2.20+, use `{Parameter Name}` syntax for direct references
- Division by zero: add small value like `(y + 0.1)`

---

## File Organization

On your SD card, definitions go in `/definitions/` folder:

```
/definitions/
  E36_MS41.json
  E46_CAN.json
  sensors/
    bosch_pst_f1.json
  economy.json
```

Use the device's **Loader** feature (in Settings menu) to combine multiple definition files:
1. Select chassis definition
2. Select ECU definition
3. Select sensor definitions
4. Select extras (economy, trip, etc.)

---

## Advanced: Creating Complete Gauge Definitions

For the new-screen project (round AMOLED display), you can also create complete gauge definitions with visual layouts:

```json
{
  "name": "My Custom Gauge",
  "screenW": 466,
  "screenH": 466,
  "round": true,
  "elements": [
    {
      "name": "bg",
      "type": "image",
      "layer": 0,
      "x": 50, "y": 50,
      "path": "assets/bg.dat",
      "drawOnce": true
    },
    {
      "name": "needle",
      "type": "needle",
      "layer": 2,
      "x": 50, "y": 50,
      "defaultParam": "Coolant Temp",
      "minValue": 40,
      "maxValue": 140,
      "startAngle": -135,
      "endAngle": -45,
      "spritePath": "assets/needle.dat",
      "pivotX": -200
    }
  ]
}
```

See the `gauges/` folder for complete examples.

---

## Reference: Quick Field Guide

```
"header"        - Unique name (REQUIRED)
"alias"         - Short display name
"unit"          - Display unit
"dec"           - Decimal places (0-3)
"max"           - Graph maximum (0 = auto)
"min"           - Graph minimum
"hidden"        - true = hide from display
"noLog"         - true = don't log to SD
"resetTime"     - Seconds between min/max resets
"flashPoint"    - Flash screen when >= value
"autoLogPoint"  - Auto-log when >= value
"warningPoint"  - Show warning when >= value
"warningString" - Warning text

K-line:
"address"       - Hex string or byte array
"offset"        - Byte position
"length"        - Bytes to read
"mul"           - Multiply raw value
"add"           - Add to result

CAN:
"canId"         - Frame ID (hex or decimal)
"offset"        - Byte position (0-7)
"length"        - Bytes (1 or 2)
"mul"/"add"     - Scaling

Expression:
"expr"          - Math formula
"x"/"y"/"z"     - Referenced parameters

Special:
"stringLut"     - Text lookup table
"lutTable"      - Calibration lookup table
"eventsPerSecond" - Evaluation rate limit
"avgLen"        - Average window (km)
"replace"       - Replace existing param
```

---

## Getting Help

- **Wiki**: https://github.com/handmade0octopus/gauge.s-sorek.uk/wiki
- **Discord**: https://discord.sorek.uk/
- **Definitions repository**: https://github.com/handmade0octopus/gauge.s-sorek.uk/tree/master/definitions
- **Video guides**: Check README on GitHub

---

## License

All definition files in this repository are licensed under MIT.

Created for Gauge.S by sorek.uk

---

## Bundled Definition Files

The following definition files are included in this repository. Use them as starting points or reference when creating your own definitions.

---

### `m43_BMS43_e36_318i.json` — BMW E36 318i with Bosch BMS43 (M43)

K-line DS2 group `0x0B 0x03` (same telegram as MS42/ME5.2). Offsets from BMS43DS0 `STATUS_*` jobs (payload after 3-byte DS2 header). No MAP on this NA engine.

```json
{
  "canSpeed": 500,
  "address": ["0x12", "0x05", "0x0B", "0x03", "0x1F"],
  "ecuparam": [
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "offset": 0,
      "length": 2,
      "mul": 0.15625,
      "dec": 0,
      "flashPoint": 6200
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "offset": 2,
      "mul": 0.75,
      "add": -48
    },
    {
      "header": "Throttle Position",
      "unit": "%",
      "offset": 7,
      "mul": 0.390625
    },
    {
      "header": "Fuel Inj",
      "unit": "ms",
      "offset": 12,
      "length": 2,
      "mul": 0.004001617
    }
  ]
}
```

---

### `bmw-e36-ms41.json` — BMW E36 with MS41.0 ECU

Base definition for 328i/323i/320i. Uses K-line DS2 protocol with telegram addresses.

```json
{
  "_description": "BMW E36 with MS41.0 ECU - Base definition for 328i/323i/320i",
  "_notes": [
    "For MS41.1, change Engine Load address to 0x010000FC52",
    "For MS41.2, change Engine Load address to 0x010000E8E4",
    "For Fuel Inj MS41.1: 0x010000EF96",
    "For Fuel Inj MS41.2: 0x010000EF7E"
  ],
  "canSpeed": 500,
  "address": ["0x12", "0x05", "0x0B", "0x00", "0x1C"],
  "ecuparam": [
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "address": "0x010000DA2A",
      "max": 7000,
      "min": 0,
      "dec": 0,
      "flashPoint": 7000
    },
    {
      "header": "Engine Load",
      "unit": "mg/str",
      "address": "0x010000FAFC",
      "mul": 0.021,
      "max": 700,
      "min": 100,
      "dec": 1
    },
    {
      "header": "Mass Airflow",
      "unit": "kg/h",
      "address": "0x010000DA34",
      "max": 720,
      "min": 0,
      "dec": 1,
      "mul": 0.25
    },
    {
      "header": "TPS",
      "unit": "%",
      "address": "0x000000E8D7",
      "max": 100,
      "min": 0,
      "dec": 0,
      "mul": 0.3921569
    },
    {
      "header": "Ignition Angle",
      "unit": "°CRK",
      "address": "0x000000E989",
      "max": 40,
      "min": -40,
      "dec": 1,
      "mul": 0.373,
      "add": -23.6
    },
    {
      "header": "Fuel Inj",
      "unit": "ms",
      "address": "0x010000ECBC",
      "max": 20,
      "min": 0,
      "dec": 2,
      "mul": 0.00534
    },
    {
      "header": "Intake Air Temp",
      "unit": "°C",
      "address": "0x000000DA50",
      "max": 80,
      "min": 0,
      "dec": 1,
      "mul": 0.747,
      "add": -48
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "address": "0x000000DA5A",
      "max": 120,
      "min": 60,
      "dec": 1,
      "mul": 0.747,
      "add": -48
    },
    {
      "header": "Speed",
      "unit": "km/h",
      "address": "0x000000DA63",
      "max": 255,
      "min": 0,
      "dec": 0
    },
    {
      "header": "Battery Voltage",
      "alias": "Battery",
      "unit": "V",
      "address": ["0x02", "0x00", "0x00", "0x00", "0x07"],
      "mul": 0.101
    }
  ]
}
```

---

### `bmw-e46-e39-can.json` — BMW E46/E39 CAN Bus

Base definition for 3-series and 5-series (1998-2007). Uses CAN bus at 500 kbps. Works with MS42, MS43, MS45, ME7.2 ECUs. Includes steering wheel button support.

```json
{
  "_description": "BMW E46/E39 CAN Bus - Base definition for 3-series and 5-series (1998-2007)",
  "_notes": [
    "CAN speed: 500 kbps",
    "Works with MS42, MS43, MS45, ME7.2 ECUs",
    "Includes steering wheel button support"
  ],
  "canSpeed": 500,
  "ecuparam": [
    {
      "_comment": "Steering wheel buttons - required for virtual button input",
      "header": "Can button",
      "canId": "0x329",
      "offset": 3,
      "expr": "(x >> 5)",
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Cruise active",
      "canId": "0x545",
      "expr": "(x & 8)",
      "offset": 0,
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Button press",
      "unit": "b",
      "expr": "buttonPress(0, (x == 2) && !y, (x == 1) && !y, (x == 3) && !y)",
      "x": "Can button",
      "y": "Cruise active",
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Speed CAN Raw",
      "canId": "0x153",
      "offset": 1,
      "length": 2,
      "expr": "x >> 4"
    },
    {
      "header": "Engine Speed",
      "unit": "RPM",
      "canId": "0x316",
      "offset": 2,
      "length": 2,
      "mul": 0.15625,
      "dec": 0
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "canId": "0x329",
      "offset": 1,
      "mul": 0.75,
      "add": -48
    },
    {
      "header": "TPS",
      "unit": "%",
      "canId": "0x329",
      "offset": 5,
      "mul": 0.390625
    },
    {
      "header": "Oil Temp",
      "unit": "°C",
      "canId": "0x545",
      "offset": 4,
      "add": -48
    },
    {
      "header": "Clutch",
      "canId": "0x329",
      "offset": 3,
      "expr": "!(x & 1)",
      "dec": 0
    },
    {
      "header": "Steering Angle",
      "unit": "deg",
      "canId": "0x1F5",
      "offset": 0,
      "length": 2,
      "expr": "(x > 32768)*((x-32768)*.044) + (x<32768)*(-.044*x)"
    },
    {
      "header": "Gear",
      "unit": "Byte",
      "canId": "0x1D2",
      "offset": 2,
      "length": 1,
      "dec": 0,
      "expr": "signed(x)",
      "stringLut": [
        { "x": 0.0, "y": "N" },
        { "x": 0.1, "y": "" }
      ]
    },
    {
      "_comment": "Interior lighting for auto-dimming",
      "header": "Interior Night Lighting",
      "unit": "bool",
      "canId": "0x615",
      "offset": 1,
      "length": 1,
      "expr": "(x & 4) >> 2",
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Brightness",
      "expr": "setBrightness(lutTable('Brightness', x))",
      "x": "Interior Night Lighting",
      "lutTable": [
        { "x": 0, "y": 100 },
        { "x": 1, "y": 50 }
      ],
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Fuel Level",
      "unit": "L",
      "canId": "0x613",
      "offset": 2,
      "length": 1,
      "expr": "(x & 127)",
      "dec": 0
    }
  ]
}
```

---

### `aftermarket-ecu-template.json` — Aftermarket ECU Template

Template for Megasquirt, ECUMASTER, and other aftermarket ECUs. Uses CAN bus. Modify `canId` values to match your ECU's CAN output.

```json
{
  "_description": "Template for Aftermarket ECU (Megasquirt, ECUMASTER, etc.)",
  "_notes": [
    "Modify canId values to match your ECU's CAN output",
    "Common aftermarket ECU CAN speeds: 500 kbps or 250 kbps",
    "Check your ECU documentation for specific CAN frame IDs and byte layouts"
  ],
  "canSpeed": 500,
  "ecuparam": [
    {
      "_comment": "Example: Megasquirt CAN frame 0x5F0",
      "header": "Engine RPM",
      "unit": "RPM",
      "canId": 1520,
      "offset": 6,
      "length": 2,
      "dec": 0,
      "max": 8000,
      "flashPoint": 7000
    },
    {
      "header": "Coolant Temp",
      "unit": "°C",
      "canId": 1520,
      "offset": 2,
      "length": 2,
      "expr": "signed(x, 2)",
      "dec": 0,
      "max": 120,
      "flashPoint": 105
    },
    {
      "header": "TPS",
      "unit": "%",
      "canId": 1521,
      "offset": 0,
      "length": 2,
      "dec": 1,
      "max": 100
    },
    {
      "header": "MAP",
      "unit": "kPa",
      "canId": 1521,
      "offset": 2,
      "length": 2,
      "dec": 0,
      "max": 300
    },
    {
      "header": "Battery",
      "unit": "V",
      "canId": 1522,
      "offset": 0,
      "length": 2,
      "mul": 0.01,
      "dec": 1
    },
    {
      "header": "AFR 1",
      "unit": "AFR",
      "canId": 1523,
      "offset": 0,
      "length": 2,
      "mul": 0.1,
      "dec": 1
    },
    {
      "header": "Ignition",
      "unit": "°",
      "canId": 1524,
      "offset": 0,
      "length": 2,
      "expr": "signed(x, 2) * 0.1",
      "dec": 1
    },
    {
      "header": "Fuel Pressure",
      "unit": "kPa",
      "canId": 1525,
      "offset": 0,
      "length": 2,
      "dec": 0
    },
    {
      "header": "Oil Pressure",
      "unit": "kPa",
      "canId": 1525,
      "offset": 2,
      "length": 2,
      "dec": 0
    },
    {
      "header": "Gear",
      "unit": "Byte",
      "canId": 1526,
      "offset": 0,
      "length": 1,
      "dec": 0,
      "stringLut": [
        { "x": -1, "y": "R" },
        { "x": 0, "y": "N" },
        { "x": 1, "y": "1" },
        { "x": 2, "y": "2" },
        { "x": 3, "y": "3" },
        { "x": 4, "y": "4" },
        { "x": 5, "y": "5" },
        { "x": 6, "y": "6" }
      ]
    }
  ]
}
```

---

### `obd2-can-generic.json` — OBD2 over CAN (Generic)

Works with any OBD2-compliant vehicle. Uses functional addressing (`0x7DF`) or physical (`0x7E0`). CAN speed 500 kbps (most cars) or 250 kbps (some trucks).

```json
{
  "_description": "OBD2 over CAN - Generic diagnostic parameters",
  "_notes": [
    "Works with any OBD2-compliant vehicle",
    "CAN speed: 500 kbps (most cars) or 250 kbps (some trucks)",
    "Request ID: 0x7DF (broadcast) or 0x7E0 (specific ECU)",
    "Response ID: 0x7E8 (ECU response)"
  ],
  "canSpeed": 500,
  "ecuparam": [
    {
      "header": "OBD2 RPM",
      "unit": "RPM",
      "canId": "0x7E8",
      "offset": 3,
      "length": 2,
      "expr": "x / 4",
      "dec": 0
    },
    {
      "header": "OBD2 Speed",
      "unit": "km/h",
      "canId": "0x7E8",
      "offset": 3,
      "length": 1,
      "dec": 0
    },
    {
      "header": "OBD2 Coolant",
      "unit": "°C",
      "canId": "0x7E8",
      "offset": 3,
      "length": 1,
      "expr": "x - 40",
      "dec": 0
    },
    {
      "header": "OBD2 TPS",
      "unit": "%",
      "canId": "0x7E8",
      "offset": 3,
      "length": 1,
      "expr": "x * 100 / 255",
      "dec": 1
    },
    {
      "header": "OBD2 MAP",
      "unit": "kPa",
      "canId": "0x7E8",
      "offset": 3,
      "length": 1,
      "dec": 0
    },
    {
      "header": "OBD2 MAF",
      "unit": "g/s",
      "canId": "0x7E8",
      "offset": 3,
      "length": 2,
      "expr": "x / 100",
      "dec": 2
    },
    {
      "header": "OBD2 Voltage",
      "unit": "V",
      "canId": "0x7E8",
      "offset": 3,
      "length": 1,
      "expr": "x / 10",
      "dec": 1
    }
  ]
}
```

---

### `sensor-bosch-pst-f1.json` — Bosch PST-F1 Oil Sensor

Oil temperature and pressure sensor using analog inputs. Connect pressure to Analog 1 and temperature to Analog 4. Uses 3.3V pullup with 4.7kΩ resistor.

```json
{
  "_description": "Bosch PST-F1 Oil Temperature and Pressure Sensor",
  "_notes": [
    "Connect to Analog 1 (pressure) and Analog 4 (temperature)",
    "Uses 3.3V pullup with 4.7k OHM resistor",
    "For A6-A7 pins (v5.0+), use different voltage divider"
  ],
  "ecuparam": [
    {
      "_comment": "Filter analog input for stable temperature readings",
      "header": "Filter Oil Temp",
      "expr": "filter('Analog 4', 64)",
      "hidden": true,
      "noLog": true
    },
    {
      "header": "Oil Temp",
      "unit": "°C",
      "expr": "-6.2402*x^5 + 54.332*x^4 - 184.54*x^3 + 307.91*x^2 - 291.92*x + 190.48",
      "dec": 0,
      "x": "Filter Oil Temp",
      "replace": true,
      "flashPoint": 115
    },
    {
      "header": "Oil Pressure",
      "unit": "Bar",
      "expr": "2.5*(filter('Analog 1', 10)-0.5)",
      "dec": 1,
      "replace": true
    }
  ]
}
```

---

### `extra-economy.json` — Economy and Fuel Consumption

Requires `Engine Speed` and `Fuel Inj` parameters from a base ECU definition. Change `250` to your injector flow rate in cc/min.

```json
{
  "_description": "Economy and Fuel Consumption Calculations",
  "_notes": [
    "Requires: Engine Speed and Fuel Inj parameters from base ECU definition",
    "Change 250 to your injector flow rate in cc/min:",
    "  - 250cc/min: 328i injectors",
    "  - 180cc/min: 320i/323i/325i green injectors",
    "  - 280cc/min: 330i injectors",
    "For MPG instead of l/100km, uncomment MPG line in Economy"
  ],
  "ecuparam": [
    {
      "header": "Fuel usage",
      "unit": "l/h",
      "expr": "(x/60)*(y/1000)*(250/16.6667)*3",
      "x": "Engine Speed",
      "y": "Fuel Inj"
    },
    {
      "header": "Economy",
      "unit": "l/100km",
      "expr": "clip(100*x/(y+0.1))",
      "x": "Fuel usage",
      "y": "Speed"
    },
    {
      "_comment": "Average economy over distance",
      "header": "Econ avg 1",
      "unit": "l/100km",
      "expr": "avg('Econ avg 1', x, y)",
      "x": "Economy",
      "y": "Speed",
      "avgLen": 20.0
    },
    {
      "header": "Econ avg 2",
      "unit": "l/100km",
      "expr": "avg('Econ avg 2', x, y)",
      "x": "Economy",
      "y": "Speed",
      "avgLen": 20.0
    }
  ]
}
```

---

### `extra-trip.json` — Trip Odometer and 0-100 Timer

Requires `Speed` parameter from a base ECU definition. Trip meters reset with min/max reset (triple press button). 0-100 timer only updates on faster times.

```json
{
  "_description": "Trip Odometer and 0-100 km/h Timer",
  "_notes": [
    "Requires: Speed parameter from base ECU definition",
    "Trip meters reset with min/max reset (triple press button)",
    "0-100 timer only updates on faster times"
  ],
  "ecuparam": [
    {
      "_comment": "Dummy parameter - required for trip calculation",
      "header": "Speed",
      "expr": "0"
    },
    {
      "header": "Trip 1",
      "unit": "km",
      "expr": "trip('Trip 1', x)",
      "x": "Speed"
    },
    {
      "header": "Trip 2",
      "unit": "km",
      "expr": "trip('Trip 2', x)",
      "x": "Speed"
    }
  ],
  "funData": [
    {
      "_comment": "0-100 km/h timer - stores best time",
      "name": "0_100kph",
      "values": [100, 999, 0],
      "expr": [
        "{Speed} < 1 ? x2 = {Seconds} : 0",
        "x = ({Seconds} - x2)",
        "({Speed} > x0 && x < x1) ? x1 = x : 0"
      ]
    }
  ]
}
```
