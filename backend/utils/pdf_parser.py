import fitz  # PyMuPDF

def extract_pdf_chunks(pdf_bytes: bytes, filename: str):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    chunks = []

    for page_num, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            chunks.append({
                "lesson_id": filename,
                "page": page_num + 1,
                "text": text
            })
    return chunks
