import pdfplumber
import os

resources_dir = "/Users/enricoarmiento/Desktop/AUT/RISORSE"
pdfs_to_convert = [
    "Bandi Comunali_erogazione fondi autismo.pdf",
    "Piano Regionale per l'Autismo (2025).pdf",
    "Regolamento regionale per i Contributi Economici alle Famiglie.pdf",
    "Vademecum_Inclusione_Scolastica_ReteInclusioneEVV_05112024.pdf"
]

def convert_pdf_to_md(pdf_filename):
    pdf_path = os.path.join(resources_dir, pdf_filename)
    md_filename = pdf_filename.replace(".pdf", ".md")
    md_path = os.path.join(resources_dir, md_filename)
    
    print(f"Converting {pdf_filename} to {md_filename}...")
    
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_filename} does not exist.")
        return
        
    try:
        with pdfplumber.open(pdf_path) as pdf:
            md_content = []
            md_content.append(f"# {pdf_filename.replace('.pdf', '')}\n")
            
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text()
                md_content.append(f"## Pagina {i}\n")
                if text:
                    md_content.append(text + "\n")
                else:
                    md_content.append("*(Pagina senza testo estraibile o immagine)*\n")
                md_content.append("\n---\n")
                
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_content))
            
        print(f"Successfully saved to {md_path} ({os.path.getsize(md_path)} bytes)")
    except Exception as e:
        print(f"Failed to convert {pdf_filename}: {e}")

if __name__ == "__main__":
    for pdf in pdfs_to_convert:
        convert_pdf_to_md(pdf)
