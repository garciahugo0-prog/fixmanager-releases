import pypdf

src_pdf = "/Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.87.0/levantamiento-tecnologico-taecel.pdf"
dst_pdf = "/Users/hugogarciasanchez/Desktop/Fixmanager-electron_v1.87.0/levantamiento-tecnologico-taecel-completo.pdf"

try:
    reader = pypdf.PdfReader(src_pdf)
    writer = pypdf.PdfWriter()
    
    writer.append(reader)
    
    fields_to_fill = {
        "Text1": "18 de Agosto de 2026",
        "Text2": "Hugo García Sánchez (FixManager)",
        "Text3": "Doctor Miguel Silva Nte 219",
        "Text4": "GASH95020147A",
        "Text5": "523511574876",
        "Text6": "hugogarciasanchez@hotmail.com",
        "Text7": "ID042903",
        "Text8": "Hugo García Sánchez",
        "Text9": "hugogarciasanchez@hotmail.com",
        "Text10": "523511574876",
        "Text11": "FixManager",
        "Text12": "https://github.com/garciahugo0-prog/fixmanager-releases",
        "Text13": "10+",
        "Text14": "TypeScript / JavaScript (React + Electron)",
        "Text15": "SQLite (local) y Supabase (nube)",
        
        # Checkboxes:
        "Button19": "/No", # Punto de venta
        "Button18": "/No"  # Distribuidor
    }
    
    writer.update_page_form_field_values(writer.pages[2], fields_to_fill)
    
    with open(dst_pdf, "wb") as f:
        writer.write(f)
    print("Filled PDF written to project directory successfully.")
except Exception as e:
    import traceback
    print("Error:", e)
    traceback.print_exc()
