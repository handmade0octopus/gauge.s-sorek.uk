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
        'Â': '',
        '²': '',
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
        #print(f"Processing message: {message.name} (ID: {message.frame_id})")
        for signal in message.signals:
            #print(type(signal))
            #print(f"  Signal: {signal.name} (Start: {signal.start}, Length: {signal.length}, Unit: {signal.unit})")
            
            # Store original bit offset within byte before alignment
            bit_offset_in_byte = signal.start % 8
            byte_offset = signal.start // 8
            
            # Calculate how many bytes we need to read
            # The signal spans from bit_offset_in_byte to bit_offset_in_byte + signal.length - 1
            end_bit = bit_offset_in_byte + signal.length - 1
            byte_length = (end_bit // 8) + 1
            
            entry = {
                "header": sanitize_string(signal.name),
                "unit": sanitize_string(signal.unit) if signal.unit else "",
                "canId": f"0x{message.frame_id:X}",
                "offset": byte_offset,
                "length": byte_length,
            }

            # Check if we need an expression (non-byte-aligned start or length, or has scaling/offset)
            needs_expr = (bit_offset_in_byte != 0) or (signal.length % 8 != 0)
            
            if needs_expr:
                # Create bit mask at the correct position within the bytes
                base_mask = (1 << signal.length) - 1
                shifted_mask = base_mask << bit_offset_in_byte
                mask_hex = f"0x{shifted_mask:0{byte_length * 2}X}"
                
                # Build expression with mask, shift, scale, and offset
                scale_str = str(signal.scale)
                offset_str = str(signal.offset)
                
                if bit_offset_in_byte > 0:
                    # Need to mask and shift right
                    entry["expr"] = f"({scale_str})*((x & {mask_hex}) >> {bit_offset_in_byte}) + ({offset_str})"
                else:
                    # Just mask, no shift needed
                    entry["expr"] = f"({scale_str})*(x & {mask_hex}) + ({offset_str})"
                
                # Calculate decimal places
                if signal.scale < 1 and signal.scale > 0:
                    entry["dec"] = -int(math.log10(signal.scale))
                else:
                    entry["dec"] = 0
            else:
                # Handle scaling and decimal places for fully byte-aligned signals
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
            if byte_length > 1 and signal.byte_order == "big_endian":
                entry["reverseEndianess"] = True

            # Handle signed signals
            if signal.is_signed:
                entry["expr"] = f"signed(x,{byte_length})"

            # Handle value tables (string lookup)
            if signal.choices:
                entry["stringLut"] = {str(k): sanitize_string(str(v)) for k, v in signal.choices.items()}

            json_data["ecuparam"].append(entry)

    print(json.dumps(json_data, indent=2))

if __name__ == "__main__":
    main()