import pandas as pd
import re

file_path = r'd:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv'
df = pd.read_csv(file_path)

def clean_text(text):
    if not isinstance(text, str):
        return text
    
    # Fix stray spaces around $ and variables
    text = text.replace('PIDAN $ A =...$ :...', 'PIDANA = ... : ...')
    text = text.replace('BICAR $ A =...$ :...', 'BICARA = ... : ...')
    text = text.replace('3^4- 4 ^3', '3^4 - 4^3')
    text = text.replace('5^2 $- 2 $ ^5', '5^2 - 2^5')
    text = text.replace('($ 7 / 10) = 5 / 10 $ = 0.5', '$\\frac{7}{10} = \\frac{5}{10} = 0.5$')
    text = text.replace('0.625 adalah $ 5 / 8 $', '0.625 adalah $\\frac{5}{8}$')
    text = text.replace('(5/8)/(7/8) = 5/7', '$\\frac{5/8}{7/8} = \\frac{5}{7}$')
    text = text.replace('(0. $ 625/0 $.875) x kuadrat akar 0.49', '$(0.625 / 0.875) \\times $ akar kuadrat dari $0.49$')
    text = text.replace('A kar dari', 'Akar dari')
    
    # Fix relationships
    text = text.replace('$ X =$ ', '$X = $')
    text = text.replace('$ Y =$ ', '$Y = $')
    text = text.replace('$ X > Y $', '$X > Y$')
    text = text.replace('$ X < Y $', '$X < Y$')
    text = text.replace('$ X = Y $', '$X = Y$')
    text = text.replace('$ X + Y = 0 $', '$X + Y = 0$')
    
    # Fix Percentages and fractions
    text = text.replace('$ 33,33%$ x 0, 15 + 16, $ 67 %$ x 0,12', '$33,33\\% \\times 0,15 + 16,67\\% \\times 0,12$')
    text = text.replace('$ 33,33%$', '33,33%')
    text = text.replace('$ 16,67 %$', '16,67%')
    text = text.replace('1/3 x 0.15', '1/3 \\times 0.15')
    text = text.replace('$ 1 / 6 $ x 0.12', '1/6 \\times 0.12')
    text = text.replace('28. $ 5%$', '28,5%')
    text = text.replace('30. $ 0%$', '30,0%')
    text = text.replace('33. $ 3%$', '33,33%')
    text = text.replace('35. $ 5%$', '35,5%')
    text = text.replace('40. $ 0%$', '40,0%')
    
    text = text.replace('$ 1 / 2, 5 / 6, 7 / 6, 3 / 2, 11 / 6 $', '$\\frac{1}{2}, \\frac{5}{6}, \\frac{7}{6}, \\frac{3}{2}, \\frac{11}{6}$')
    text = text.replace('$ 13 / 6 $', '$\\frac{13}{6}$')
    text = text.replace('$ 7 / 3 $', '$\\frac{7}{3}$')
    text = text.replace('$ 5 / 2 $', '$\\frac{5}{2}$')
    text = text.replace('$ 17 / 6 $', '$\\frac{17}{6}$')
    text = text.replace('$ 3 / 6, 5 / 6, 7 / 6, 9 / 6 $', '$\\frac{3}{6}, \\frac{5}{6}, \\frac{7}{6}, \\frac{9}{6}$')
    text = text.replace('$ 3/2), 11/6 $', '$\\frac{3}{2}), \\frac{11}{6}$')
    text = text.replace('$ A > B $', '$A > B$')
    text = text.replace('$ B > A $', '$B > A$')
    text = text.replace('$ A = B $', '$A = B$')
    text = text.replace('$ A = B + 15 $', '$A = B + 15$')
    text = text.replace('$ 20%$', '20%')
    text = text.replace('$ 10%$', '10%')
    text = text.replace('$ 10 %$', '10%')
    
    text = text.replace('bersam $ a - sama $', 'bersama-sama')
    text = text.replace('$ 1 / 12 $', '1/12')
    text = text.replace('$ 1 / 12 + 1 / 15 + 1 / 20 = 12 / 60 = 1 / 5 $', '$\\frac{1}{12} + \\frac{1}{15} + \\frac{1}{20} = \\frac{12}{60} = \\frac{1}{5}$')
    text = text.replace('Candr a', 'Candra')
    text = text.replace('3/5 ba gian', '3/5 bagian')
    text = text.replace('2/5 ba gian', '2/5 bagian')
    text = text.replace('Candr $ a = (2 / 5)/(1 / 20 $)', 'Candra = $\\frac{2/5}{1/20}$')
    text = text.replace('$ Y - Kecepatan $ X', 'Kecepatan Y - Kecepatan X')
    
    text = text.replace('7 ($ A - 5).$', '7(A - 5).')
    text = text.replace('4 $ A - 5 = 7 A - 35.3 A = 30 - >$ A (A nak) = 10', '4A - 5 = 7A - 35. 3A = 30 -> A (Anak) = 10')
    
    # Random fixes
    text = text.replace('A tlet', 'Atlet')
    text = text.replace('B iru', 'Biru')
    text = text.replace('Ca ndr a', 'Candra')
    text = text.replace('bersam a', 'bersama')
    
    # Fix the $ X = Diskon 20 % = 80.Y = Diskon 10 %$ 
    text = text.replace('$ X = Diskon 20 % = 80.Y = Diskon 10 %$', '$X = \\text{Diskon } 20\\% = 80$. $Y = \\text{Diskon } 10\\%$')
    
    return text

for col in ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'discussion']:
    df[col] = df[col].apply(clean_text)

df.to_csv(file_path, index=False, quoting=1) # Quote all
print("Latihan 3 cleaned successfully.")
