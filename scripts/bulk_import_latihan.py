import asyncio
import os
import sys
import uuid
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import selectinload

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.session import async_session_maker
from backend.models.models import Package, Question, QuestionOption

async def import_latihan(pkg_title, csv_path):
    async with async_session_maker() as db:
        # 1. Create Package
        package = Package(
            id=uuid.uuid4(),
            title=pkg_title,
            description=f"Paket {pkg_title} SKD CPNS",
            category="Mix",
            is_published=True,
            is_premium=False,
            price=0
        )
        db.add(package)
        await db.commit()
        await db.refresh(package)
        
        print(f"Created Package: {package.title} (ID: {package.id})")
        
        # 2. Read CSV
        df = pd.read_csv(csv_path)
        df.fillna('', inplace=True)
        df.columns = [str(col).lower().strip() for col in df.columns]
        
        # 3. Import Questions
        questions_to_insert = []
        for index, row in df.iterrows():
            try:
                # Map headers (matching admin_import.py logic)
                number = int(row['number'])
                segment = str(row['segment']).upper()
                content = str(row['content']).strip()
                image_url = str(row['image_url']).strip() if 'image_url' in df.columns and str(row['image_url']).strip() else None
                discussion = str(row['discussion']).strip() if 'discussion' in df.columns and str(row['discussion']).strip() else None
                sub_category = str(row['sub_category']).strip() if 'sub_category' in df.columns and str(row['sub_category']).strip() else None
                
                new_question = Question(
                    id=uuid.uuid4(),
                    package_id=package.id,
                    number=number,
                    segment=segment,
                    content=content,
                    image_url=image_url,
                    discussion=discussion,
                    sub_category=sub_category
                )
                
                options = []
                for label in ['a', 'b', 'c', 'd', 'e']:
                    opt_content = str(row[f'option_{label}']).strip()
                    raw_score = row[f'score_{label}']
                    try:
                        score = int(float(raw_score)) if str(raw_score).strip() != '' else 0
                    except:
                        score = 0
                        
                    opt_image = str(row[f'option_image_{label}']).strip() if f'option_image_{label}' in df.columns and str(row[f'option_image_{label}']).strip() else None
                    
                    options.append(QuestionOption(
                        id=uuid.uuid4(),
                        label=label.upper(),
                        content=opt_content,
                        score=score,
                        image_url=opt_image
                    ))
                
                new_question.options = options
                questions_to_insert.append(new_question)
            except Exception as e:
                print(f"  Error at row {index + 2}: {e}")
                continue
        
        db.add_all(questions_to_insert)
        await db.commit()
        print(f"  Imported {len(questions_to_insert)} questions.")

async def main():
    base_path = "d:/ProjectAI/Test-CPNS/data/csv/"
    targets = [
        ("Latihan 4", base_path + "Latihan4_final.csv"),
        ("Latihan 5", base_path + "Latihan5_final.csv"),
        ("Latihan 6", base_path + "Latihan6_final.csv"),
    ]
    
    for title, path in targets:
        if os.path.exists(path):
            await import_latihan(title, path)
        else:
            print(f"File not found: {path}")

if __name__ == "__main__":
    asyncio.run(main())
