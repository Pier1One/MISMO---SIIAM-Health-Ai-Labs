import pdfplumber
import json
import os
import re

pdf_path = "/Users/enricoarmiento/Desktop/AUT/RISORSE/elenco_professionisti_accreditati.pdf"
output_json_path = "/Users/enricoarmiento/Desktop/AUT/RISORSE/professionisti.json"

email_regex = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+')
phone_regex = re.compile(r'[\d/\+\s-]{6,}')

def clean_text(val):
    if val is None:
        return ""
    return str(val).strip().replace('\n', ' ')

def extract_professionals():
    professionals_list = []
    current_area = "SANITARIA" # Default area

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean the row items
                    cleaned_row = [clean_text(cell) for cell in row]
                    
                    # Skip empty rows
                    if not any(cleaned_row):
                        continue
                    
                    # Detect Area switch (Sanitaria vs Socio-Educativa)
                    row_str = " ".join(cleaned_row).upper()
                    if "AREA SANITARIA" in row_str:
                        current_area = "SANITARIA"
                        continue
                    if "AREA SOCIO-EDUCATIVA" in row_str or "AREA SOCIO EDUCATIVA" in row_str:
                        current_area = "SOCIO-EDUCATIVA"
                        continue
                    
                    # Skip header rows
                    if "COGNOME" in cleaned_row or "TITOLO DI STUDIO" in cleaned_row or "AGGIORNAMENTO" in row_str or "ELENCO REGIONALE" in row_str:
                        continue
                    
                    # Check if the row looks like a data row (has a number in the first column)
                    num_val = cleaned_row[0]
                    if not num_val.isdigit():
                        continue
                    
                    # Ensure we have enough columns (standard is 14 columns)
                    if len(cleaned_row) < 13:
                        continue
                    
                    cognome = cleaned_row[1]
                    nome = cleaned_row[2]
                    
                    # If surname or name is missing, skip
                    if not cognome or not nome:
                        continue
                    
                    # Extract roles based on columns 3, 4, 5 (Supervisor, Tutor, Tecnico)
                    roles = []
                    if cleaned_row[3].upper() == "X":
                        roles.append("Supervisor")
                    if cleaned_row[4].upper() == "X":
                        roles.append("Tutor")
                    if cleaned_row[5].upper() == "X":
                        roles.append("Tecnico")
                        
                    role_str = ", ".join(roles) if roles else "Tecnico" # Default role if unchecked
                    
                    trattamenti = cleaned_row[6]
                    altri_interventi = cleaned_row[7]
                    titolo_studio = cleaned_row[8]
                    specializzazione = cleaned_row[9]
                    indirizzo = cleaned_row[10]
                    
                    # Parse contacts from columns 11 & 12
                    contacts_col1 = cleaned_row[11]
                    contacts_col2 = cleaned_row[12] if len(cleaned_row) > 12 else ""
                    
                    phone = ""
                    email = ""
                    
                    # Match emails and phone numbers from both contact columns
                    for text in [contacts_col1, contacts_col2]:
                        if not text:
                            continue
                        emails_found = email_regex.findall(text)
                        if emails_found:
                            email = emails_found[0]
                        
                        # Strip emails out before looking for phones
                        text_no_email = text
                        for em in emails_found:
                            text_no_email = text_no_email.replace(em, "")
                        
                        phones_found = phone_regex.findall(text_no_email)
                        if phones_found:
                            phone = phones_found[0].strip()
                    
                    # Area territoriale is the last column
                    area_territoriale = cleaned_row[-1]
                    
                    # Add to list
                    professionals_list.append({
                        "num": int(num_val),
                        "cognome": cognome,
                        "nome": nome,
                        "nominativo": f"{nome} {cognome}",
                        "ruolo": role_str,
                        "trattamenti": trattamenti,
                        "altri_interventi": altri_interventi,
                        "titolo_studio": titolo_studio,
                        "specializzazione": specializzazione,
                        "indirizzo": indirizzo,
                        "telefono": phone,
                        "email": email,
                        "area_territoriale": area_territoriale,
                        "area_professionale": current_area
                    })
                    
    # Save list to JSON
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(professionals_list, f, ensure_ascii=False, indent=2)
        
    print(f"Extraction successful! Saved {len(professionals_list)} professionals to {output_json_path}")

if __name__ == "__main__":
    extract_professionals()
