from pathlib import Path

p = Path("scripts/reset_seed_single_school.py")
lines = p.read_text(encoding="utf-8").splitlines(keepends=True)
out = []
i = 0
while i < len(lines):
    line = lines[i]
    if 'class_ids["RHS-MATH-P1"]' in line:
        out.append(line.replace('RHS-MATH-P1', 'RHS-C08'))
        i += 1
        continue
    if line.strip() == '"RHS-MATH-P1",':
        out.append(line.replace('RHS-MATH-P1', 'RHS-C08'))
        i += 1
        if i < len(lines) and 'Algebra I' in lines[i]:
            out.append(lines[i].replace('Algebra I — Period 1', 'Class 8 · Algebra I'))
            i += 1
        continue
    if '-> RHS-MATH-P1 / Algebra I' in line:
        out.append(line.replace('RHS-MATH-P1 / Algebra I', 'RHS-C08 / Class 8 Algebra'))
        i += 1
        continue
    if line.startswith('    grades = ['):
        # skip until closing ]
        while i < len(lines) and lines[i].strip() != ']':
            i += 1
        i += 1  # skip ]
        out.append(
            "    grades = [\n"
            '        ("stu-alice", "Alice Nguyen", "Class 8 · Algebra I", 3, 3, True),\n'
            '        ("stu-bob", "Bob Okonkwo", "Class 8 · Algebra I", 2, 3, True),\n'
            '        ("stu-carol", "Carol Patel", "Class 8 · Algebra I", 1, 3, True),\n'
            '        ("stu-c08-4", "Class 8 Student 4", "Class 8 · Algebra I", 3, 3, True),\n'
            '        ("stu-c08-5", "Class 8 Student 5", "Class 8 · Algebra I", 2, 3, True),\n'
            '        ("stu-c05-1", "Class 5 Student 1", "Class 5 · General Studies", 2, 2, True),\n'
            '        ("stu-c05-2", "Class 5 Student 2", "Class 5 · General Studies", 1, 2, True),\n'
            '        ("stu-c10-1", "Class 10 Student 1", "Class 10 · Advanced Maths", 2, 3, True),\n'
            "    ]\n"
        )
        continue
    out.append(line)
    i += 1
text = "".join(out)
if "RHS-MATH-P1" in text:
    raise SystemExit("still has RHS-MATH-P1")
p.write_text(text, encoding="utf-8")
print("patched")
