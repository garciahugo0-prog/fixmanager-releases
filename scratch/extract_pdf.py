import os
from pypdf import PdfReader

def extract_pdf_to_md(pdf_path, md_path):
    print(f"Extracting {pdf_path} to {md_path}...")
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} not found.")
        return
    
    reader = PdfReader(pdf_path)
    text = ""
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        text += f"\n\n# PAGE {i+1}\n\n" + page_text
        
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted {len(reader.pages)} pages.")

if __name__ == "__main__":
    extract_pdf_to_md("integrador-api-taecel.pdf", "scratch/integrador-api-taecel.md")
    extract_pdf_to_md("levantamiento-tecnologico-taecel.pdf", "scratch/levantamiento-tecnologico-taecel.md")
