# Simple script that lets you recalculate the length and CRC of a byte array

import re
import tkinter as tk

def parse_input(input_str):
    """Parse the input string to extract hexadecimal bytes as integers."""
    # Find all "0xXX" patterns within quotes
    hex_values = re.findall(r'"0x([0-9A-Fa-f]{2})"', input_str)
    # Convert hex strings to integers
    byte_list = [int(h, 16) for h in hex_values]
    return byte_list

def update_bytes(byte_list):
    """Update the length (4th byte) and CRC (last byte) in the byte list."""
    # Check if there are enough bytes (at least 5: 3 header, 1 length, 1+ payload, 1 CRC)
    if len(byte_list) < 5:
        raise ValueError("Input must contain at least 5 bytes.")
    
    # Length is the number of payload bytes: total bytes minus 5 (3 header, 1 length, 1 CRC)
    N = len(byte_list) - 5
    byte_list[3] = N  # Update the 4th byte (index 3)
    
    # Calculate simple CRC as XOR of all bytes except the last
    CRC = 0
    for b in byte_list[:-1]:
        CRC ^= b
    byte_list[-1] = CRC  # Update the last byte
    
    return byte_list

def format_output(byte_list):
    """Format the byte list back into the original string format with newlines."""
    lines = []
    # Process the byte list in chunks of 6
    for i in range(0, len(byte_list), 6):
        line_bytes = byte_list[i:i+6]
        # Format each byte as "0xXX" with quotes
        line_str = ', '.join(['"0x{:02X}"'.format(b) for b in line_bytes])
        # Add a trailing comma if the line has exactly 6 bytes
        if len(line_bytes) == 6:
            line_str += ','
        lines.append(line_str)
    # Join lines with newlines
    return '\n'.join(lines)

def on_recalculate():
    """Handle the button click: process input and display output."""
    # Get input text, removing the trailing newline added by Tkinter
    input_str = input_text.get("1.0", "end-1c")
    try:
        # Parse, update, and format the data
        byte_list = parse_input(input_str)
        updated_byte_list = update_bytes(byte_list)
        output_str = format_output(updated_byte_list)
        # Clear and update the output text widget
        output_text.delete("1.0", "end")
        output_text.insert("end", output_str)
    except Exception as e:
        # Display error message if something goes wrong
        output_text.delete("1.0", "end")
        output_text.insert("end", f"Error: {str(e)}")

# Set up the GUI
root = tk.Tk()
root.title("Recalculate Length and CRC")

# Input text widget
input_text = tk.Text(root, height=30, width=100)
input_text.pack(pady=5)

# Recalculate button
button = tk.Button(root, text="Recalculate", command=on_recalculate)
button.pack(pady=5)

# Output text widget
output_text = tk.Text(root, height=30, width=100)
output_text.pack(pady=5)

# Start the GUI event loop
root.mainloop()