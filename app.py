from flask import Flask, request, send_file, render_template
import io
import os
import struct
import binascii
import hashlib
import tempfile
import wave
import subprocess
from PIL import Image
from stegano import lsb
from PyPDF2 import PdfReader, PdfWriter

app = Flask(__name__)


def encode_text_in_image(file_stream, text):
    image = Image.open(file_stream)
    secret = lsb.hide(image, text)
    img_io = io.BytesIO()
    secret.save(img_io, 'PNG')
    img_io.seek(0)
    return img_io, 'image/png', 'encoded_image.png'


def decode_text_from_image(file_stream):
    image = Image.open(file_stream)
    return lsb.reveal(image)


def encode_text_in_audio(file_stream, text):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_input:
        temp_input.write(file_stream.read())
        temp_input_path = temp_input.name
    with wave.open(temp_input_path, 'rb') as wav:
        params = wav.getparams()
        frames = wav.readframes(wav.getnframes())
    text_binary = ''.join(format(ord(char), '08b') for char in text)
    if len(text_binary) > len(frames) // 8:
        raise ValueError("Audio file too small to hide the message")
    text_length = len(text_binary)
    length_binary = format(text_length, '032b')
    frames_array = bytearray(frames)
    byte_index = 0
    for i in range(32):
        frames_array[byte_index] = (
            frames_array[byte_index] & 0xFE) | int(length_binary[i])
        byte_index += 1
    for i in range(text_length):
        frames_array[byte_index] = (
            frames_array[byte_index] & 0xFE) | int(text_binary[i])
        byte_index += 1
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_output:
        output_path = temp_output.name
    with wave.open(output_path, 'wb') as wav_output:
        wav_output.setparams(params)
        wav_output.writeframes(frames_array)
    with open(output_path, 'rb') as output_file:
        output_data = io.BytesIO(output_file.read())
    os.unlink(temp_input_path)
    os.unlink(output_path)
    output_data.seek(0)
    return output_data, 'audio/wav', 'encoded_audio.wav'


def decode_text_from_audio(file_stream):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        temp_file.write(file_stream.read())
        temp_path = temp_file.name
    with wave.open(temp_path, 'rb') as wav:
        frames = wav.readframes(wav.getnframes())
    length_binary = "".join(str(frames[i] & 1) for i in range(32))
    text_length = int(length_binary, 2)
    text_binary = "".join(str(frames[i] & 1)
                          for i in range(32, 32 + text_length))
    text = "".join(chr(int(text_binary[i:i+8], 2))
                   for i in range(0, len(text_binary), 8))
    os.unlink(temp_path)
    return text


def encode_text_in_pdf(file_stream, text):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_input:
        temp_input.write(file_stream.read())
        temp_input_path = temp_input.name
    pdf_reader = PdfReader(temp_input_path)
    pdf_writer = PdfWriter()
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)
    pdf_writer.add_metadata({
        "/StegoData": binascii.hexlify(text.encode()).decode(),
        "/StegoHash": hashlib.sha256(text.encode()).hexdigest()
    })
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_output:
        output_path = temp_output.name
    with open(output_path, 'wb') as output_file:
        pdf_writer.write(output_file)
    with open(output_path, 'rb') as output_file:
        output_data = io.BytesIO(output_file.read())
    os.unlink(temp_input_path)
    os.unlink(output_path)
    output_data.seek(0)
    return output_data, 'application/pdf', 'encoded_document.pdf'


def decode_text_from_pdf(file_stream):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
        temp_file.write(file_stream.read())
        temp_path = temp_file.name
    pdf_reader = PdfReader(temp_path)
    metadata = pdf_reader.metadata
    if "/StegoData" not in metadata:
        os.unlink(temp_path)
        return "No hidden message found in this PDF."
    hidden_data = metadata.get("/StegoData")
    stego_hash = metadata.get("/StegoHash")
    try:
        decoded_text = binascii.unhexlify(hidden_data.encode()).decode()
        if stego_hash and hashlib.sha256(decoded_text.encode()).hexdigest() != stego_hash:
            os.unlink(temp_path)
            return "Warning: Message integrity check failed."
        os.unlink(temp_path)
        return decoded_text
    except Exception as e:
        os.unlink(temp_path)
        return f"Error decoding message: {str(e)}"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/encode', methods=['POST'])
def encode():
    try:
        file = request.files['file']
        text = request.form['text']
        file_extension = os.path.splitext(file.filename)[1].lower()
        file_type = "unknown"
        if file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
            file_type = "image"
        elif file_extension in ['.wav']:
            file_type = "audio"
        elif file_extension == '.pdf':
            file_type = "pdf"
        if not file or not text:
            return "Missing file or text", 400
        if file_type == "image":
            output_data, mimetype, filename = encode_text_in_image(
                file.stream, text)
        elif file_type == "audio":
            output_data, mimetype, filename = encode_text_in_audio(
                file.stream, text)
        elif file_type == "pdf":
            output_data, mimetype, filename = encode_text_in_pdf(
                file.stream, text)
        else:
            return "Unsupported file type", 400
        return send_file(output_data, as_attachment=True, mimetype=mimetype, download_name=filename)
    except Exception as e:
        return f"An error occurred: {str(e)}", 500


@app.route('/decode', methods=['POST'])
def decode():
    try:
        file = request.files['file']
        file_extension = os.path.splitext(file.filename)[1].lower()
        if not file:
            return "No file provided", 400
        if file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
            result = decode_text_from_image(file.stream)
        elif file_extension == '.wav':
            result = decode_text_from_audio(file.stream)
        elif file_extension == '.pdf':
            result = decode_text_from_pdf(file.stream)
        else:
            return "Unsupported file type", 400
        return result if result else "No hidden message found"
    except Exception as e:
        return f"An error occurred: {str(e)}", 500


if __name__ == '__main__':
    app.run(debug=True)
