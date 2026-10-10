import sys
import os
import zipfile
import xml.etree.ElementTree as ET
import re
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def parse_date(date_str):
    if not date_str:
        return None
    m = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', date_str)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None

def extract_docx_groups(docx_path):
    if not os.path.exists(docx_path):
        raise FileNotFoundError(f"File not found: {docx_path}")

    with zipfile.ZipFile(docx_path, 'r') as z:
        xml_content = z.read('word/document.xml')

    root = ET.fromstring(xml_content)
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    body = root.find('w:body', namespaces)

    paragraphs = []
    for child in body:
        tag = child.tag.split('}')[-1]
        if tag == 'p':
            text = ''.join(child.itertext()).strip().replace('\xa0', ' ')
            if text:
                paragraphs.append(text)

    order_indices = [i for i, p in enumerate(paragraphs) if re.match(r'^Приказ о зачислении', p, re.I)]

    parsed_groups = []

    for i, ord_idx in enumerate(order_indices):
        header_raw = paragraphs[ord_idx - 1]
        order_raw = paragraphs[ord_idx]
        spec_raw = paragraphs[ord_idx + 1]
        qual_raw = paragraphs[ord_idx + 2]
        curator_raw = paragraphs[ord_idx + 3]

        # Parse Group Number
        group_num_m = re.match(r'^([0-9]+[\*\s]*[А-Яа-яA-Za-z]+[\*\s]*)', header_raw)
        raw_group_num = group_num_m.group(1).strip() if group_num_m else header_raw.split('(')[0].strip()
        clean_group_number = raw_group_num.replace('*', '').replace(' ', '')

        group_enroll_date = parse_date(header_raw)
        payment_type = 'платной' if 'платн' in header_raw.lower() else 'бесплатной'

        # Parse Specialty & Qualification
        spec_clean = spec_raw.replace('Специальность:', '').strip()
        spec_code_m = re.search(r'([0-9]-[0-9]{2}-[0-9]{4}-[0-9]{2})', spec_clean)
        spec_code = spec_code_m.group(1) if spec_code_m else None
        spec_name_m = re.search(r'[«"]([^»"]+)[»"]', spec_clean)
        spec_name = spec_name_m.group(1).strip() if spec_name_m else spec_clean

        qual_clean = qual_raw.replace('Квалификация:', '').strip()
        qual_name_m = re.search(r'[«"]([^»"]+)[»"]', qual_clean)
        qual_name = qual_name_m.group(1).strip() if qual_name_m else qual_clean.rstrip('.')

        duration_years = 4
        duration_months = 0
        if '0322-02' in (spec_code or '') or 'Документ' in spec_name:
            duration_years = 3
            duration_months = 10
        elif '4-03-0713-06' in (spec_code or ''):
            duration_years = 3
            duration_months = 0

        # Parse Curator
        curator_clean = curator_raw.replace('Куратор:', '').strip().rstrip('.')
        cur_parts = curator_clean.split()
        curator_last_name = cur_parts[0] if len(cur_parts) > 0 else ''
        curator_name = cur_parts[1] if len(cur_parts) > 1 else ''
        curator_father_name = ' '.join(cur_parts[2:]) if len(cur_parts) > 2 else ''

        # Parse Students
        student_lines_start = ord_idx + 4
        student_lines_end = order_indices[i + 1] - 1 if i + 1 < len(order_indices) else len(paragraphs)
        raw_lines = paragraphs[student_lines_start:student_lines_end]

        combined_student_lines = []
        for line in raw_lines:
            line_s = line.strip()
            if not line_s:
                continue
            cleaned = re.sub(r'^\d+[\.\)]\s*', '', line_s).strip()
            first_word = cleaned.split()[0] if cleaned.split() else ''
            is_capitalized = first_word and first_word[0].isupper() and ('А' <= first_word[0] <= 'Я' or first_word[0] == 'Ё')

            if not is_capitalized and combined_student_lines:
                combined_student_lines[-1] += f" {line_s}"
            else:
                combined_student_lines.append(line_s)

        group_students = []
        for s_line in combined_student_lines:
            s_clean = re.sub(r'^\d+[\.\)]\s*', '', s_line).strip()

            is_expelled = bool(re.search(r'отчислен', s_clean, re.I))
            expell_date = None
            if is_expelled:
                exp_m = re.search(r'отчислен[а-я]*\s+(?:с\s+|от\s+)?(\d{2}\.\d{2}\.\d{4})', s_clean, re.I)
                if exp_m:
                    expell_date = parse_date(exp_m.group(1))
                else:
                    exp_ord_m = re.search(r'приказ\s+(?:от\s+)?(\d{2}\.\d{2}\.\d{4})', s_clean, re.I)
                    if exp_ord_m:
                        expell_date = parse_date(exp_ord_m.group(1))

            student_order = order_raw.strip()
            student_enroll_date = group_enroll_date
            custom_ord_m = re.search(r'(?:зачисл[а-я]*|пр-з|приказ)\s*(?:на\s+вакантное\s+место)?\s*(?:с\s+(\d{2}\.\d{2}\.\d{4}))?\s*(?:№\s*|пр-з\s*№\s*|приказ\s*№\s*)?([0-9]+/[0-9]+-[0-9]+)\s*(?:от\s+(\d{2}\.\d{2}\.\d{4}))?', s_clean, re.I)
            if custom_ord_m:
                num = custom_ord_m.group(2)
                d = custom_ord_m.group(3) or custom_ord_m.group(1)
                if num and d:
                    student_order = f"Приказ о зачислении № {num} от {d}"
                    student_enroll_date = parse_date(d)
                elif num:
                    student_order = f"Приказ о зачислении № {num}"

            is_target = bool(re.search(r'(\(Ц\)|[\s\(\.]Ц[\s\)\.\;]|\bЦ\b)', s_clean))

            fio_clean = re.split(r'(\(|\—|\–|\-|\botчислен|\bпереведен|\bзачислен|\bакадемическ|\bв связи|\b№)', s_clean, maxsplit=1)[0].strip()
            fio_clean = re.sub(r'[\.\,\;\:\(\)\*Цц]+$', '', fio_clean).strip()

            fio_parts = fio_clean.split()
            if len(fio_parts) >= 3:
                s_last = fio_parts[0]
                s_first = fio_parts[1]
                s_father = ' '.join(fio_parts[2:])
            elif len(fio_parts) == 2:
                s_last = fio_parts[0]
                s_first = fio_parts[1]
                s_father = ''
            elif len(fio_parts) == 1:
                s_last = fio_parts[0]
                s_first = ''
                s_father = ''
            else:
                continue

            group_students.append({
                'last_name': s_last,
                'name': s_first,
                'father_name': s_father,
                'order_number': student_order,
                'enroll_date': student_enroll_date,
                'expell_date': expell_date,
                'is_expelled': is_expelled,
                'is_target': is_target,
                'raw_line': s_line
            })

        parsed_groups.append({
            'group_number': clean_group_number,
            'raw_group_number': raw_group_num,
            'header_raw': header_raw,
            'enroll_date': group_enroll_date,
            'payment_type': payment_type,
            'specialty_code': spec_code,
            'specialty_name': spec_name,
            'qualification': qual_name,
            'duration_years': duration_years,
            'duration_months': duration_months,
            'curator_last_name': curator_last_name,
            'curator_name': curator_name,
            'curator_father_name': curator_father_name,
            'order_number': order_raw.strip(),
            'students': group_students
        })

    return parsed_groups

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Ошибка: Не указан путь к файлу .docx", file=sys.stderr)
        print("Использование: python parseDocx.py <путь_к_файлу.docx>", file=sys.stderr)
        sys.exit(1)

    target_path = os.path.abspath(sys.argv[1])
    if not os.path.exists(target_path):
        print(f"Ошибка: Файл не найден: {target_path}", file=sys.stderr)
        sys.exit(1)

    data = extract_docx_groups(target_path)
    print(json.dumps(data, ensure_ascii=False, indent=2))
