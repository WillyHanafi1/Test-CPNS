import pandas as pd
import re

file_path = r'd:\ProjectAI\Test-CPNS\data\csv\Latihan4 - 70.csv'
df = pd.read_csv(file_path)

def clean_text(text):
    if not isinstance(text, str):
        return text
        
    # Text fixes
    text = text.replace('SUTRADARA : FILM : DITONTON =...$ :... :...', 'SUTRADARA : FILM : DITONTON = ... : ... : ...')
    text = text.replace('kemeja $ putih.', 'kemeja putih.')
    text = text.replace('membawa $ laptop.', 'membawa laptop.')
    text = text.replace('Tidak $ malas', 'Tidak malas')
    text = text.replace('Ek $ a > Dir a > Caca.$ B im $ a > Fara $ dan Cac $ a > B $ ima.', '$Eka > Dira > Caca$. $Bima > Fara$ dan $Caca > Bima$.')
    text = text.replace('Ek $ a > Dir a > Caca > B $ im $ a > Fara.$', '$Eka > Dira > Caca > Bima > Fara$.')
    text = text.replace('Kimia = 3).$ 4)', 'Kimia = 3). 4)')
    text = text.replace('$ 3 / 8 $ x $ 40 %$', '$\\frac{3}{8} \\times 40\\%$')
    text = text.replace('$ 3 / 8 $ x $ 40 % = 3/8 $ x $ 40 / 100 = 120 / 800 = 15 / 100 $ = 0,15', '$\\frac{3}{8} \\times 40\\% = \\frac{3}{8} \\times \\frac{40}{100} = \\frac{120}{800} = \\frac{15}{100} = 0,15$')
    text = text.replace('0, 15 + 0, 15', '0,15 + 0,15')
    text = text.replace('$ 25^2 - 15^2 $', '$25^2 - 15^2$')
    
    # Algebra
    text = text.replace('$ x = 4 $', '$x = 4$')
    text = text.replace('$ y = -$ 2', '$y = -2$')
    text = text.replace('b erapakah', 'berapakah')
    text = text.replace('x^2 + 2x $ y + y^2 $', '$x^2 + 2xy + y^2$')
    text = text.replace('($ x + y)^2.$', '$(x + y)^2$.')
    text = text.replace('(2)^ 2 = 4', '$(2)^2 = 4$')
    text = text.replace('- >', '->')
    
    # fractions
    text = text.replace('$ X =$ 3 / 4 $ dari 80', '$X = \\frac{3}{4} \\times 80$')
    text = text.replace('$ Y = $ 2 / 3 $ dari 90', '$Y = \\frac{2}{3} \\times 90$')
    text = text.replace('$ X = (3 / 4 $) x 80 = 60', '$X = \\frac{3}{4} \\times 80 = 60$')
    text = text.replace('$ Y = (2 / 3 $) x 90 = 60', '$Y = \\frac{2}{3} \\times 90 = 60$')
    text = text.replace('Karen a 60 = 60', 'Karena 60 = 60')
    text = text.replace('Rp150.000 / 3', 'Rp150.000 / 3')
    text = text.replace('$ X = luas $ persegi', '$X = \\text{luas}$ persegi')
    text = text.replace('$ Y = luas $ persegi', '$Y = \\text{luas}$ persegi')
    text = text.replace('c m2', 'cm²')
    
    # comparisons
    text = text.replace('$ X > Y $', '$X > Y$')
    text = text.replace('$ X < Y $', '$X < Y$')
    text = text.replace('$ X = Y $', '$X = Y$')
    text = text.replace('$ X + Y = 70 $', '$X + Y = 70$')
    text = text.replace('$ X + Y = 100 $.000', '$X + Y = 100.000$')
    text = text.replace('$ X - Y = 1 $', '$X - Y = 1$')
    text = text.replace('$ X = Y + 10 $', '$X = Y + 10$')
    
    # 52 Kecepatan
    text = text.replace('bersam $ a - sama $', 'bersama-sama')
    text = text.replace('bersam $ a - sam a', 'bersama-sama')
    text = text.replace('bersam a (X)', 'bersama (X)')
    text = text.replace('$ Y = 5 $ hari', '$Y = 5$ hari')
    text = text.replace('Kecepatan $ A =$ 1 / 6 $ per hari,$', 'Kecepatan $A = \\frac{1}{6}$ per hari, ')
    text = text.replace('B = $ 1/12 $ per hari.', '$B = \\frac{1}{12}$ per hari.')
    text = text.replace('= 1 / 6 + $ 1 / 12 = 2 / 12 + 1 / 12 = 3 / 12 = 1 / 4 $ ba gian', '$= \\frac{1}{6} + \\frac{1}{12} = \\frac{2}{12} + \\frac{1}{12} = \\frac{3}{12} = \\frac{1}{4}$ bagian')
    text = text.replace('Karen a $ Y = 5 $, maka', 'Karena $Y = 5$, maka')
    
    # 53 Papasan
    text = text.replace('Waktu papasa $ n = Jarak $ Total', 'Waktu papasan = $\\text{Jarak Total}$')
    text = text.replace('$ 200 / 100 $ = 2 jam', '$200 / 100 = 2$ jam')
    text = text.replace('08. 00', '08.00')
    
    # 54, 55, 56
    text = text.replace('$ 20%$', '20%')
    text = text.replace('550. 000', '550.000')
    text = text.replace('Rat $ a - rata $', 'Rata-rata')
    text = text.replace('rata-rata $ nilai', 'rata-rata nilai')
    text = text.replace('$ A = 3B. A - B = 10.$', '$A = 3B$. $A - B = 10$.')
    text = text.replace('3 $ B - B = 10 - > 2 B = 10 - > B = 5 $ tahun', '$3B - B = 10 \\rightarrow 2B = 10 \\rightarrow B = 5$ tahun')
    
    return text

for col in ['content', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'discussion']:
    df[col] = df[col].apply(clean_text)

df.to_csv(file_path, index=False, quoting=1)
print("Latihan 4 cleaned successfully.")
