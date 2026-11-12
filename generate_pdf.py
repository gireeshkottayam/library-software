from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(128)
            self.cell(0, 10, 'Public Library Kooroppada - User Manual', border=0, ln=0, align='R')
            self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', align='C')

def generate_pdf(md_file, pdf_file):
    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found")
        return

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title Page
    pdf.add_page()
    pdf.ln(60)
    pdf.set_font('helvetica', 'B', 28)
    pdf.set_text_color(10, 15, 30) # Dark Navy
    pdf.cell(190, 20, 'Public Library', ln=True, align='C')
    pdf.cell(190, 20, 'Kooroppada', ln=True, align='C')
    pdf.ln(10)
    pdf.set_font('helvetica', 'B', 16)
    pdf.set_text_color(100)
    pdf.cell(190, 10, 'Library Management System v1.0', ln=True, align='C')
    pdf.ln(20)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(190, 10, 'Complete End-to-End User Documentation', ln=True, align='C')
    pdf.set_y(-40)
    pdf.set_font('helvetica', 'I', 10)
    pdf.cell(190, 10, 'Official Operational Guide', align='C')

    # Content
    pdf.add_page()
    pdf.set_text_color(0)
    
    lines = content.split('\n')
    for line in lines:
        pdf.set_x(10) # Ensure we are at the left margin
        if line.startswith('# '):
            pdf.ln(10)
            pdf.set_font('helvetica', 'B', 20)
            pdf.set_text_color(30, 58, 138) # Accent Blue
            pdf.cell(190, 15, line[2:], ln=True)
            pdf.ln(5)
        elif line.startswith('## '):
            pdf.ln(5)
            pdf.set_font('helvetica', 'B', 15)
            pdf.set_text_color(0)
            pdf.cell(190, 12, line[3:], ln=True)
        elif line.startswith('### '):
            pdf.set_font('helvetica', 'B', 12)
            pdf.cell(190, 10, line[4:], ln=True)
        elif line.startswith('* ') or line.startswith('- '):
            pdf.set_font('helvetica', '', 11)
            pdf.set_x(15)
            pdf.multi_cell(180, 7, f'- {line[2:].replace("**", "")}')
        elif line.startswith('---'):
            pdf.ln(5)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(5)
        elif line.strip() == '':
            pdf.ln(2)
        else:
            pdf.set_font('helvetica', '', 11)
            text = line.replace('**', '').encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(190, 7, text)

    pdf.output(pdf_file)
    print(f"Successfully generated {pdf_file}")

if __name__ == "__main__":
    generate_pdf('DOCUMENTATION.md', 'D:/Kooroppada Library/KPL_User_Manual.pdf')
