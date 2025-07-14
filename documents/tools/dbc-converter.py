import cantools
import json
import math
import sys

def sanitize_string(s):
    """Convert Unicode characters to ASCII equivalents or remove them."""
    # Replace common Unicode characters with ASCII equivalents
    replacements = {
        '°C': '°C',
        '°F': '°F',
        '°': '°',
        'Ω': 'ohm',
        'µ': 'u',
        # Add more replacements as needed
    }
    
    for unicode_char, ascii_replacement in replacements.items():
        s = s.replace(unicode_char, ascii_replacement)
    
    # Remove any remaining non-ASCII characters
    return ''.join(c for c in s if ord(c) < 128)

def main():
    if len(sys.argv) != 2:
        print("Usage: python script.py <path_to_dbc_file>")
        sys.exit(1)

    dbc_file = sys.argv[1]
    try:
        db = cantools.database.load_file(dbc_file)
    except Exception as e:
        print(f"Error loading .dbc file: {e}")
        sys.exit(1)

    json_data = {
        "canSpeed": 500,  # Assuming 500 kbps, adjust if needed
        "ecuparam": []
    }
   
    for message in db.messages:
        print(f"Processing message: {message.name} (ID: {message.frame_id})")
        for signal in message.signals:
            print(type(signal))
            print(f"  Signal: {signal.name} (Start: {signal.start}, Length: {signal.length}, Unit: {signal.unit})")
            # Check if signal is byte-aligned (start bit multiple of 8, length multiple of 8)
            if signal.start % 8 != 0:
                signal.start = (signal.start//8)*8
            if signal.start % 8 == 0 and signal.length % 8 == 0:
                entry = {
                    "header": sanitize_string(signal.name),
                    "unit": sanitize_string(signal.unit) if signal.unit else "",
                    "canId": f"0x{message.frame_id:X}",
                    "offset": signal.start // 8,
                    "length": signal.length // 8,
                }

                # Handle scaling and decimal places
                if signal.scale != 1:
                    entry["mul"] = signal.scale
                if signal.offset != 0:
                    entry["add"] = signal.offset
                if signal.scale < 1 and signal.scale > 0:
                    dec = -int(math.log10(signal.scale))
                    entry["dec"] = dec
                else:
                    entry["dec"] = 0
                    
                # Handle endianness
                if signal.length // 8 > 1 and signal.byte_order == "big_endian":
                    entry["reverseEndianess"] = True

                # Handle signed signals
                if signal.is_signed:
                    entry["expr"] = f"signed(x,{signal.length // 8})"

                # Handle value tables (string lookup)
                if signal.choices:
                    entry["stringLut"] = {str(k): sanitize_string(str(v)) for k, v in signal.choices.items()}

                json_data["ecuparam"].append(entry)

    print(json.dumps(json_data, indent=2))

if __name__ == "__main__":
    main()