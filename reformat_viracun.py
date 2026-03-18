import csv
import re

def parse_viracun(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pre-fix: Split known merged question markers
    # 1. akademikKongres -> akademik\nKongres
    content = content.replace("akademikKongres", "akademik\nKongres")
    
    lines = content.splitlines()

    questions = []
    current_q = {"content": "", "options": {}, "start_line": 0}
    last_option = None
    
    for i, line in enumerate(lines):
        line_num = i + 1
        stripped = line.strip()
        if not stripped: continue
        
        # Check for options A. B. C. D. E. (standard format)
        option_match = re.match(r'^([A-E])\.$', stripped)
        if option_match:
            last_option = option_match.group(1).lower()
            current_q["options"][last_option] = ""
            continue
            
        if last_option:
            # If we see a non-option line but we already have at least 'a' filled, 
            # and this line doesn't look like further content for 'e',
            # then it's a NEW question.
            # But wait, options can be multi-line.
            if 'e' in current_q["options"] and len(current_q["options"]['e']) > 0 and not re.match(r'^[A-E]\.$', stripped):
                # New question starts
                questions.append(current_q)
                current_q = {"content": stripped, "options": {}, "start_line": line_num}
                last_option = None
            else:
                current_q["options"][last_option] += stripped + " "
        else:
            if not current_q["content"]:
                current_q["start_line"] = line_num
                current_q["content"] = stripped
            else:
                current_q["content"] += "\n" + stripped
                
    if current_q["content"]:
        questions.append(current_q)
    return questions

raw_questions = parse_viracun('d:/ProjectAI/Test-CPNS/viracun1.csv')

# Categorization based on identified line numbers:
# TWK: 1-821 (Wait, if we inserted a newline, line 821 might shift to 822)
# Since we only inserted 1 newline, it's minor.
# Let's adjust boundaries if needed after peek.

twk_list = []
tiu_list = []
tkp_list = []

for q in raw_questions:
    start = q['start_line']
    if start <= 822: # Adjusted for 1 extra newline
        twk_list.append(q)
    elif start <= 1613:
        tiu_list.append(q)
    else:
        tkp_list.append(q)

print(f"Parsed {len(twk_list)} TWK, {len(tiu_list)} TIU, {len(tkp_list)} TKP.")

# Slotting
final_template = [None] * 110

# TWK 1-30
for i in range(min(30, len(twk_list))):
    final_template[i] = twk_list[i]

# TIU 31-65 (35 questions)
for i in range(min(35, len(tiu_list))):
    final_template[30+i] = tiu_list[i]

# TKP 66-110 (45 questions)
for i in range(min(45, len(tkp_list))):
    final_template[65+i] = tkp_list[i]

output_file = 'd:/ProjectAI/Test-CPNS/viracun1_formatted.csv'
header = [
    'number', 'segment', 'content', 'image_url', 
    'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 
    'score_a', 'score_b', 'score_c', 'score_d', 'score_e', 
    'discussion', 'option_image_a', 'option_image_b', 'option_image_c', 'option_image_d', 'option_image_e'
]

with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=header, extrasaction='ignore')
    writer.writeheader()
    
    for i in range(110):
        q_num = i + 1
        segment = "TWK" if q_num <= 30 else ("TIU" if q_num <= 65 else "TKP")
        q_data = final_template[i]
        
        if q_data:
            if segment == "TKP":
                score_a, score_b, score_c, score_d, score_e = "1", "2", "3", "4", "5"
            else:
                ans = q_data.get('answer', 'a')
                score_a = "5" if ans == 'a' else "0"
                score_b = "5" if ans == 'b' else "0"
                score_c = "5" if ans == 'c' else "0"
                score_d = "5" if ans == 'd' else "0"
                score_e = "5" if ans == 'e' else "0"
        else:
            score_a = score_b = score_c = score_d = score_e = ""

        row = {
            'number': q_num,
            'segment': segment,
            'content': (q_data['content'] if q_data else "").strip(),
            'image_url': "",
            'option_a': q_data['options'].get('a', "").strip() if q_data else "",
            'option_b': q_data['options'].get('b', "").strip() if q_data else "",
            'option_c': q_data['options'].get('c', "").strip() if q_data else "",
            'option_d': q_data['options'].get('d', "").strip() if q_data else "",
            'option_e': q_data['options'].get('e', "").strip() if q_data else "",
            'score_a': score_a,
            'score_b': score_b,
            'score_c': score_c,
            'score_d': score_d,
            'score_e': score_e,
            'discussion': q_data.get('discussion', "").strip() if q_data else "",
            'option_image_a': "",
            'option_image_b': "",
            'option_image_c': "",
            'option_image_d': "",
            'option_image_e': ""
        }
        writer.writerow(row)


print("Re-formatting complete.")
